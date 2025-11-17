/**
 * Comprehensive Email Verification System
 * Handles registration verification, re-verification, and user access controls
 */

import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { logSecurityEvent, calculateRiskScore } from '@/lib/verificationAnalytics'

// Configuration constants
const VERIFICATION_CONFIG = {
  TOKEN_EXPIRY_HOURS: 24,
  MAX_RESEND_ATTEMPTS_PER_HOUR: 3,
  RESEND_COOLDOWN_MINUTES: 20,
  VERIFICATION_LINK_EXPIRY_HOURS: 24,
  CLEANUP_INTERVAL_HOURS: 7 * 24, // 7 days
  RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  MAX_RATE_LIMIT_ATTEMPTS: 10
} as const

// Enhanced interfaces
export interface VerificationToken {
  id: string
  user_id: string
  token_hash: string
  token_type: 'email_verification' | 'password_reset'
  expires_at: string
  used_at: string | null
  created_at: string
  created_by_ip: string | null
  metadata: VerificationTokenMetadata
  attempts: number
  max_attempts: number
}

export interface VerificationTokenMetadata {
  email: string
  generation_method: 'registration' | 'resend_verification' | 'admin'
  previous_tokens_invalidated?: boolean
  resend_attempt?: number
  previous_attempts?: number
  user_agent?: string
  ip_address?: string
}

export interface VerificationAuditLog {
  id: string
  user_id: string
  action: VerificationAction
  action_timestamp: string
  action_by_ip: string | null
  action_by_user_agent: string | null
  verification_token_id: string | null
  details: Record<string, any>
  success: boolean
  error_message: string | null
}

export type VerificationAction = 
  | 'registration_initiated'
  | 'verification_email_sent'
  | 'verification_email_resend'
  | 'verification_attempt'
  | 'verification_success'
  | 'verification_failed'
  | 'token_created'
  | 'token_used'
  | 'token_expired'
  | 'rate_limit_exceeded'

export interface VerificationResult {
  success: boolean
  message: string
  token?: string
  attempts_remaining?: number
  expires_at?: string
  error_code?: VerificationErrorCode
  user_action_required?: UserAction
}

export type VerificationErrorCode = 
  | 'USER_NOT_FOUND'
  | 'ALREADY_VERIFIED'
  | 'MAX_ATTEMPTS_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'SYSTEM_ERROR'
  | 'INVALID_INPUT'

export type UserAction = 
  | 'REGISTER_NEW_ACCOUNT'
  | 'CONTACT_SUPPORT'
  | 'TRY_AGAIN_LATER'
  | 'CHECK_EMAIL'
  | 'LOGIN_INSTEAD'

/**
 * Generate cryptographically secure verification token
 */
function generateSecureToken(length: number = 64): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash token for secure storage
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get client IP address (client-side approximation)
 */
function getClientInfo(): { ip: string | null; userAgent: string | null } {
  return {
    ip: typeof window !== 'undefined' ? 'client-side' : null,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null
  }
}

/**
 * Log verification events for audit trail
 */
async function logVerificationEvent(
  userId: string, 
  action: VerificationAction, 
  details: Record<string, any>, 
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const clientInfo = getClientInfo()
    
    await supabase.from('verification_audit_log').insert({
      user_id: userId,
      action,
      action_by_ip: clientInfo.ip,
      action_by_user_agent: clientInfo.userAgent,
      details,
      success,
      error_message: errorMessage
    })

  } catch (error) {
    console.error('Failed to log verification event:', error)
  }
}

