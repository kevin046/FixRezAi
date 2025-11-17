// Enhanced verification token management system
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// Token configuration
const TOKEN_EXPIRY_HOURS = 24
const MAX_VERIFICATION_ATTEMPTS = 3
const RESEND_COOLDOWN_MINUTES = 5

// Enhanced verification token management
export interface VerificationToken {
  id: string
  user_id: string
  token_hash: string
  token_type: string
  expires_at: string
  used_at: string | null
  created_at: string
  created_by_ip: string | null
  metadata: Record<string, any>
  attempts: number
  max_attempts: number
}

export interface VerificationAuditLog {
  id: string
  user_id: string
  action: string
  action_timestamp: string
  action_by_ip: string | null
  action_by_user_agent: string | null
  verification_token_id: string | null
  details: Record<string, any>
  success: boolean
  error_message: string | null
}

/**
 * Generate a new verification token and invalidate previous ones
 */
export async function generateVerificationToken(
  userId: string, 
  email: string, 
  tokenType: 'email_verification' | 'password_reset' = 'email_verification',
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; token?: string; message?: string }> {
  try {
    console.log(`🔑 Generating new ${tokenType} token for user:`, userId)
    
    // Generate a secure random token
    const token = generateSecureToken(32)
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
    
    // Get client IP for audit logging
    const clientIp = await getClientIp()
    
    // Start transaction to invalidate old tokens and create new one
    const { data: newToken, error: tokenError } = await supabase
      .from('verification_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        token_type: tokenType,
        expires_at: expiresAt,
        created_by_ip: clientIp,
        metadata: {
          ...metadata,
          email,
          generation_method: 'resend_verification',
          previous_tokens_invalidated: true
        },
        attempts: 0,
        max_attempts: MAX_VERIFICATION_ATTEMPTS
      })
      .select()
      .single()

    if (tokenError) {
      console.error('❌ Failed to create verification token:', tokenError)
      return { success: false, message: 'Failed to generate verification token' }
    }

    // Invalidate all previous unused tokens for this user and type
    const { error: invalidateError } = await supabase
      .from('verification_tokens')
      .update({ 
        used_at: new Date().toISOString(),
        metadata: {
          invalidated_by: 'new_token_generated',
          invalidated_at: new Date().toISOString(),
          new_token_id: newToken.id
        }
      })
      .eq('user_id', userId)
      .eq('token_type', tokenType)
      .is('used_at', null)
      .neq('id', newToken.id)

    if (invalidateError) {
      console.warn('⚠️ Failed to invalidate previous tokens:', invalidateError)
    }

    // Log the token generation
    await logVerificationEvent(userId, 'token_created', {
      token_id: newToken.id,
      token_type: tokenType,
      expires_at: expiresAt,
      previous_tokens_invalidated: true
    }, true)

    console.log('✅ Verification token generated successfully:', newToken.id)
    return { success: true, token }

  } catch (error) {
    console.error('💥 Error generating verification token:', error)
    return { success: false, message: 'Internal error generating verification token' }
  }
}

/**
 * Enhanced resend verification with fresh token generation and attempt tracking
 */
