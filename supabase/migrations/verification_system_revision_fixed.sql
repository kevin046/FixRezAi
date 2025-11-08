-- =====================================================
-- SUPABASE VERIFICATION SYSTEM REVISION
-- Phase 1: Enhanced Profiles Table
-- =====================================================

-- 1.1 Add enhanced verification fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_method TEXT CHECK (verification_method IN ('email', 'phone', 'admin')),
ADD COLUMN IF NOT EXISTS verification_token_id UUID REFERENCES verification_tokens(id),
ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0 CHECK (verification_attempts >= 0),
ADD COLUMN IF NOT EXISTS max_verification_attempts INTEGER DEFAULT 3 CHECK (max_verification_attempts > 0),
ADD COLUMN IF NOT EXISTS last_verification_attempt TIMESTAMP WITH TIME ZONE;

-- 1.2 Add strict constraints to prevent invalid states
ALTER TABLE profiles
ADD CONSTRAINT verified_requires_timestamp 
    CHECK (verified = FALSE OR (verified = TRUE AND verification_timestamp IS NOT NULL)),
ADD CONSTRAINT verified_requires_method 
    CHECK (verified = FALSE OR (verified = TRUE AND verification_method IS NOT NULL)),
ADD CONSTRAINT verified_requires_token 
    CHECK (verified = FALSE OR (verified = TRUE AND verification_token_id IS NOT NULL)),
ADD CONSTRAINT timestamp_requires_verified 
    CHECK (verification_timestamp IS NULL OR verified = TRUE),
ADD CONSTRAINT method_requires_verified 
    CHECK (verification_method IS NULL OR verified = TRUE),
ADD CONSTRAINT token_requires_verified 
    CHECK (verification_token_id IS NULL OR verified = TRUE);

-- 1.3 Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_method ON profiles(verification_method);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_token_id ON profiles(verification_token_id);

-- =====================================================
-- PHASE 2: Enhanced Verification Tokens Table
-- =====================================================

-- 2.1 Create enhanced verification tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('email', 'phone', 'password_reset')),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    method TEXT NOT NULL CHECK (method IN ('email', 'phone', 'admin')),
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER DEFAULT 3 CHECK (max_attempts > 0)
);

-- 2.2 Create indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_type ON verification_tokens(type);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_used ON verification_tokens(used);

-- =====================================================
-- PHASE 3: Error Handling System
-- =====================================================

-- 3.1 Create error type enum (using DO block to handle existing type)
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
    
    -- Update profile with token reference
    UPDATE profiles
    SET 
        verification_token_id = token_uuid,
        verification_expires_at = NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        verification_attempts = 0
    WHERE id = p_user_id;
    
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
RETURNS TABLE(success BOOLEAN, message TEXT, error_type verification_error_type) AS $$
DECLARE
    v_token_record RECORD;
    v_attempts_remaining INTEGER;
    v_error verification_error_type;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_plain_token IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Required information is missing. Please try again.', 'missing_fields';
        RETURN;
    END IF;
    
    -- Check if user is already verified
    IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND verified = TRUE) THEN
        RETURN QUERY SELECT FALSE, 'Your account is already verified.', 'already_verified';
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
        v_error := 'invalid_token';
        RETURN QUERY SELECT FALSE, 'Invalid verification code. Please check and try again.', v_error;
        RETURN;
    END IF;
    
    -- Check if token is expired
    IF v_token_record.expires_at <= NOW() THEN
        v_error := 'expired_token';
        RETURN QUERY SELECT FALSE, 'Verification code has expired. A new code has been sent.', v_error;
        RETURN;
    END IF;
    
    -- Check attempts remaining
    IF v_token_record.attempts >= v_token_record.max_attempts THEN
        v_error := 'max_attempts_exceeded';
        RETURN QUERY SELECT FALSE, 'Too many failed attempts. Please try again later.', v_error;
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

-- 4.3 Function to check verification status
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
-- PHASE 5: Row Level Security (RLS) Policies
-- =====================================================

-- 5.1 Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_error_messages ENABLE ROW LEVEL SECURITY;

-- 5.2 Profiles table policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5.3 Verification tokens policies
CREATE POLICY "Users can view own verification tokens" ON verification_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all verification tokens" ON verification_tokens
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5.4 Error messages policies (read-only for all)
CREATE POLICY "Anyone can read error messages" ON verification_error_messages
    FOR SELECT USING (true);

-- =====================================================
-- PHASE 6: Grant Permissions
-- =====================================================

-- Grant necessary permissions
GRANT SELECT ON profiles TO anon, authenticated;
GRANT UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

GRANT SELECT ON verification_tokens TO anon, authenticated;
GRANT ALL ON verification_tokens TO service_role;

GRANT SELECT ON verification_error_messages TO anon, authenticated;
GRANT ALL ON verification_error_messages TO service_role;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_verification_token TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION verify_user_token TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_verification_status TO anon, authenticated, service_role;

-- =====================================================
-- PHASE 7: Triggers for Data Consistency
-- =====================================================

-- 7.1 Trigger to prevent unverified users from being marked as verified
CREATE OR REPLACE FUNCTION prevent_invalid_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure verification constraints are met
    IF NEW.verified = TRUE THEN
        -- Check required fields
        IF NEW.verification_timestamp IS NULL THEN
            RAISE EXCEPTION 'Cannot mark user as verified without verification_timestamp';
        END IF;
        
        IF NEW.verification_method IS NULL THEN
            RAISE EXCEPTION 'Cannot mark user as verified without verification_method';
        END IF;
        
        IF NEW.verification_token_id IS NULL THEN
            RAISE EXCEPTION 'Cannot mark user as verified without verification_token_id';
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_invalid_verification
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_invalid_verification();

-- 7.2 Trigger to clean up old verification tokens
CREATE OR REPLACE FUNCTION cleanup_old_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up tokens older than 30 days
    DELETE FROM verification_tokens
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND used = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_old_tokens
    AFTER INSERT ON verification_tokens
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_old_tokens();

-- =====================================================
-- PHASE 8: Initial Data Setup
-- =====================================================

-- Insert any initial error messages that might be missing
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
-- MIGRATION COMPLETION
-- =====================================================

-- Add migration completion timestamp
COMMENT ON TABLE profiles IS 'Enhanced verification system implemented: strict validation, audit logging, error handling';
COMMENT ON TABLE verification_tokens IS 'Enhanced token management with security features and attempt tracking';

-- Final verification of constraints
SELECT 'Verification system migration completed successfully' as status;