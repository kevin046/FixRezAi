-- Enhanced verification system migration
-- This migration adds comprehensive token management and security features

-- Add missing columns to verification_tokens table if they don't exist
DO $$
BEGIN
    -- Add attempts tracking column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'verification_tokens' 
                   AND column_name = 'attempts') THEN
        ALTER TABLE public.verification_tokens 
        ADD COLUMN attempts integer DEFAULT 0 CHECK (attempts >= 0);
    END IF;

    -- Add max_attempts column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'verification_tokens' 
                   AND column_name = 'max_attempts') THEN
        ALTER TABLE public.verification_tokens 
        ADD COLUMN max_attempts integer DEFAULT 3 CHECK (max_attempts > 0);
    END IF;

    -- Add metadata column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'verification_tokens' 
                   AND column_name = 'metadata') THEN
        ALTER TABLE public.verification_tokens 
        ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON public.verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token_hash ON public.verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON public.verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_used_at ON public.verification_tokens(used_at);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_created_at ON public.verification_tokens(created_at);

-- Create composite index for active tokens lookup
CREATE INDEX IF NOT EXISTS idx_verification_tokens_active 
ON public.verification_tokens(user_id, token_type, expires_at) 
WHERE used_at IS NULL;

-- Add indexes to verification_audit_log for better query performance
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_user_id ON public.verification_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_action ON public.verification_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_timestamp ON public.verification_audit_log(action_timestamp);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_token_id ON public.verification_audit_log(verification_token_id);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.verification_tokens 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's active verification tokens
CREATE OR REPLACE FUNCTION public.get_user_active_verification_tokens(p_user_id uuid, p_token_type text DEFAULT 'email_verification')
RETURNS TABLE (
    id uuid,
    token_hash text,
    expires_at timestamptz,
    attempts integer,
    max_attempts integer,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT vt.id, vt.token_hash, vt.expires_at, vt.attempts, vt.max_attempts, vt.metadata
    FROM public.verification_tokens vt
    WHERE vt.user_id = p_user_id 
    AND vt.token_type = p_token_type
    AND vt.used_at IS NULL
    AND vt.expires_at > NOW()
    ORDER BY vt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to invalidate all user tokens of a specific type
CREATE OR REPLACE FUNCTION public.invalidate_user_tokens(p_user_id uuid, p_token_type text DEFAULT 'email_verification')
RETURNS integer AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE public.verification_tokens 
    SET used_at = NOW(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{invalidated_by_function}',
            to_jsonb(NOW()::text)
        )
    WHERE user_id = p_user_id 
    AND token_type = p_token_type 
    AND used_at IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON public.verification_tokens TO anon, authenticated;
GRANT SELECT, INSERT ON public.verification_audit_log TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_verification_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_verification_tokens(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invalidate_user_tokens(uuid, text) TO authenticated;

-- Add RLS policies for verification_tokens
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "Users can view own verification tokens" ON public.verification_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can create own verification tokens" ON public.verification_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own unused tokens
CREATE POLICY "Users can update own unused verification tokens" ON public.verification_tokens
    FOR UPDATE USING (auth.uid() = user_id AND used_at IS NULL);

-- Add RLS policies for verification_audit_log
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
CREATE POLICY "Users can view own verification audit logs" ON public.verification_audit_log
    FOR SELECT USING (auth.uid() = user_id);