export async function enhancedResendVerification(
  email: string, 
  userId?: string
): Promise<{ success: boolean; message: string; token?: string; attempts_remaining?: number; error_code?: string }> {
  try {
    console.log('🔄 Enhanced resend verification requested for:', email)
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' }
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, email_confirmed_at, user_metadata')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      console.warn('⚠️ User not found for email:', email)
      return { 
        success: false, 
        message: 'No account found with this email address. Please register for a new account or check that you entered the correct email address.',
        error_code: 'USER_NOT_FOUND'
      }
    }

    // Check if user is already verified
    if (user.email_confirmed_at) {
      return { success: false, message: 'This email is already verified. Please try logging in.' }
    }

    // Check verification attempt limits
    const attemptCheck = await checkVerificationAttempts(user.id)
    if (!attemptCheck.can_resend) {
      return { 
        success: false, 
        message: attemptCheck.message,
        attempts_remaining: attemptCheck.attempts_remaining 
      }
    }

    // Generate new verification token
    const tokenResult = await generateVerificationToken(user.id, email, 'email_verification', {
      resend_attempt: attemptCheck.total_attempts + 1,
      previous_attempts: attemptCheck.total_attempts
    })

    if (!tokenResult.success || !tokenResult.token) {
      return { success: false, message: tokenResult.message || 'Failed to generate verification token' }
    }

    // Send verification email with fresh token
    const emailResult = await sendEnhancedVerificationEmail(email, tokenResult.token, {
      is_resend: true,
      attempts_remaining: attemptCheck.attempts_remaining - 1,
      previous_attempts: attemptCheck.total_attempts
    })

    if (!emailResult.success) {
      return { success: false, message: emailResult.message }
    }

    // Update user profile with new verification attempt
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        verification_attempts: attemptCheck.total_attempts + 1,
        last_verification_attempt: new Date().toISOString(),
        verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.warn('⚠️ Failed to update profile verification attempts:', profileError)
    }

    // Log the resend attempt
    await logVerificationEvent(user.id, 'verification_resend', {
      email,
      token_id: tokenResult.token,
      attempt_number: attemptCheck.total_attempts + 1,
      attempts_remaining: attemptCheck.attempts_remaining - 1
    }, true)

    console.log('✅ Enhanced verification email sent successfully')
    return { 
      success: true, 
      message: 'Verification email sent! Please check your inbox and complete the registration process.',
      token: tokenResult.token,
      attempts_remaining: attemptCheck.attempts_remaining - 1
    }

  } catch (error) {
    console.error('💥 Enhanced resend verification error:', error)
    return { success: false, message: 'Failed to send verification email. Please try again later.' }
  }
}

/**
 * Check verification attempt limits and cooldowns
 */
async function checkVerificationAttempts(userId: string): Promise<{
  can_resend: boolean
  message: string
  total_attempts: number
  attempts_remaining: number
}> {
  try {
    // Get user's current verification attempts
    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_attempts, max_verification_attempts, last_verification_attempt')
      .eq('id', userId)
      .single()

    const totalAttempts = profile?.verification_attempts || 0
    const maxAttempts = profile?.max_verification_attempts || 3
    const lastAttempt = profile?.last_verification_attempt

    // Check if user has exceeded max attempts
    if (totalAttempts >= maxAttempts) {
      return {
        can_resend: false,
        message: 'Maximum verification attempts exceeded. Please contact support.',
        total_attempts: totalAttempts,
        attempts_remaining: 0
      }
    }

    // Check cooldown period (5 minutes between attempts)
    if (lastAttempt) {
      const lastAttemptTime = new Date(lastAttempt).getTime()
      const cooldownEnd = lastAttemptTime + (RESEND_COOLDOWN_MINUTES * 60 * 1000)
      const now = Date.now()

      if (now < cooldownEnd) {
        const remainingMinutes = Math.ceil((cooldownEnd - now) / (60 * 1000))
        return {
          can_resend: false,
          message: `Please wait ${remainingMinutes} minutes before requesting another verification email.`,
          total_attempts: totalAttempts,
          attempts_remaining: maxAttempts - totalAttempts
        }
      }
    }

    return {
      can_resend: true,
      message: '',
      total_attempts: totalAttempts,
      attempts_remaining: maxAttempts - totalAttempts
    }

  } catch (error) {
    console.error('Error checking verification attempts:', error)
    // Allow resend if we can't check attempts (fail open for user experience)
    return {
      can_resend: true,
      message: '',
      total_attempts: 0,
      attempts_remaining: MAX_VERIFICATION_ATTEMPTS
    }
  }
}

/**
 * Send enhanced verification email with resend messaging
 */
