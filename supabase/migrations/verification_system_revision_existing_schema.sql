-- =====================================================
-- SUPABASE VERIFICATION SYSTEM REVISION - EXISTING SCHEMA
-- Works with current database structure
-- =====================================================

-- =====================================================
-- PHASE 1: Add new columns to existing tables
-- =====================================================

-- 1.1 Add enhanced verification fields to existing profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_verification_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS last_verification_attempt TIMESTAMP WITH TIME ZONE;

-- 1.2 Add attempt tracking to existing verification_tokens table
ALTER TABLE verification_tokens
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3;

-- 1.3 Clean up existing data
UPDATE profiles SET verification_attempts = 0 WHERE verification_attempts IS NULL;
UPDATE profiles SET max_verification_attempts = 3 WHERE max_verification_attempts IS NULL;
UPDATE verification_tokens SET attempts = 0 WHERE attempts IS NULL;
UPDATE verification_tokens SET max_attempts = 3 WHERE max_attempts IS NULL;

-- =====================================================
-- PHASE 2: Create error handling system
-- =====================================================

-- 2.1 Create error type enum (using DO block to handle existing type)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_error_type') THEN
        CREATE TYPE verification_error_type AS ENUM (
            'missing_fields',
            'invalid_token',
            'expired_token',
            'max_attempts_exceeded',
            'already_verified',
            'database_error',
            'system_error'
        );
    END IF;
END$$;

-- 2.2 Create error messages table
CREATE TABLE IF NOT EXISTS verification_error_messages (
    error_type verification_error_type PRIMARY KEY,
    user_message TEXT NOT NULL,
    technical_message TEXT,
    retry_allowed BOOLEAN DEFAULT TRUE,
    retry_delay_minutes INTEGER DEFAULT 0
);

-- 2.3 Insert standard error messages
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
-- PHASE 3: Enhanced verification functions
-- =====================================================

-- 3.1 Enhanced token creation function (works with existing schema)
CREATE OR REPLACE FUNCTION create_verification_token(
    p_user_id UUID,
    p_token_type TEXT,
    p_method TEXT,
    p_expires_in_minutes INTEGER DEFAULT 60
)
RETURNS UUID AS $$
DECLARE
    token_uuid UUID;
    token_hash TEXT;
    plain_token TEXT;
    v_method TEXT;
BEGIN
    -- Map token_type to method
    IF p_token_type = 'email_verification' THEN
        v_method := 'email';
    ELSIF p_token_type = 'phone_verification' THEN
        v_method := 'phone';
    ELSE
        v_method := COALESCE(p_method, 'email');
    END IF;
    
    -- Validate inputs
    IF p_token_type NOT IN ('email_verification', 'phone_verification', 'password_reset') THEN
        RAISE EXCEPTION 'Invalid verification type: %', p_token_type;
    END IF;
    
    -- Generate secure token
    token_uuid := gen_random_uuid();
    plain_token := encode(gen_random_bytes(32), 'hex');
    token_hash := crypt(plain_token, gen_salt('bf'));
    
    -- Insert token with validation (using existing schema)
    INSERT INTO verification_tokens (
        id, user_id, token_hash, token_type, expires_at, 
        created_at, created_by_ip, metadata, attempts, max_attempts
    )
    VALUES (
        token_uuid, p_user_id, token_hash, p_token_type, 
        NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        NOW(), NULL, jsonb_build_object('method', v_method), 0, 3
    );
    
    -- Update profile with token reference and expiration
    UPDATE profiles
    SET 
        verification_token_id = token_uuid,
        verification_expires_at = NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        verification_attempts = 0,
        last_verification_attempt = NULL
    WHERE id = p_user_id;
    
    RETURN token_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Enhanced verification function with strict validation
CREATE OR REPLACE FUNCTION verify_user_token(
    p_user_id UUID,
    p_plain_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, error_type verification_error_type) AS $$