/**
 * Check rate limiting for verification attempts
 */
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean
  remainingAttempts: number
  resetTime: Date
  message: string
}> {
  try {
    const windowStart = new Date(Date.now() - VERIFICATION_CONFIG.RATE_LIMIT_WINDOW_MS)
    
    const { data: attempts, error } = await supabase
      .from('verification_audit_log')
      .select('action_timestamp')
      .eq('user_id', userId)
      .eq('action', 'verification_attempt')
      .gte('action_timestamp', windowStart.toISOString())

    if (error) {
      console.warn('Rate limit check failed:', error)
      // Fail open for user experience
      return {
        allowed: true,
        remainingAttempts: VERIFICATION_CONFIG.MAX_RATE_LIMIT_ATTEMPTS,
        resetTime: new Date(Date.now() + VERIFICATION_CONFIG.RATE_LIMIT_WINDOW_MS),
        message: ''
      }
    }

    const attemptCount = attempts?.length || 0
    const remaining = Math.max(0, VERIFICATION_CONFIG.MAX_RATE_LIMIT_ATTEMPTS - attemptCount)
    const resetTime = new Date(Date.now() + VERIFICATION_CONFIG.RATE_LIMIT_WINDOW_MS)

    return {
      allowed: remaining > 0,
      remainingAttempts: remaining,
      resetTime,
      message: remaining === 0 ? 'Too many verification attempts. Please try again later.' : ''
    }

  } catch (error) {
    console.error('Rate limit check error:', error)
    return {
      allowed: true,
      remainingAttempts: VERIFICATION_CONFIG.MAX_RATE_LIMIT_ATTEMPTS,
      resetTime: new Date(Date.now() + VERIFICATION_CONFIG.RATE_LIMIT_WINDOW_MS),
      message: ''
    }
  }
}

/**
 * Check resend rate limiting (3 per hour)
 */
async function checkResendRateLimit(email: string): Promise<{
  allowed: boolean
  remainingAttempts: number
  nextResendTime: Date
  message: string
}> {
  try {
    const windowStart = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    
    const { data: resends, error } = await supabase
      .from('verification_audit_log')
      .select('action_timestamp')
      .eq('details->>email', email)
      .eq('action', 'verification_email_resend')
      .gte('action_timestamp', windowStart.toISOString())

    if (error) {
      console.warn('Resend rate limit check failed:', error)
      return {
        allowed: true,
        remainingAttempts: VERIFICATION_CONFIG.MAX_RESEND_ATTEMPTS_PER_HOUR,
        nextResendTime: new Date(),
        message: ''
      }
    }

    const resendCount = resends?.length || 0
    const remaining = Math.max(0, VERIFICATION_CONFIG.MAX_RESEND_ATTEMPTS_PER_HOUR - resendCount)
    
    if (remaining === 0) {
      const oldestResend = new Date(resends?.[0]?.action_timestamp)
      const nextResendTime = new Date(oldestResend.getTime() + 60 * 60 * 1000)
      
      return {
        allowed: false,
        remainingAttempts: 0,
        nextResendTime,
        message: `Maximum resend attempts reached. Please try again in ${Math.ceil((nextResendTime.getTime() - Date.now()) / 60000)} minutes.`
      }
    }

    return {
      allowed: true,
      remainingAttempts: remaining,
      nextResendTime: new Date(),
      message: ''
    }

  } catch (error) {
    console.error('Resend rate limit check error:', error)
    return {
      allowed: true,
      remainingAttempts: VERIFICATION_CONFIG.MAX_RESEND_ATTEMPTS_PER_HOUR,
      nextResendTime: new Date(),
      message: ''
    }
  }
}

/**
 * Generate and store verification token for registration
 */
export async function generateRegistrationVerificationToken(
  userId: string, 
  email: string,
  metadata: Partial<VerificationTokenMetadata> = {}
): Promise<{ success: boolean; token?: string; message?: string }> {
  try {
    console.log(`🔑 Generating registration verification token for user:`, userId)
    
    // Generate a secure random token
    const token = generateSecureToken(64)
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + VERIFICATION_CONFIG.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    
    const clientInfo = getClientInfo()
    
    // Start transaction to invalidate old tokens and create new one
    const { data: newToken, error: tokenError } = await supabase
      .from('verification_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        token_type: 'email_verification',
        expires_at: expiresAt.toISOString(),
        created_by_ip: clientInfo.ip,
        metadata: {
          email,
          generation_method: 'registration',
          user_agent: clientInfo.userAgent,
          ip_address: clientInfo.ip,
          ...metadata
        },
        attempts: 0,
        max_attempts: 3
      })
      .select()
      .single()

    if (tokenError) {
      console.error('❌ Failed to create verification token:', tokenError)
      return { 
        success: false, 
        message: 'Failed to generate verification token. Please try again.' 
      }
    }

    // Invalidate all previous unused tokens for this user and type
    const { error: invalidateError } = await supabase
      .from('verification_tokens')
      .update({ 
        used_at: new Date().toISOString(),
        metadata: {
          invalidated_by: 'new_registration_token',
          invalidated_at: new Date().toISOString(),
          new_token_id: newToken.id
        }
      })
      .eq('user_id', userId)
      .eq('token_type', 'email_verification')
      .is('used_at', null)
      .neq('id', newToken.id)

    if (invalidateError) {
      console.warn('⚠️ Failed to invalidate previous tokens:', invalidateError)
    }

    // Log the token generation
    await logVerificationEvent(userId, 'token_created', {
      token_id: newToken.id,
      token_type: 'email_verification',
      expires_at: expiresAt.toISOString(),
      previous_tokens_invalidated: true
    }, true)

    console.log('✅ Registration verification token generated successfully:', newToken.id)
    return { 
      success: true, 
      token,
      message: 'Verification token generated successfully'
    }

  } catch (error) {
    console.error('💥 Error generating registration verification token:', error)
    return { 
      success: false, 
      message: 'Internal error generating verification token. Please try again.' 
    }
  }
}

