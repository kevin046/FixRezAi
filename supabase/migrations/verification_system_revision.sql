-- Supabase Verification System Revision Migration
-- This migration implements comprehensive verification tracking with strict validation

-- =====================================================
-- PHASE 1: Enhanced Database Schema
-- =====================================================

-- 1.1 Enhanced profiles table with strict verification fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_method TEXT 
    CHECK (verification_method IN ('email', 'phone', 'admin', 'oauth')),
ADD COLUMN IF NOT EXISTS verification_token_id UUID,
ADD COLUMN IF NOT EXISTS verification_metadata JSONB DEFAULT '{}';

-- 1.2 Enhanced verification_tokens table
ALTER TABLE verification_tokens 
ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 1.3 Add foreign key constraint for verification token
ALTER TABLE profiles 
ADD CONSTRAINT fk_verification_token 
FOREIGN KEY (verification_token_id) REFERENCES verification_tokens(id) 
ON DELETE SET NULL;

-- 1.4 Create composite indexes for verification queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status 
ON profiles(verified, verification_timestamp, verification_method);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_active 
ON verification_tokens(user_id, type, used, expires_at) 
WHERE used = FALSE AND expires_at > NOW();

-- 1.5 Add expiration constraint
ALTER TABLE verification_tokens 
ADD CONSTRAINT chk_token_expiration 
CHECK (expires_at > created_at);

-- =====================================================
-- PHASE 2: Comprehensive Audit Log Table
-- =====================================================

-- 2.1 Create detailed verification audit log table
CREATE TABLE IF NOT EXISTS verification_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL 
        CHECK (action IN ('created', 'attempted', 'verified', 'expired', 'failed', 'revoked')),
    verification_token_id UUID REFERENCES verification_tokens(id) ON DELETE SET NULL,
    verification_method TEXT 
        CHECK (verification_method IN ('email', 'phone', 'admin', 'oauth')),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2.2 Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_verification_audit_user 
ON verification_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_audit_token 
ON verification_audit_log(verification_token_id);

CREATE INDEX IF NOT EXISTS idx_verification_audit_action 
ON verification_audit_log(action, created_at DESC);

-- =====================================================
-- PHASE 3: Error Handling Infrastructure
-- =====================================================

-- 3.1 Create error types and messages
CREATE TYPE IF NOT EXISTS verification_error_type AS ENUM (
    'missing_fields',
    'invalid_token',
    'expired_token',
    'max_attempts_exceeded',
    'already_verified',
    'database_error',
    'system_error'
);

-- 3.2 Create error messages table
CREATE TABLE IF NOT EXISTS verification_error_messages (
    error_type verification_error_type PRIMARY KEY,
    user_message TEXT NOT NULL,
    technical_message TEXT,
    retry_allowed BOOLEAN DEFAULT TRUE,
    retry_delay_minutes INTEGER DEFAULT 0
);

-- 3.3 Insert standard error messages
INSERT INTO verification_error_messages (error_type, user_message, technical_message, retry_allowed, retry_delay_minutes) VALUES
('missing_fields', 'Required information is missing. Please try again.', 'Missing required fields in verification request', TRUE, 0),
('invalid_token', 'Invalid verification code. Please check and try again.', 'Token validation failed', TRUE, 0),
('expired_token', 'Verification code has expired. A new code has been sent.', 'Token expired', TRUE, 0),
('max_attempts_exceeded', 'Too many failed attempts. Please try again later.', 'Maximum verification attempts exceeded', FALSE, 60),
('already_verified', 'Your account is already verified.', 'User already verified', FALSE, 0),
('database_error', 'System error. Please contact support.', 'Database operation failed', FALSE, 0),
('system_error', 'System error. Please contact support.', 'System error occurred', FALSE, 0)
ON CONFLICT (error_type) DO NOTHING;

-- =====================================================
-- PHASE 4: Core Verification Functions
-- =====================================================

