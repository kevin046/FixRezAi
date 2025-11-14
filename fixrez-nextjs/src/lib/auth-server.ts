import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function isVerified(user: User | null): boolean {
  // Check if user is verified through email confirmation or metadata
  return !!(user?.email_confirmed_at || (user as any)?.user_metadata?.verified)
}

export async function secureLogout(): Promise<{ success: boolean; error?: unknown }> {
  console.info('🔒 Starting secure logout')
  try {
    const { data: { session } } = await supabase.auth.getSession()
    console.info('Current session before logout:', !!session)

    await supabase.auth.signOut()

    return { success: true }
  } catch (error) {
    console.error('❌ Secure logout failed:', error)
    return { success: false, error }
  }
}