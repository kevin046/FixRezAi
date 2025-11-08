/**
 * Enhanced Verification System Database Functions
 * Provides comprehensive verification status management and token operations
 */

-- Function: Get user verification status with detailed information
CREATE OR REPLACE FUNCTION get_user_verification_status(user_uuid UUID)
RETURNS TABLE (
    is_verified BOOLEAN,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_method TEXT,
    has_valid_token BOOLEAN,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    verification_timestamp TIMESTAMP WITH TIME ZONE,
    verification_token_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.verified AS is_verified,
        p.verified_at,
        p.verification_method,
        EXISTS (
            SELECT 1 FROM verification_tokens vt
            WHERE vt.user_id = user_uuid 
            AND vt.used = false 
            AND vt.expires_at > NOW()
        ) AS has_valid_token,
        (
            SELECT vt.expires_at 
            FROM verification_tokens vt
            WHERE vt.user_id = user_uuid 
            AND vt.used = false 
            AND vt.expires_at > NOW()
            ORDER BY vt.created_at DESC
            LIMIT 1
        ) AS token_expires_at,
        p.verification_timestamp,
        p.verification_token_id
    FROM profiles p
    WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT SELECT ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_verification_status(UUID) TO authenticated;

-- Function: Create verification token with audit logging
CREATE OR REPLACE FUNCTION create_verification_token(
    p_user_id UUID,
    p_token TEXT,
    p_email TEXT,
    p_expires_at TIMESTAMP WITH TIME ZONE,
    p_ip_address INET,
    p_user_agent TEXT
)
RETURNS TABLE (
    id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_token_id UUID;
    v_rate_limit_exceeded BOOLEAN;
BEGIN
    -- Check rate limiting (max 5 tokens per hour per user)
    SELECT COUNT(*) >= 5 INTO v_rate_limit_exceeded
    FROM verification_tokens
    WHERE user_id = p_user_id 
    AND created_at > NOW() - INTERVAL '1 hour'
    AND used = false;

    IF v_rate_limit_exceeded THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Rate limit exceeded: Maximum 5 tokens per hour';
        RETURN;
    END IF;

    -- Check if user already has valid token
    IF EXISTS (
        SELECT 1 FROM verification_tokens
        WHERE user_id = p_user_id 
        AND used = false 
        AND expires_at > NOW()
    ) THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Valid token already exists';
        RETURN;
    END IF;

    -- Create verification token
    INSERT INTO verification_tokens (
        user_id,
        token,
        email,
        expires_at,
        created_at,
        used,
        used_at
    ) VALUES (
        p_user_id,
        p_token,
        p_email,
        p_expires_at,
        NOW(),
        false,
        NULL
    ) RETURNING verification_tokens.id INTO v_token_id;

    -- Log token creation
    INSERT INTO verification_audit_log (
        user_id,
        token_id,
        action,
        success,
        ip_address,
        user_agent,
        details,
        created_at
    ) VALUES (
        p_user_id,
        v_token_id,
        'token_created',
        true,
        p_ip_address,
        p_user_agent,
        jsonb_build_object('email', p_email, 'expires_at', p_expires_at),
        NOW()
    );

    RETURN QUERY SELECT v_token_id, true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark user as verified with comprehensive audit trail
CREATE OR REPLACE FUNCTION mark_user_verified(
    p_user_id UUID,
    p_token_id UUID,
    p_verification_method TEXT,
    p_ip_address INET,
    p_user_agent TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    verified_at TIMESTAMP WITH TIME ZONE,
    audit_log_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_audit_log_id UUID;
    v_verified_at TIMESTAMP WITH TIME ZONE;
    v_already_verified BOOLEAN;
BEGIN
    -- Check if user is already verified
    SELECT verified INTO v_already_verified
    FROM profiles
    WHERE id = p_user_id;

    IF v_already_verified THEN
        RETURN QUERY SELECT false, NULL, NULL, 'User already verified';
        RETURN;
    END IF;

    -- Verify token exists and is valid
    IF NOT EXISTS (
        SELECT 1 FROM verification_tokens
        WHERE id = p_token_id
        AND user_id = p_user_id
        AND used = false
        AND expires_at > NOW()
    ) THEN
        RETURN QUERY SELECT false, NULL, NULL, 'Invalid or expired token';
        RETURN;
    END IF;

    -- Mark token as used
    UPDATE verification_tokens
    SET used = true,
        used_at = NOW()
    WHERE id = p_token_id;

    -- Mark user as verified
    UPDATE profiles
    SET 
        verified = true,
        verified_at = NOW(),
        verification_method = p_verification_method,
        verification_timestamp = NOW(),
        verification_token_id = p_token_id,
        updated_at = NOW()
    WHERE id = p_user_id;

    v_verified_at := NOW();

    -- Log verification success
    INSERT INTO verification_audit_log (
        user_id,
        token_id,
        action,
        success,
        ip_address,
        user_agent,
        details,
        created_at
    ) VALUES (
        p_user_id,
        p_token_id,
        'verification_success',
        true,
        p_ip_address,
        p_user_agent,
        jsonb_build_object('method', p_verification_method, 'verified_at', v_verified_at),
        NOW()
    ) RETURNING id INTO v_audit_log_id;

    RETURN QUERY SELECT true, v_verified_at, v_audit_log_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log verification attempt
CREATE OR REPLACE FUNCTION log_verification_attempt(
    p_user_id UUID,
    p_token_id UUID,
    p_action TEXT,
    p_success BOOLEAN,
    p_ip_address INET,
    p_user_agent TEXT,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_log_id UUID;
BEGIN
    INSERT INTO verification_audit_log (
        user_id,
        token_id,
        action,
        success,
        ip_address,
        user_agent,
        details,
        created_at
    ) VALUES (
        p_user_id,
        p_token_id,
        p_action,
        p_success,
        p_ip_address,
        p_user_agent,
        COALESCE(p_details, '{}'::jsonb),
        NOW()
    ) RETURNING id INTO v_audit_log_id;

    RETURN v_audit_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM verification_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
    AND used = true;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get verification statistics
CREATE OR REPLACE FUNCTION get_verification_stats(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_users BIGINT,
    verified_users BIGINT,
    verification_rate NUMERIC,
    pending_verifications BIGINT,
    expired_tokens BIGINT,
    total_verification_attempts BIGINT,
    successful_verifications BIGINT,
    failed_verifications BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p.id)::BIGINT AS total_users,
        COUNT(DISTINCT p.id) FILTER (WHERE p.verified = true)::BIGINT AS verified_users,
        ROUND(
            (COUNT(DISTINCT p.id) FILTER (WHERE p.verified = true)::NUMERIC / 
             NULLIF(COUNT(DISTINCT p.id), 0)::NUMERIC * 100), 
            2
        ) AS verification_rate,
        COUNT(DISTINCT vt.id) FILTER (WHERE vt.used = false AND vt.expires_at > NOW())::BIGINT AS pending_verifications,
        COUNT(DISTINCT vt.id) FILTER (WHERE vt.expires_at < NOW())::BIGINT AS expired_tokens,
        COUNT(DISTINCT val.id)::BIGINT AS total_verification_attempts,
        COUNT(DISTINCT val.id) FILTER (WHERE val.success = true)::BIGINT AS successful_verifications,
        COUNT(DISTINCT val.id) FILTER (WHERE val.success = false)::BIGINT AS failed_verifications
    FROM profiles p
    LEFT JOIN verification_tokens vt ON p.id = vt.user_id
    LEFT JOIN verification_audit_log val ON p.id = val.user_id
    WHERE p.created_at::DATE BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Send reminder emails for pending verifications
CREATE OR REPLACE FUNCTION send_verification_reminders(
    p_days_before_expiry INTEGER DEFAULT 3
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    token_id UUID,
    reminder_sent BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_user_record RECORD;
    v_token_record RECORD;
BEGIN
    FOR v_user_record IN
        SELECT DISTINCT p.id, p.email
        FROM profiles p
        INNER JOIN verification_tokens vt ON p.id = vt.user_id
        WHERE p.verified = false
        AND vt.used = false
        AND vt.expires_at > NOW()
        AND vt.expires_at <= NOW() + INTERVAL '1 day' * p_days_before_expiry
        AND NOT EXISTS (
            SELECT 1 FROM verification_audit_log val
            WHERE val.user_id = p.id
            AND val.action = 'reminder_sent'
            AND val.created_at > NOW() - INTERVAL '24 hours'
        )
    LOOP
        -- Get the most recent valid token for this user
        SELECT vt.id, vt.token, vt.expires_at
        INTO v_token_record
        FROM verification_tokens vt
        WHERE vt.user_id = v_user_record.id
        AND vt.used = false
        AND vt.expires_at > NOW()
        ORDER BY vt.created_at DESC
        LIMIT 1;

        IF v_token_record.id IS NOT NULL THEN
            -- Here you would typically call your email service
            -- For now, we'll log the reminder attempt
            INSERT INTO verification_audit_log (
                user_id,
                token_id,
                action,
                success,
                details,
                created_at
            ) VALUES (
                v_user_record.id,
                v_token_record.id,
                'reminder_sent',
                true,
                jsonb_build_object('days_before_expiry', p_days_before_expiry),
                NOW()
            );

            RETURN QUERY SELECT 
                v_user_record.id,
                v_user_record.email,
                v_token_record.id,
                true,
                NULL::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_used ON verification_tokens(used);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_user_id ON verification_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_created_at ON verification_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_at ON profiles(verified_at);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_verification_token(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_user_verified(UUID, UUID, TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_verification_attempt(UUID, UUID, TEXT, BOOLEAN, INET, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_stats(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION send_verification_reminders(INTEGER) TO authenticated;

-- Create scheduled cleanup job (requires pg_cron extension)
-- This would typically be set up in Supabase dashboard or via migration
/*
SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_tokens();');
SELECT cron.schedule('send-verification-reminders', '0 9 * * *', 'SELECT send_verification_reminders();');
*/