-- 4.1 Enhanced token creation function
CREATE OR REPLACE FUNCTION create_verification_token(
    p_user_id UUID,
    p_type TEXT,
    p_method TEXT,
    p_expires_in_minutes INTEGER DEFAULT 60
)
RETURNS UUID AS $$
DECLARE
    token_uuid UUID;
    token_hash TEXT;
    plain_token TEXT;
BEGIN
    -- Validate inputs
    IF p_type NOT IN ('email', 'phone', 'password_reset') THEN
        RAISE EXCEPTION 'Invalid verification type: %', p_type;
    END IF;
    
    IF p_method NOT IN ('email', 'phone', 'admin') THEN
        RAISE EXCEPTION 'Invalid verification method: %', p_method;
    END IF;
    
    -- Generate secure token
    token_uuid := gen_random_uuid();
    plain_token := encode(gen_random_bytes(32), 'hex');
    token_hash := crypt(plain_token, gen_salt('bf'));
    
    -- Insert token with validation
    INSERT INTO verification_tokens (
        id, user_id, type, token_hash, expires_at, 
        created_at, method, max_attempts
    )
    VALUES (
        token_uuid, p_user_id, p_type, token_hash, 
        NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        NOW(), p_method, 3
    );
    
    -- Log token creation
    INSERT INTO verification_audit_log (
        user_id, action, verification_token_id, 
        verification_method, metadata
    )
    VALUES (
        p_user_id, 'created', token_uuid, p_method,
        jsonb_build_object('type', p_type, 'expires_in_minutes', p_expires_in_minutes)
    );
    
    RETURN token_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Enhanced verification function with strict validation
CREATE OR REPLACE FUNCTION verify_user_token(
    p_user_id UUID,
    p_plain_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    v_token_record RECORD;
    v_attempts_remaining INTEGER;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_plain_token IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Missing required parameters';
        RETURN;
    END IF;
    
    -- Check if user is already verified
    IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND verified = TRUE) THEN
        RETURN QUERY SELECT FALSE, 'User already verified';
        RETURN;
    END IF;
    
    -- Get token record
    SELECT * INTO v_token_record
    FROM verification_tokens
    WHERE user_id = p_user_id 
    AND used = FALSE 
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if token exists
    IF v_token_record IS NULL THEN
        -- Log failed attempt
        INSERT INTO verification_audit_log (
            user_id, action, ip_address, user_agent, 
            error_message
        )
        VALUES (
            p_user_id, 'failed', p_ip_address, p_user_agent,
            'No valid token found'
        );
        
        RETURN QUERY SELECT FALSE, 'No valid verification token found';
        RETURN;
    END IF;
    
    -- Check if token is expired
    IF v_token_record.expires_at <= NOW() THEN
        INSERT INTO verification_audit_log (
            user_id, action, verification_token_id, 
            ip_address, user_agent, error_message
        )
        VALUES (
            p_user_id, 'expired', v_token_record.id,
            p_ip_address, p_user_agent, 'Token expired'
        );
        
        RETURN QUERY SELECT FALSE, 'Verification token has expired';
        RETURN;
    END IF;
    
    -- Check attempts remaining
    IF v_token_record.attempts >= v_token_record.max_attempts THEN
        INSERT INTO verification_audit_log (
            user_id, action, verification_token_id, 
            ip_address, user_agent, error_message
        )
        VALUES (
            p_user_id, 'failed', v_token_record.id,
            p_ip_address, p_user_agent, 'Maximum attempts exceeded'
        );
        
        RETURN QUERY SELECT FALSE, 'Maximum verification attempts exceeded';
        RETURN;
    END IF;
    
    -- Verify token
    IF crypt(p_plain_token, v_token_record.token_hash) = v_token_record.token_hash THEN
        -- Token is valid, mark as used
        UPDATE verification_tokens
        SET used = TRUE, used_at = NOW()
        WHERE id = v_token_record.id;
        
        -- Update profile verification status
        UPDATE profiles
        SET 
            verified = TRUE,
            verification_timestamp = NOW(),
            verification_method = v_token_record.method,
            verification_token_id = v_token_record.id
        WHERE id = p_user_id;
        
        -- Log successful verification
        INSERT INTO verification_audit_log (
            user_id, action, verification_token_id, 
            verification_method, ip_address, user_agent
        )
        VALUES (
            p_user_id, 'verified', v_token_record.id,
            v_token_record.method, p_ip_address, p_user_agent
        );
        
        RETURN QUERY SELECT TRUE, 'Verification successful';
        RETURN;
    ELSE
        -- Invalid token, increment attempts
        UPDATE verification_tokens
        SET attempts = attempts + 1
        WHERE id = v_token_record.id;
        
        v_attempts_remaining := v_token_record.max_attempts - v_token_record.attempts - 1;
        
        -- Log failed attempt
        INSERT INTO verification_audit_log (
            user_id, action, verification_token_id, 
            ip_address, user_agent, error_message, metadata
        )
        VALUES (
            p_user_id, 'attempted', v_token_record.id,
            p_ip_address, p_user_agent, 'Invalid token',
            jsonb_build_object('attempts_remaining', v_attempts_remaining)
        );
        
        RETURN QUERY SELECT FALSE, format('Invalid token. %s attempts remaining', v_attempts_remaining);
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Verification validation trigger function
CREATE OR REPLACE FUNCTION validate_verification_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow verified = true if all required fields are present
    IF NEW.verified = TRUE THEN
        IF NEW.verification_timestamp IS NULL THEN
            RAISE EXCEPTION 'verification_timestamp is required when verified = true';
        END IF;
        
        IF NEW.verification_method IS NULL THEN
            RAISE EXCEPTION 'verification_method is required when verified = true';
        END IF;
        
        IF NEW.verification_token_id IS NULL THEN
            RAISE EXCEPTION 'verification_token_id is required when verified = true';
        END IF;
        
        -- Verify the token exists and is valid
        IF NOT EXISTS (
            SELECT 1 FROM verification_tokens 
            WHERE id = NEW.verification_token_id 
            AND user_id = NEW.id 
            AND used = TRUE
        ) THEN
            RAISE EXCEPTION 'Invalid or unused verification token';
        END IF;
    END IF;
    
    -- Prevent setting verification fields when verified = false
    IF NEW.verified = FALSE THEN
        IF NEW.verification_timestamp IS NOT NULL OR 
           NEW.verification_method IS NOT NULL OR 
           NEW.verification_token_id IS NOT NULL THEN
            RAISE EXCEPTION 'Verification fields must be null when verified = false';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Create validation trigger