/**
 * Send registration verification email with enhanced template
 */
export async function sendRegistrationVerificationEmail(
  email: string, 
  token: string,
  userData: { firstName?: string; lastName?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`📧 Sending registration verification email to:`, email)

    // Build secure verification URL
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://fixrez.com'
    
    const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

    // Create professional email content
    const emailContent = {
      subject: 'Welcome to FixRez! Confirm Your Email Address',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirm Your Email - FixRez</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to FixRez!</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">AI-Powered Resume Optimization</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Hello${userData.firstName ? ` ${userData.firstName}` : ''}!</h2>
              
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;">
                Thank you for joining FixRez! To complete your registration and unlock all features, 
                please confirm your email address by clicking the button below.
              </p>
              
              <!-- Verification Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${verificationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;"
                   onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 15px -3px rgba(102, 126, 234, 0.4)'"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(102, 126, 234, 0.3)'">
                  Confirm Your Email Address
                </a>
              </div>
              
              <!-- Important Info -->
              <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; color: #0c4a6e; font-weight: 600; margin-bottom: 8px;">⏰ Important:</p>
                <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
                  This verification link expires in 24 hours and can only be used once for security reasons.
                </p>
              </div>
              
              <!-- Alternative Link -->
              <p style="color: #6b7280; font-size: 14px; margin: 25px 0;">
                If the button doesn't work, copy and paste this link into your browser:
                <br>
                <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; word-break: break-all; font-family: 'Monaco', 'Menlo', monospace; font-size: 12px; display: block; margin-top: 8px;">${verificationUrl}</code>
              </p>
              
              <!-- Security Note -->
              <p style="color: #6b7280; font-size: 14px; margin: 25px 0;">
                If you didn't create this account, you can safely ignore this email. No account will be created without email verification.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                This email was sent by FixRez - AI-Powered Resume Optimization
                <br>
                <a href="${baseUrl}" style="color: #667eea; text-decoration: none;">${baseUrl.replace('https://', '')}</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to FixRez - AI-Powered Resume Optimization!

Hello${userData.firstName ? ` ${userData.firstName}` : ''}!

Thank you for joining FixRez! To complete your registration and unlock all features, please confirm your email address.

Confirm your email: ${verificationUrl}

⚠️ Important: This verification link expires in 24 hours and can only be used once for security reasons.

If the link doesn't work, copy and paste this URL into your browser:
${verificationUrl}

If you didn't create this account, you can safely ignore this email. No account will be created without email verification.

This email was sent by FixRez - AI-Powered Resume Optimization
${baseUrl}
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
          email_content: emailContent,
          template_type: 'registration_verification'
        }
      }
    })

    if (error) {
      console.error('❌ Failed to send registration verification email:', error)
      return { 
        success: false, 
        message: 'Failed to send verification email. Please try again.' 
      }
    }

    // Log the email sending event
    await logVerificationEvent(userId, 'verification_email_sent', {
      email,
      template_type: 'registration',
      verification_url: verificationUrl
    }, true)

    // Log security event for verification email sent
    await logSecurityEvent('verification_sent', userId, email, {
      template_type: 'registration',
      verification_url: verificationUrl
    }, 0)

    console.log('✅ Registration verification email sent successfully')
    return { 
      success: true, 
      message: 'Verification email sent successfully! Please check your inbox.' 
    }

  } catch (error) {
    console.error('💥 Error sending registration verification email:', error)
    return { 
      success: false, 
      message: 'Failed to send verification email. Please try again later.' 
    }
  }
}

/**
 * Complete registration verification process
 */