async function sendEnhancedVerificationEmail(
  email: string, 
  token: string, 
  options: {
    is_resend?: boolean
    attempts_remaining?: number
    previous_attempts?: number
  } = {}
): Promise<{ success: boolean; message: string }> {
  try {
    const { is_resend = false, attempts_remaining = 0, previous_attempts = 0 } = options
    
    console.log(`📧 Sending ${is_resend ? 'resend' : 'initial'} verification email to:`, email)

    // Build verification URL
    const verificationUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://fixrez.com'}/verify?token=${token}&email=${encodeURIComponent(email)}`

    // Create email content with resend messaging
    const emailContent = {
      subject: is_resend ? 'Complete Your Registration - New Verification Link' : 'Complete Your Registration - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">${is_resend ? 'New Verification Link' : 'Welcome to FixRez!'}</h1>
            ${is_resend ? '<p style="margin: 10px 0 0 0; font-size: 16px;">This is a new verification link as requested</p>' : ''}
          </div>
          
          <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Hello!</h2>
            
            ${is_resend ? `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;"><strong>🔔 New Verification Attempt</strong></p>
                <p style="margin: 5px 0 0 0; color: #856404;">This is a new verification link as requested. Previous verification links have been invalidated for your security.</p>
              </div>
            ` : ''}
            
            <p style="color: #555; line-height: 1.6;">
              ${is_resend ? 'You requested a new verification link to complete your registration.' : 'You\'re almost done! Click the button below to verify your email address and complete your registration.'}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                ${is_resend ? 'Verify Email Address' : 'Complete Registration'}
              </a>
            </div>
            
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1565c0;"><strong>⏰ Important:</strong> This verification link expires in 24 hours.</p>
              ${attempts_remaining > 0 ? `<p style="margin: 5px 0 0 0; color: #1565c0;">You have ${attempts_remaining} verification attempt${attempts_remaining !== 1 ? 's' : ''} remaining.</p>` : ''}
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              If the button doesn\'t work, copy and paste this link into your browser:
              <br>
              <code style="background: #f5f5f5; padding: 5px; border-radius: 3px; word-break: break-all;">${verificationUrl}</code>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              If you didn\'t ${is_resend ? 'request this verification link' : 'create this account'}, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>This email was sent by FixRez - AI-Powered Resume Optimization</p>
          </div>
        </div>
      `,
      text: `
        ${is_resend ? 'NEW VERIFICATION ATTEMPT' : 'WELCOME TO FIXREZ!'}
        
        ${is_resend ? 'This is a new verification link as requested. Previous verification links have been invalidated for your security.' : 'You\'re almost done! Click the link below to verify your email address and complete your registration.'}
        
        Verify your email: ${verificationUrl}
        
        This verification link expires in 24 hours.
        ${attempts_remaining > 0 ? `You have ${attempts_remaining} verification attempt${attempts_remaining !== 1 ? 's' : ''} remaining.` : ''}
        
        If you didn\'t ${is_resend ? 'request this verification link' : 'create this account'}, you can safely ignore this email.
        
        This email was sent by FixRez - AI-Powered Resume Optimization
      `
    }

    // Use Supabase's built-in email service for better deliverability
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: verificationUrl,
        // Custom email template data
        data: {
          verification_url: verificationUrl,
          is_resend,
          attempts_remaining,
          email_content: emailContent
        }
      }
    })

    if (error) {
      console.error('❌ Failed to send verification email:', error)
      return { success: false, message: 'Failed to send verification email' }
    }

    console.log('✅ Verification email sent successfully')
    return { success: true, message: 'Verification email sent successfully' }

  } catch (error) {
    console.error('💥 Error sending verification email:', error)
    return { success: false, message: 'Failed to send verification email' }
  }
}

/**
 * Log verification events for audit trail
 */
async function logVerificationEvent(
  userId: string, 
  action: string, 
  details: Record<string, any>, 
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const clientIp = await getClientIp()
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'server'

    await supabase.from('verification_audit_log').insert({
      user_id: userId,
      action,
      action_by_ip: clientIp,
      action_by_user_agent: userAgent,
      details,
      success,
      error_message: errorMessage
    })

  } catch (error) {
    console.error('Failed to log verification event:', error)
  }
}

/**
 * Generate cryptographically secure random token
 */
function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash token for secure storage
 */
async function hashToken(token: string): Promise<string> {
  // Simple hash implementation - in production, use proper crypto library
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get client IP address
 */
async function getClientIp(): Promise<string | null> {
  // In a real implementation, this would get the actual client IP
  // For now, return null as we're in a client-side context
  return typeof window !== 'undefined' ? 'client-side' : null
}

export { enhancedResendVerification as resendVerification }