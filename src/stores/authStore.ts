import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getApiBase } from '@/lib/http'

export interface VerificationStatus {
  verified: boolean
  verification_timestamp: string | null
  verification_method: string | null
  verification_token_id: string | null
  verification_metadata: Record<string, any> | null
  // Optional fields used by settings page and enhanced services
  has_valid_token?: boolean
  token_expires_at?: string | null
}

export interface VerificationError {
  id: string
  user_id: string
  error_type: string
  error_message: string
  context: Record<string, any> | null
  created_at: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  verificationStatus: VerificationStatus | null
  verificationErrors: VerificationError[]
  isLoading: boolean
  error: string | null
  hydrated: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setVerificationStatus: (status: VerificationStatus | null) => void
  fetchVerificationStatus: (userId?: string) => Promise<void>
  createVerificationToken: (email?: string, type?: string) => Promise<string>
  verifyEmail: (token: string, type?: string) => Promise<void>
  fetchVerificationErrors: (userId?: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      verificationStatus: null,
      verificationErrors: [],
      isLoading: false,
      error: null,
      hydrated: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setVerificationStatus: (status) => set({ verificationStatus: status }),
      
      fetchVerificationStatus: async (userId?: string) => {
        const { user } = get()
        const targetUserId = userId || user?.id
        
        if (!targetUserId) {
          set({ error: 'No user ID provided' })
          return
        }
        
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No authentication session found')
          }
          
          // Use the current-user verification status endpoint
          const apiBase = getApiBase()
          const response = await fetch(`${apiBase}/verification/status`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          let result: any = null
          try {
            result = await response.json()
          } catch {}
          if (response.ok && result?.success) {
            const s = result.status || {}
            set({ verificationStatus: {
              verified: Boolean(s.is_verified ?? s.verified ?? false),
              verification_timestamp: s.verification_timestamp ?? null,
              verification_method: s.verification_method ?? null,
              verification_token_id: s.verification_token_id ?? null,
              verification_metadata: null,
              has_valid_token: Boolean(s.has_valid_token ?? false),
              token_expires_at: s.token_expires_at ?? null
            } })
          } else {
            const msg = (result?.error || response.statusText || 'Failed to fetch verification status')
            set({ error: msg })
          }
        } catch (error: any) {
          console.error('Failed to fetch verification status:', error)
          set({ error: error.message })
        } finally {
          set({ isLoading: false })
        }
      },
      
      // Relaxed signature: email optional, type defaults to 'email'. If email omitted, use current user's email.
      createVerificationToken: async (email?: string, type: string = 'email') => {
        const { user } = get()
        
        if (!user?.id) {
          throw new Error('User not authenticated')
        }
        
        const finalEmail = email || user.email || (user.user_metadata as any)?.email
        
        if (!finalEmail) {
          throw new Error('Email is required')
        }
        
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No authentication session found')
          }
          
          const response = await fetch('/api/verification/create-token', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: finalEmail, type })
          })
          
          if (!response.ok) {
            throw new Error(`Failed to create token: ${response.statusText}`)
          }
          
          const result = await response.json()
          
          if (result.success) {
            return result.token
          } else {
            throw new Error(result.error || 'Failed to create verification token')
          }
        } catch (error: any) {
          console.error('Failed to create verification token:', error)
          set({ error: error.message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      verifyEmail: async (token: string, type: string = 'email') => {
        const { user } = get()
        
        if (!user?.id) {
          throw new Error('User not authenticated')
        }
        
        if (!token) {
          throw new Error('Token is required')
        }
        
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No authentication session found')
          }
          
          const response = await fetch('/api/verification/verify-token', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, type })
          })
          
          if (!response.ok) {
            throw new Error(`Verification failed: ${response.statusText}`)
          }
          
          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || 'Verification failed')
          }
          
          // Refresh status after verification
          await get().fetchVerificationStatus(user.id)
        } catch (error: any) {
          console.error('Failed to verify token:', error)
          set({ error: error.message })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      fetchVerificationErrors: async (userId?: string) => {
        const { user } = get()
        const targetUserId = userId || user?.id
        
        if (!targetUserId) {
          set({ error: 'No user ID provided' })
          return
        }
        
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No authentication session found')
          }
          
          const response = await fetch(`/api/verification/errors/${targetUserId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!response.ok) {
            throw new Error(`Failed to fetch verification errors: ${response.statusText}`)
          }
          
          const result = await response.json()
          
          if (result.success) {
            set({ verificationErrors: result.errors || [] })
          } else {
            throw new Error(result.error || 'Failed to fetch verification errors')
          }
        } catch (error: any) {
          console.error('Failed to fetch verification errors:', error)
          set({ error: error.message })
        } finally {
          set({ isLoading: false })
        }
      },
      
      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false, verificationStatus: null })
      },
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        verificationStatus: state.verificationStatus,
        hydrated: state.hydrated
      })
    }
  )
)
