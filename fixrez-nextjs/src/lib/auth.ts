'use client'

import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function isVerified(user: User | null): boolean {
  // Check if user is verified through email confirmation or metadata
  return !!(user?.email_confirmed_at || (user as any)?.user_metadata?.verified)
}

const RESEND_KEY = 'fixrez_resend_verification_at'
const RESEND_COOLDOWN_MS = 300_000 // 5 minutes cooldown to avoid 429s
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

export async function resendVerification(email: string): Promise<{ success: boolean; message: string }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  try {
    const remaining = getResendCooldownRemaining()
    if (remaining > 0) {
      const seconds = Math.ceil(remaining / 1000)
      return { success: false, message: `Please wait ${seconds}s before requesting again.` }
    }
    if (resendInFlight) {
      return { success: false, message: 'A resend request is already in progress. Please wait…' }
    }

    resendInFlight = true

    // Get the origin safely, handling both client and server contexts
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fixrez-ai.com'

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${origin}/verify` }
    })
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('too many') || msg.includes('rate')) {
        // Stamp cooldown now to prevent immediate retries
        try { localStorage.setItem(RESEND_KEY, String(Date.now())) } catch {}
        return { success: false, message: 'Too many requests. Please wait a few minutes and try again.' }
      }
      return { success: false, message: error.message }
    }

    try { localStorage.setItem(RESEND_KEY, String(Date.now())) } catch {}
    return { success: true, message: 'Verification email sent. Check your inbox.' }
  } catch (e) {
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
        await supabase.from('profiles').upsert({ id: user.id, verified: true, updated_at: new Date().toISOString() }, { onConflict: 'id' })
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

    // Note: NextAuth session clearing is handled by the NextAuth signOut method
    // No need to manually clear Zustand store as we're not using it

    const { data: { session: after } } = await supabase.auth.getSession()
    console.info('Session after logout:', !!after)

    return { success: true }
  } catch (error) {
    console.error('❌ Secure logout failed:', error)
    return { success: false, error }
  }
}
