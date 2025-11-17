import { supabase } from '@/lib/supabase'
import { getApiBase } from '@/lib/http'
import type { User } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

export function isVerified(user: User | null): boolean {
  // First check enhanced verification status from auth store
  const verificationStatus = useAuthStore.getState().verificationStatus
  if (verificationStatus) {
    return Boolean(verificationStatus.verified ?? (verificationStatus as any).is_verified)
  }
  return !!user?.email_confirmed_at
}

const RESEND_KEY = 'fixrez_resend_verification_at'
const RESEND_COOLDOWN_MS = 5_000
let resendInFlight = false

// Guard variables for verified metadata sync
const SYNC_KEY = 'fixrez_verified_sync_at'
const SYNC_COOLDOWN_MS = 60_000 // 1 minute backoff to avoid 429s
let syncInFlight = false

export function getResendCooldownRemaining(): number {
  try {
    const last = Number(localStorage.getItem(RESEND_KEY) || '0')
    const now = Date.now()
    const remaining = RESEND_COOLDOWN_MS - (now - last)
    return remaining > 0 ? remaining : 0
  } catch {
    return 0
  }
}

export function canResend(): boolean {
  return getResendCooldownRemaining() <= 0 && !resendInFlight
}

export async function resendVerification(email?: string): Promise<{ success: boolean; message: string; attempts_remaining?: number }> {
  try {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' }
    }
    
    // Use Supabase's built-in auth.resend() directly from the client
    const redirectTo = `${window.location.origin}/verify?type=signup`
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: { emailRedirectTo: redirectTo }
    })
    
    if (error) {
      let errorMessage = error.message
      
      if (error.message.includes('User not found')) {
        errorMessage = 'No account found with this email address.'
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.'
      } else if (error.message.includes('already confirmed')) {
        errorMessage = 'This email is already verified. Please try logging in.'
      } else if (error.message.includes('Error sending confirmation email')) {
        errorMessage = 'Email service is temporarily unavailable.'
      }
      
      return { success: false, message: errorMessage }
    }
    
    return { 
      success: true, 
      message: 'Verification email sent! Please check your inbox (and spam folder) for the verification link.'
    }
  } catch (e) {
    console.error('Resend verification error:', e)
    return { success: false, message: 'Failed to send verification email. Please try again.' }
  }
}

export async function syncVerifiedMetadata(): Promise<void> {
  // Concurrency guard
  if (syncInFlight) return
  const now = Date.now()
  const last = Number(localStorage.getItem(SYNC_KEY) || '0')
  if (now - last < SYNC_COOLDOWN_MS) return

  syncInFlight = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Only proceed if email is confirmed
    if (!user.email_confirmed_at) return

    const alreadyVerified = user.user_metadata?.verified === true
    if (alreadyVerified) {
      // No-op if metadata already reflects verification
      localStorage.setItem(SYNC_KEY, String(now))
      return
    }

    // Update auth user metadata once, with error handling
    const { error: updateErr } = await supabase.auth.updateUser({ data: { verified: true } })
    if (updateErr) {
      const msg = (updateErr.message || '').toLowerCase()
      if (msg.includes('too many') || msg.includes('rate')) {
        // Backoff on rate-limit and record last-attempt timestamp
        localStorage.setItem(SYNC_KEY, String(now))
      }
      console.warn('syncVerifiedMetadata updateUser error:', updateErr.message)
    } else {
      // Upsert profiles only after successful metadata update to avoid extra writes
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          verified: true,
          verification_timestamp: new Date().toISOString(),
          verification_method: 'supabase_email',
          // Keep last_verification_attempt_at/verification_expires_at from previous send, only mark verified now
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
      } catch (e) {
        console.warn('profiles upsert error:', e instanceof Error ? e.message : e)
      }
      localStorage.setItem(SYNC_KEY, String(now))
    }
  } finally {
    syncInFlight = false
  }
}

export async function secureLogout(): Promise<{ success: boolean; error?: unknown }> {
  console.info('🔒 Starting secure logout')
  try {
    const { data: { session } } = await supabase.auth.getSession()
    console.info('Current session before logout:', !!session)

    await supabase.auth.signOut()

    // Clear persisted auth and Supabase tokens
    try {
      localStorage.removeItem('fixrez-auth')
      const keysToDelete: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || ''
        if (key.startsWith('sb-')) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach((k) => {
        try {
          localStorage.removeItem(k)
          console.info('🧹 Removed storage key:', k)
        } catch (e) {
          console.warn('Failed to remove storage key:', k, e)
        }
      })
    } catch (storageErr) {
      console.warn('Storage clearing issue:', storageErr)
    }

    // Clear Zustand store
    try {
      useAuthStore.getState().logout()
    } catch (storeErr) {
      console.warn('Auth store logout issue:', storeErr)
    }

    const { data: { session: after } } = await supabase.auth.getSession()
    console.info('Session after logout:', !!after)

    return { success: true }
  } catch (error) {
    console.error('❌ Secure logout failed:', error)
    try { useAuthStore.getState().logout() } catch {}
    return { success: false, error }
  }
}

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  try {
    console.log('🔄 Password reset requested for:', email)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      console.error('❌ Password reset error:', error)
      let errorMessage = error.message
      
      if (error.message.includes('User not found')) {
        errorMessage = 'No account found with this email address.'
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.'
      }
      
      return { success: false, message: errorMessage }
    }

    console.log('✅ Password reset email sent successfully to:', email)
    return { 
      success: true, 
      message: 'Password reset email sent! Please check your inbox (and spam folder) for the reset link.' 
    }
  } catch (e) {
    console.error('❌ Password reset exception:', e)
    return { success: false, message: e instanceof Error ? e.message : 'Failed to send password reset email.' }
  }
}

export async function updatePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' }
  }

  try {
    console.log('🔄 Updating password...')
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('❌ Password update error:', error)
      return { success: false, message: error.message }
    }

    console.log('✅ Password updated successfully')
    return { 
      success: true, 
      message: 'Password updated successfully! You can now sign in with your new password.' 
    }
  } catch (e) {
    console.error('❌ Password update exception:', e)
    return { success: false, message: e instanceof Error ? e.message : 'Failed to update password.' }
  }
}