export async function completeRegistrationVerification(
  token: string,
  email: string
): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    console.log(`🔍 Completing registration verification for:`, email)
    
    // Hash the token for database lookup
    const tokenHash = await hashToken(token)
    
    // Find the token in database
    const { data: verificationToken, error: tokenError } = await supabase
      .from('verification_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('token_type', 'email_verification')
      .is('used_at', null)
      .single()

    if (tokenError || !verificationToken) {
      console.warn('❌ Invalid or expired verification token')
      
      // Log security event for invalid token attempt
      await logSecurityEvent('invalid_token', 'unknown', email, {
        token_hash: tokenHash,
        reason: 'token_not_found'
      }, 20)
      
      return { 
        success: false, 
        message: 'Invalid or expired verification link. Please request a new verification email.' 
      }
    }

    // Check if token is expired
    const expiresAt = new Date(verificationToken.expires_at)
    if (expiresAt < new Date()) {
      console.warn('❌ Verification token expired')
      
      // Mark token as expired
      await supabase
        .from('verification_tokens')
        .update({ 
          used_at: new Date().toISOString(),
          metadata: {
            ...verificationToken.metadata,
            used_reason: 'expired'
          }
        })
        .eq('id', verificationToken.id)

      await logVerificationEvent(verificationToken.user_id, 'token_expired', {
        token_id: verificationToken.id,
        expired_at: expiresAt.toISOString()
      }, false, 'Token expired')

      // Log security event for expired token attempt
      await logSecurityEvent('token_expired', verificationToken.user_id, email, {
        token_id: verificationToken.id,
        expired_at: expiresAt.toISOString(),
        attempted_at: new Date().toISOString()
      }, 10)

      return { 
        success: false, 
        message: 'This verification link has expired. Please request a new verification email.' 
      }
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, email_confirmed_at, user_metadata')
      .eq('id', verificationToken.user_id)
      .single()

    if (userError || !user) {
      console.error('❌ User not found for verification token')
      return { 
        success: false, 
        message: 'Account not found. Please register again.' 
      }
    }

    // Check if user is already verified
    if (user.email_confirmed_at) {
      console.log('✅ User already verified')
      
      // Mark token as used
      await supabase
        .from('verification_tokens')
        .update({ 
          used_at: new Date().toISOString(),
          metadata: {
            ...verificationToken.metadata,
            used_reason: 'already_verified'
          }
        })
        .eq('id', verificationToken.id)

      return { 
        success: true, 
        message: 'Your email is already verified. You can now log in.' 
      }
    }

    // Mark verification token as used
    const { error: markUsedError } = await supabase
      .from('verification_tokens')
      .update({ 
        used_at: new Date().toISOString(),
        metadata: {
          ...verificationToken.metadata,
          used_reason: 'verification_success',
          verified_email: email
        }
      })
      .eq('id', verificationToken.id)

    if (markUsedError) {
      console.error('❌ Failed to mark token as used:', markUsedError)
      return { 
        success: false, 
        message: 'Verification failed. Please try again.' 
      }
    }

    // Log successful verification
    await logVerificationEvent(user.id, 'verification_success', {
      token_id: verificationToken.id,
      verified_email: email,
      verification_method: 'email_token'
    }, true)

    // Log security event for successful verification
    await logSecurityEvent('verification_completed', user.id, email, {
      token_id: verificationToken.id,
      verification_method: 'email_token',
      time_to_verification: new Date().getTime() - new Date(verificationToken.created_at).getTime()
    }, 0)

    console.log('✅ Registration verification completed successfully')
    return { 
      success: true, 
      message: 'Email verified successfully! You can now log in to your account.',
      user: user as User
    }

  } catch (error) {
    console.error('💥 Error completing registration verification:', error)
    return { 
      success: false, 
      message: 'Verification failed. Please try again or contact support.' 
    }
  }
}

/**
 * Enhanced resend verification with comprehensive rate limiting
 */
