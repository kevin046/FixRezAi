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

export async function resendVerification(email?: string): Promise<{ success: boolean; message: string; token?: string }> {
  // Try to get email from current user if not provided
  let targetEmail = email
  
  if (!targetEmail) {
    const { data: { user } } = await supabase.auth.getUser()
    targetEmail = user?.email || (user?.user_metadata as any)?.email
    
    if (!targetEmail) {
      return { success: false, message: 'Unable to determine your email address. Please ensure you are logged in.' }
    }
  }
  
  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  try {
    console.log('🔄 Resend verification requested for:', targetEmail)
    const remaining = getResendCooldownRemaining()
    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000)
      return { success: false, message: `Please wait ${seconds}s before requesting again.` }
    }
    if (resendInFlight) {
      return { success: false, message: 'A resend request is already in progress. Please wait…' }
    }

    resendInFlight = true

    const { error: reauthErr } = await supabase.auth.reauthenticate()
    if (!reauthErr) {
      try { localStorage.setItem(RESEND_KEY, String(Date.now())) } catch {}
      return { success: true, message: 'Verification email sent. Check your inbox.' }
    }

    // Get the current session for authentication (if available)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    // If no token, we can still try to resend verification for unauthenticated users
    if (!token) {
      console.warn('⚠️ No session token found - attempting unauthenticated verification resend')
    }

    console.log('📧 Calling backend API to resend verification email for:', targetEmail)
    const apiBase = getApiBase()
    const resp = await fetch(`${apiBase.replace(/\/$/, '')}/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ email: targetEmail })
    })

    let payload: any = null
    try { 
      payload = await resp.json() 
    } catch (e) {
      console.error('❌ Failed to parse response:', e)
    }

    if (!resp.ok || !payload?.success) {
      const errorMsg = payload?.error || payload?.message || resp.statusText || 'Failed to send verification email'
      console.error('❌ Backend API error:', errorMsg)
      console.error('Response status:', resp.status)
      console.error('Response payload:', payload)
      
      // Provide more helpful error messages
      let errorMessage = errorMsg
      if (errorMsg.includes('not found') || errorMsg.includes('User not found')) {
        errorMessage = 'No account found with this email address. Please sign up first.'
      } else if (errorMsg.includes('already verified') || errorMsg.includes('verified')) {
        errorMessage = 'This email is already verified.'
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.'
      } else if (errorMsg.includes('not configured') || errorMsg.includes('Server not configured')) {
        errorMessage = 'Email service is not configured. Please contact support.'
      }
      
      return { success: false, message: errorMessage }
    }

    // Success - update cooldown
    try { localStorage.setItem(RESEND_KEY, String(Date.now())) } catch {}
    console.log('✅ Verification email sent successfully to:', targetEmail)
    console.log('📬 Response:', payload)
    return { success: true, message: payload?.message || `Verification email sent successfully to ${targetEmail}! Please check your inbox (and spam folder) for the verification link. Click the link to verify your email address.` }
  } catch (e) {
    console.error('❌ Resend verification exception:', e)
    return { success: false, message: e instanceof Error ? e.message : 'Failed to resend verification email.' }
  } finally {
    resendInFlight = false
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