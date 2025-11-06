import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

export function isVerified(user: User | null): boolean {
  return !!(user?.email_confirmed_at || (user as any)?.user_metadata?.verified)
}

const RESEND_KEY = 'fixrez_resend_verification_at'
const RESEND_COOLDOWN_MS = 60_000

export async function resendVerification(email: string): Promise<{ success: boolean; message: string }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  try {
    const last = Number(localStorage.getItem(RESEND_KEY) || '0')
    const now = Date.now()
    if (now - last < RESEND_COOLDOWN_MS) {
      const seconds = Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000)
      return { success: false, message: `Please wait ${seconds}s before requesting again.` }
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify` }
    })
    if (error) {
      return { success: false, message: error.message }
    }

    localStorage.setItem(RESEND_KEY, String(now))
    return { success: true, message: 'Verification email sent. Check your inbox.' }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Failed to resend verification email.' }
  }
}

export async function syncVerifiedMetadata(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.email_confirmed_at) {
      // Write a simple metadata flag for client/server checks
      try { await supabase.auth.updateUser({ data: { verified: true } }) } catch {}
      // Also upsert into profiles table for server-side checks
      try {
        await supabase.from('profiles').upsert({ id: user.id, verified: true, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      } catch {}
    }
  } catch (e) {
    console.warn('syncVerifiedMetadata error:', e)
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