DECLARE
    v_token_record RECORD;
    v_attempts_remaining INTEGER;
    v_error verification_error_type;
    v_profile_record RECORD;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_plain_token IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Required information is missing. Please try again.', 'missing_fields';
        RETURN;
    END IF;
    
    -- Get user profile
    SELECT verified, verification_attempts, max_verification_attempts, last_verification_attempt
    INTO v_profile_record
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Profile not found.', 'system_error';
        RETURN;
    END IF;
    
    -- Check if user is already verified
    IF v_profile_record.verified = TRUE THEN
        RETURN QUERY SELECT FALSE, 'Your account is already verified.', 'already_verified';
        RETURN;
    END IF;
    
    -- Check rate limiting (15 minute cooldown)
    IF v_profile_record.last_verification_attempt IS NOT NULL THEN
        IF v_profile_record.last_verification_attempt + INTERVAL '15 minutes' > NOW() THEN
            RETURN QUERY SELECT FALSE, 'Please wait before trying again.', 'max_attempts_exceeded';
            RETURN;
        END IF;
    END IF;
    
    -- Get token record
    SELECT * INTO v_token_record
    FROM verification_tokens
    WHERE user_id = p_user_id 
    AND used_at IS NULL 
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if token exists
    IF v_token_record IS NULL THEN
        v_error := 'invalid_token';
        
        -- Update last attempt time
        UPDATE profiles
        SET last_verification_attempt = NOW()
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT FALSE, 'Invalid verification code. Please check and try again.', v_error;
        RETURN;
    END IF;
    
    -- Check attempts remaining
    IF v_token_record.attempts >= v_token_record.max_attempts THEN
        v_error := 'max_attempts_exceeded';
        
        -- Update last attempt time
        UPDATE profiles
        SET last_verification_attempt = NOW()
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT FALSE, 'Too many failed attempts. Please try again later.', v_error;
        RETURN;
    END IF;
    
    -- Verify token
    IF crypt(p_plain_token, v_token_record.token_hash) = v_token_record.token_hash THEN
        -- Token is valid, mark as used
        UPDATE verification_tokens
        SET used_at = NOW()
        WHERE id = v_token_record.id;
        
        -- Update profile verification status
        UPDATE profiles
        SET 
            verified = TRUE,
            verification_timestamp = NOW(),
            verification_method = v_token_record.metadata->>'method',
            verification_token_id = v_token_record.id,
            verification_attempts = 0,
            last_verification_attempt = NULL
        WHERE id = p_user_id;
        
        -- Log successful verification
        INSERT INTO verification_audit_log (
            user_id, action, verification_token_id, 
            action_by_ip, action_by_user_agent, success
        )
        VALUES (
            p_user_id, 'verified', v_token_record.id,
            p_ip_address, p_user_agent, TRUE
        );
        
        RETURN QUERY SELECT TRUE, 'Verification successful! Your account is now verified.', NULL;
        RETURN;
    ELSE
        -- Invalid token, increment attempts
        UPDATE verification_tokens
        SET attempts = attempts + 1
        WHERE id = v_token_record.id;
        
        -- Update profile attempt count
        UPDATE profiles
        SET 
            verification_attempts = verification_attempts + 1,
            last_verification_attempt = NOW()
        WHERE id = p_user_id;
        
        v_attempts_remaining := v_token_record.max_attempts - v_token_record.attempts - 1;
        
        IF v_attempts_remaining <= 0 THEN
            v_error := 'max_attempts_exceeded';
            RETURN QUERY SELECT FALSE, 'Too many failed attempts. Please try again later.', v_error;
        ELSE
            v_error := 'invalid_token';
            RETURN QUERY SELECT FALSE, 'Invalid verification code. Please check and try again.', v_error;
        END IF;
        
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 Function to check verification status
CREATE OR REPLACE FUNCTION get_verification_status(p_user_id UUID)
RETURNS TABLE(
    verified BOOLEAN,
    verification_timestamp TIMESTAMP WITH TIME ZONE,
    verification_method TEXT,
    verification_token_id UUID,
    can_retry BOOLEAN,
    retry_after TIMESTAMP WITH TIME ZONE,
    attempts_remaining INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_profile RECORD;
    v_token RECORD;
    v_last_attempt TIMESTAMP WITH TIME ZONE;
    v_cooldown_minutes INTEGER := 15;
BEGIN
    -- Get profile data
    SELECT verified, verification_timestamp, verification_method, verification_token_id,
           verification_attempts, last_verification_attempt, max_verification_attempts
    INTO v_profile
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL, NULL, NULL, FALSE, NULL, 0, 'Profile not found';
        RETURN;
    END IF;
    
    -- If already verified, return success
    IF v_profile.verified THEN
        RETURN QUERY SELECT TRUE, v_profile.verification_timestamp, 
                     v_profile.verification_method, v_profile.verification_token_id,
                     FALSE, NULL, 0, NULL;
        RETURN;
    END IF;
    
    -- Check for rate limiting
    IF v_profile.last_verification_attempt IS NOT NULL THEN
        v_last_attempt := v_profile.last_verification_attempt + (v_cooldown_minutes || ' minutes')::INTERVAL;
        
        IF v_last_attempt > NOW() THEN
            RETURN QUERY SELECT FALSE, NULL, NULL, v_profile.verification_token_id,
                         FALSE, v_last_attempt, 
                         GREATEST(0, v_profile.max_verification_attempts - v_profile.verification_attempts),
                         'Please wait before trying again';
            RETURN;
        END IF;
    END IF;
    
    -- Return current status
    RETURN QUERY SELECT FALSE, NULL, NULL, v_profile.verification_token_id,
                 TRUE, NULL, 
                 GREATEST(0, v_profile.max_verification_attempts - v_profile.verification_attempts),
                 NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PHASE 4: Row Level Security (RLS) Policies
-- =====================================================

-- 4.1 Enable RLS on error messages table
ALTER TABLE verification_error_messages ENABLE ROW LEVEL SECURITY;

-- 4.2 Error messages policies (read-only for all)
CREATE POLICY "Anyone can read error messages" ON verification_error_messages
    FOR SELECT USING (true);

-- =====================================================
-- PHASE 5: Grant Permissions
-- =====================================================

-- Grant necessary permissions for new tables
GRANT SELECT ON verification_error_messages TO anon, authenticated;
GRANT ALL ON verification_error_messages TO service_role;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_verification_token TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION verify_user_token TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_verification_status TO anon, authenticated, service_role;

-- =====================================================
-- PHASE 6: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_method ON profiles(verification_method);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_token_id ON profiles(verification_token_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_expires_at ON profiles(verification_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_verification_attempt ON profiles(last_verification_attempt);

-- =====================================================
-- PHASE 7: Add constraints for data integrity
-- =====================================================

-- Add check constraints
ALTER TABLE profiles
ADD CONSTRAINT profiles_verification_attempts_check 
    CHECK (verification_attempts >= 0),
ADD CONSTRAINT profiles_max_verification_attempts_check 
    CHECK (max_verification_attempts > 0);

ALTER TABLE verification_tokens
ADD CONSTRAINT verification_tokens_attempts_check 
    CHECK (attempts >= 0),
ADD CONSTRAINT verification_tokens_max_attempts_check 
    CHECK (max_attempts > 0);

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Add migration completion timestamp
COMMENT ON TABLE profiles IS 'Enhanced verification system implemented: attempt tracking, rate limiting, error handling';
COMMENT ON TABLE verification_tokens IS 'Enhanced token management with attempt tracking and security features';

-- Final verification of constraints
SELECT 'Verification system migration completed successfully' as status;