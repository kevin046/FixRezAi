-- Enhanced Account Verification System Schema

-- Add verification timestamp to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_timestamp timestamptz,
ADD COLUMN IF NOT EXISTS verification_method text,
ADD COLUMN IF NOT EXISTS verification_token_id uuid;

COMMENT ON COLUMN public.profiles.verification_timestamp IS 'Timestamp when user was verified via email token';
COMMENT ON COLUMN public.profiles.verification_method IS 'Method used for verification (email_token, admin_manual, etc.)';
COMMENT ON COLUMN public.profiles.verification_token_id IS 'Reference to the verification token used';

-- Create verification tokens table for proper token management
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_type text NOT NULL DEFAULT 'email_verification',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_ip inet,
  metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.verification_tokens IS 'Stores email verification tokens with proper expiration and usage tracking';
COMMENT ON COLUMN public.verification_tokens.token_hash IS 'Hashed token for security';
COMMENT ON COLUMN public.verification_tokens.token_type IS 'Type of verification token';
COMMENT ON COLUMN public.verification_tokens.expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN public.verification_tokens.used_at IS 'Timestamp when token was used for verification';
COMMENT ON COLUMN public.verification_tokens.created_by_ip IS 'IP address that created the token';
COMMENT ON COLUMN public.verification_tokens.metadata IS 'Additional metadata for the token';

-- Create verification audit log table
CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  action_timestamp timestamptz NOT NULL DEFAULT now(),
  action_by_ip inet,
  action_by_user_agent text,
  verification_token_id uuid REFERENCES public.verification_tokens(id),
  details jsonb DEFAULT '{}'::jsonb,
  success boolean NOT NULL,
  error_message text
);

COMMENT ON TABLE public.verification_audit_log IS 'Audit trail for all verification-related events';
COMMENT ON COLUMN public.verification_audit_log.action IS 'Type of verification action (token_created, token_used, verification_failed, etc.)';
COMMENT ON COLUMN public.verification_audit_log.action_timestamp IS 'When the action occurred';
COMMENT ON COLUMN public.verification_audit_log.action_by_ip IS 'IP address that performed the action';
COMMENT ON COLUMN public.verification_audit_log.action_by_user_agent IS 'User agent that performed the action';
COMMENT ON COLUMN public.verification_audit_log.details IS 'Additional details about the action';
COMMENT ON COLUMN public.verification_audit_log.success IS 'Whether the action was successful';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON public.verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON public.verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_used_at ON public.verification_tokens(used_at);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_user_id ON public.verification_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_action_timestamp ON public.verification_audit_log(action_timestamp);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_verification_token_id ON public.verification_audit_log(verification_token_id);

-- Row Level Security Policies for verification_tokens
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view their own tokens
CREATE POLICY "Users can view own verification tokens" ON public.verification_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update tokens (backend only)
CREATE POLICY "Service role can manage verification tokens" ON public.verification_tokens
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Row Level Security Policies for verification_audit_log
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own verification audit logs" ON public.verification_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage audit logs
CREATE POLICY "Service role can manage verification audit logs" ON public.verification_audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.verification_tokens TO authenticated;
GRANT SELECT ON public.verification_audit_log TO authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Grant full permissions to service role
GRANT ALL ON public.verification_tokens TO service_role;
GRANT ALL ON public.verification_audit_log TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.verification_tokens 
  WHERE expires_at < now() 
  AND used_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_verification_tokens() IS 'Clean up expired and unused verification tokens';

-- Function to get user verification status
CREATE OR REPLACE FUNCTION public.get_user_verification_status(user_uuid uuid)
RETURNS TABLE (
  is_verified boolean,
  verification_timestamp timestamptz,
  verification_method text,
  has_valid_token boolean,
  token_expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.verified,
    p.verification_timestamp,
    p.verification_method,
    EXISTS (
      SELECT 1 FROM public.verification_tokens vt 
      WHERE vt.user_id = user_uuid 
      AND vt.expires_at > now() 
      AND vt.used_at IS NULL
    ) AS has_valid_token,
    (SELECT MAX(vt.expires_at) FROM public.verification_tokens vt 
     WHERE vt.user_id = user_uuid 
     AND vt.used_at IS NULL 
     AND vt.expires_at > now()
    ) AS token_expires_at
  FROM public.profiles p
  WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_verification_status(uuid) IS 'Get comprehensive verification status for a user';