CREATE TRIGGER trg_validate_verification
    BEFORE UPDATE OF verified, verification_timestamp, verification_method, verification_token_id
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_verification_completion();

-- =====================================================
-- PHASE 5: Error Handling Functions
-- =====================================================

-- 5.1 Error logging function
CREATE OR REPLACE FUNCTION log_verification_error(
    p_user_id UUID,
    p_error_type verification_error_type,
    p_context JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    error_id UUID;
    error_msg RECORD;
BEGIN
    -- Get error message details
    SELECT * INTO error_msg
    FROM verification_error_messages
    WHERE error_type = p_error_type;
    
    -- Generate error ID
    error_id := gen_random_uuid();
    
    -- Log the error
    INSERT INTO verification_audit_log (
        id, user_id, action, ip_address, user_agent, 
        error_message, metadata
    )
    VALUES (
        error_id, p_user_id, 'failed', p_ip_address, p_user_agent,
        error_msg.technical_message,
        jsonb_build_object(
            'error_type', p_error_type,
            'user_message', error_msg.user_message,
            'retry_allowed', error_msg.retry_allowed,
            'retry_delay_minutes', error_msg.retry_delay_minutes,
            'context', p_context
        )
    );
    
    RETURN error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Function to get user-friendly error messages
CREATE OR REPLACE FUNCTION get_verification_error_message(
    p_error_type verification_error_type
)
RETURNS TABLE(user_message TEXT, retry_allowed BOOLEAN, retry_delay_minutes INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT vem.user_message, vem.retry_allowed, vem.retry_delay_minutes
    FROM verification_error_messages vem
    WHERE vem.error_type = p_error_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PHASE 6: Audit and Reporting Functions
-- =====================================================

-- 6.1 Audit trail function
CREATE OR REPLACE FUNCTION get_verification_audit_trail(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    audit_id UUID,
    action TEXT,
    action_timestamp TIMESTAMPTZ,
    verification_method TEXT,
    ip_address INET,
    error_message TEXT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        val.id,
        val.action,
        val.created_at,
        val.verification_method,
        val.ip_address,
        val.error_message,
        val.metadata
    FROM verification_audit_log val
    WHERE val.user_id = p_user_id
    ORDER BY val.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.2 Verification statistics function
CREATE OR REPLACE FUNCTION get_verification_statistics(
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    total_verified BIGINT,
    total_failed BIGINT,
    total_expired BIGINT,
    success_rate NUMERIC,
    avg_attempts_per_verification NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE action = 'verified') as total_verified,
        COUNT(*) FILTER (WHERE action = 'failed') as total_failed,
        COUNT(*) FILTER (WHERE action = 'expired') as total_expired,
        ROUND(
            (COUNT(*) FILTER (WHERE action = 'verified')::NUMERIC / 
             NULLIF(COUNT(*), 0)) * 100, 2
        ) as success_rate,
        ROUND(
            AVG(CASE WHEN action = 'verified' THEN 
                (metadata->>'attempts_remaining')::INTEGER 
            END), 2
        ) as avg_attempts_per_verification
    FROM verification_audit_log
    WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.3 Audit trigger for profile verification changes
CREATE OR REPLACE FUNCTION audit_verification_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log when verification status changes
    IF OLD.verified IS DISTINCT FROM NEW.verified OR
       OLD.verification_timestamp IS DISTINCT FROM NEW.verification_timestamp OR
       OLD.verification_method IS DISTINCT FROM NEW.verification_method OR
       OLD.verification_token_id IS DISTINCT FROM NEW.verification_token_id THEN
        
        INSERT INTO verification_audit_log (
            user_id, action, verification_token_id, verification_method,
            metadata
        )
        VALUES (
            NEW.id, 
            CASE 
                WHEN NEW.verified = TRUE THEN 'verified'
                WHEN OLD.verified = TRUE AND NEW.verified = FALSE THEN 'revoked'
                ELSE 'updated'
            END,
            NEW.verification_token_id,
            NEW.verification_method,
            jsonb_build_object(
                'old_verified', OLD.verified,
                'new_verified', NEW.verified,
                'old_timestamp', OLD.verification_timestamp,
                'new_timestamp', NEW.verification_timestamp,
                'old_method', OLD.verification_method,
                'new_method', NEW.verification_method,
                'change_type', 'profile_update'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.4 Create audit trigger
CREATE TRIGGER trg_audit_verification_changes
    AFTER UPDATE OF verified, verification_timestamp, verification_method, verification_token_id
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_verification_changes();

-- =====================================================
-- PHASE 7: Row Level Security (RLS) Policies
-- =====================================================

-- 7.1 Enable RLS on relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_audit_log ENABLE ROW LEVEL SECURITY;

-- 7.2 Create RLS policies
-- Users can only read their own verification status
CREATE POLICY "Users can view own verification" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile (but not verification fields directly)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND verified = OLD.verified);

-- Only service role can update verification fields
CREATE POLICY "Service role can update verification" ON profiles
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (true);

-- Users can only read their own verification tokens
CREATE POLICY "Users can view own tokens" ON verification_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all tokens
CREATE POLICY "Service role can manage tokens" ON verification_tokens
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can only read their own audit logs
CREATE POLICY "Users can view own audit logs" ON verification_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can view all audit logs
CREATE POLICY "Service role can view all audit logs" ON verification_audit_log
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- PHASE 8: Data Integrity Verification
-- =====================================================

-- 8.1 Function to check verification data integrity
CREATE OR REPLACE FUNCTION verify_verification_integrity()
RETURNS TABLE(
    issue_type TEXT,
    user_id UUID,
    issue_description TEXT,
    suggested_action TEXT
) AS $$
BEGIN
    -- Check for verified users with missing fields
    RETURN QUERY
    SELECT 
        'verified_missing_fields'::TEXT,
        p.id,
        'User marked as verified but missing required fields',
        'Set verified = FALSE and clear verification fields'
    FROM profiles p
    WHERE p.verified = TRUE 
    AND (p.verification_timestamp IS NULL OR p.verification_method IS NULL OR p.verification_token_id IS NULL);
    
    -- Check for unverified users with verification fields
    RETURN QUERY
    SELECT 
        'unverified_with_fields'::TEXT,
        p.id,
        'User not verified but has verification fields set',
        'Clear verification fields'
    FROM profiles p
    WHERE p.verified = FALSE 
    AND (p.verification_timestamp IS NOT NULL OR p.verification_method IS NOT NULL OR p.verification_token_id IS NOT NULL);
    
    -- Check for users with non-existent tokens
    RETURN QUERY
    SELECT 
        'invalid_token_reference'::TEXT,
        p.id,
        'User references non-existent verification token',
        'Set verification_token_id = NULL'
    FROM profiles p
    LEFT JOIN verification_tokens vt ON p.verification_token_id = vt.id
    WHERE p.verification_token_id IS NOT NULL AND vt.id IS NULL;
    
    -- Check for unused tokens on verified users
    RETURN QUERY
    SELECT 
        'verified_with_unused_token'::TEXT,
        p.id,
        'Verified user has unused verification token',
        'Mark token as used'
    FROM profiles p
    JOIN verification_tokens vt ON p.verification_token_id = vt.id
    WHERE p.verified = TRUE AND vt.used = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.2 Function to fix common integrity issues
CREATE OR REPLACE FUNCTION fix_verification_integrity_issues()
RETURNS INTEGER AS $$
DECLARE
    fixes_applied INTEGER := 0;
BEGIN
    -- Fix verified users with missing fields
    UPDATE profiles
    SET 
        verified = FALSE,
        verification_timestamp = NULL,
        verification_method = NULL,
        verification_token_id = NULL
    WHERE verified = TRUE 
    AND (verification_timestamp IS NULL OR verification_method IS NULL OR verification_token_id IS NULL);
    
    GET DIAGNOSTICS fixes_applied = ROW_COUNT;
    
    -- Fix unverified users with verification fields
    UPDATE profiles
    SET 
        verification_timestamp = NULL,
        verification_method = NULL,
        verification_token_id = NULL
    WHERE verified = FALSE 
    AND (verification_timestamp IS NOT NULL OR verification_method IS NOT NULL OR verification_token_id IS NOT NULL);
    
    -- Fix unused tokens on verified users
    UPDATE verification_tokens
    SET used = TRUE, used_at = p.verification_timestamp
    FROM profiles p
    WHERE verification_tokens.id = p.verification_token_id 
    AND p.verified = TRUE 
    AND verification_tokens.used = FALSE;
    
    RETURN fixes_applied;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PHASE 9: Grant Permissions
-- =====================================================

-- Grant necessary permissions
GRANT SELECT ON profiles TO anon, authenticated;
GRANT UPDATE ON profiles TO authenticated;
GRANT SELECT ON verification_tokens TO authenticated;
GRANT SELECT ON verification_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION create_verification_token TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_token TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_audit_trail TO authenticated;

-- Grant service role permissions
GRANT ALL ON profiles TO service_role;
GRANT ALL ON verification_tokens TO service_role;
GRANT ALL ON verification_audit_log TO service_role;
GRANT ALL ON verification_error_messages TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add migration completion marker
INSERT INTO verification_audit_log (
    user_id, action, metadata
)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'system',
    jsonb_build_object(
        'migration', 'verification_system_revision',
        'version', '1.0',
        'completed_at', NOW(),
        'description', 'Comprehensive verification system revision with strict validation and audit logging'
    )
);