export async function resendRegistrationVerification(
  email: string
): Promise<VerificationResult> {
  try {
    console.log('🔄 Enhanced resend verification requested for:', email)
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { 
        success: false, 
        message: 'Please enter a valid email address.',
        error_code: 'INVALID_INPUT'
      }
    }

    // Check resend rate limiting
    const rateLimitCheck = await checkResendRateLimit(email)
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        message: rateLimitCheck.message,
        error_code: 'RATE_LIMIT_EXCEEDED',
        user_action_required: 'TRY_AGAIN_LATER'
      }
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
        message: 'No account found with this email address. Please register for a new account.',
        error_code: 'USER_NOT_FOUND',
        user_action_required: 'REGISTER_NEW_ACCOUNT'
      }
    }

    // Check if user is already verified
    if (user.email_confirmed_at) {
      return { 
        success: false, 
        message: 'This email is already verified. Please try logging in instead.',
        error_code: 'ALREADY_VERIFIED',
        user_action_required: 'LOGIN_INSTEAD'
      }
    }

    // Generate new verification token
    const tokenResult = await generateRegistrationVerificationToken(user.id, email, {
      resend_attempt: (rateLimitCheck.remainingAttempts - 1) + 1,
      previous_attempts: (rateLimitCheck.remainingAttempts - 1)
    })

    if (!tokenResult.success || !tokenResult.token) {
      return { 
        success: false, 
        message: tokenResult.message || 'Failed to generate verification token.',
        error_code: 'SYSTEM_ERROR'
      }
    }

    // Send verification email with fresh token
    const emailResult = await sendRegistrationVerificationEmail(email, tokenResult.token, {
      firstName: user.user_metadata?.first_name,
      lastName: user.user_metadata?.last_name
    })

    if (!emailResult.success) {
      return { 
        success: false, 
        message: emailResult.message,
        error_code: 'SYSTEM_ERROR'
      }
    }

    // Log the resend attempt
    await logVerificationEvent(user.id, 'verification_email_resend', {
      email,
      token_id: tokenResult.token,
      attempts_remaining: rateLimitCheck.remainingAttempts - 1
    }, true)

    // Log security event for verification email resent
    await logSecurityEvent('verification_sent', user.id, email, {
      template_type: 'resend_verification',
      token_id: tokenResult.token,
      resend_attempt: (rateLimitCheck.remainingAttempts - 1) + 1,
      previous_attempts: (rateLimitCheck.remainingAttempts - 1)
    }, 0)

    console.log('✅ Enhanced verification email sent successfully')
    return { 
      success: true, 
      message: 'Verification email sent! Please check your inbox and complete the registration process.',
      token: tokenResult.token,
      attempts_remaining: rateLimitCheck.remainingAttempts - 1,
      expires_at: new Date(Date.now() + VERIFICATION_CONFIG.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
    }

  } catch (error) {
    console.error('💥 Enhanced resend verification error:', error)
    return { 
      success: false, 
      message: 'Failed to send verification email. Please try again later.',
      error_code: 'SYSTEM_ERROR',
      user_action_required: 'TRY_AGAIN_LATER'
    }
  }
}

/**
 * Check user verification status with detailed information
 */
export async function getUserVerificationStatus(userId: string): Promise<{
  success: boolean
  is_verified: boolean
  verification_timestamp: string | null
  verification_method: string | null
  has_valid_token: boolean
  token_expires_at: string | null
  attempts_remaining: number
  can_attempt_verification: boolean
  error?: string
}> {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, email_confirmed_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return {
        success: false,
        is_verified: false,
        verification_timestamp: null,
        verification_method: null,
        has_valid_token: false,
        token_expires_at: null,
        attempts_remaining: 0,
        can_attempt_verification: false,
        error: 'User not found'
      }
    }

    // Check for active verification tokens
    const { data: activeTokens, error: tokenError } = await supabase
      .from('verification_tokens')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('token_type', 'email_verification')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    const hasValidToken = activeTokens && activeTokens.length > 0
    const tokenExpiresAt = hasValidToken ? activeTokens[0].expires_at : null

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(userId)

    return {
      success: true,
      is_verified: !!user.email_confirmed_at,
      verification_timestamp: user.email_confirmed_at,
      verification_method: user.email_confirmed_at ? 'email' : null,
      has_valid_token: hasValidToken,
      token_expires_at: tokenExpiresAt,
      attempts_remaining: rateLimitCheck.remainingAttempts,
      can_attempt_verification: rateLimitCheck.allowed
    }

  } catch (error) {
    console.error('Error getting user verification status:', error)
    return {
      success: false,
      is_verified: false,
      verification_timestamp: null,
      verification_method: null,
      has_valid_token: false,
      token_expires_at: null,
      attempts_remaining: 0,
      can_attempt_verification: false,
      error: error.message
    }
  }
}

// Export enhanced functions with backward compatibility
export { resendRegistrationVerification as resendVerification }