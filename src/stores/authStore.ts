import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface VerificationStatus {
  verified: boolean
  verification_timestamp: string | null
  verification_method: string | null
  verification_token_id: string | null
  verification_metadata: Record<string, any> | null
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
  createVerificationToken: (email: string, type?: string) => Promise<string>
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
          
          // Use the new enhanced verification status endpoint
          const response = await fetch(`/api/verification/status/${targetUserId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!response.ok) {
            throw new Error(`Failed to fetch verification status: ${response.statusText}`)
          }
          
          const result = await response.json()
          
          if (result.success) {
            set({ verificationStatus: result.status })
          } else {
            throw new Error(result.error || 'Failed to fetch verification status')
          }
        } catch (error) {
          console.error('Failed to fetch verification status:', error)
          set({ error: error.message })
        } finally {
          set({ isLoading: false })
        }
      },
      
      createVerificationToken: async (email: string, type: string = 'email') => {
        const { user } = get()
        
        if (!user?.id) {
          throw new Error('User not authenticated')
        }
        
        if (!email) {
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
            body: JSON.stringify({ email, type })
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
        } catch (error) {
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
          
          if (result.success) {
            // Refresh verification status after successful verification
            await get().fetchVerificationStatus(user.id)
          } else {
            throw new Error(result.error || 'Verification failed')
          }
        } catch (error) {
          console.error('Email verification failed:', error)
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
            set({ verificationErrors: result.errors })
          } else {
            throw new Error(result.error || 'Failed to fetch verification errors')
          }
        } catch (error) {
          console.error('Failed to fetch verification errors:', error)
          set({ error: error.message })
        } finally {
          set({ isLoading: false })
        }
      },
      
      logout: async () => {
        try {
          await supabase.auth.signOut()
          localStorage.removeItem('fixrez-auth')
          set({ 
            user: null, 
            isAuthenticated: false, 
            verificationStatus: null,
            verificationErrors: [],
            error: null
          })
        } catch (error) {
          console.error('Logout failed:', error)
          set({ error: error.message })
        }
      },
      
      clearError: () => set({ error: null })
    }),
    {
      name: 'fixrez-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        verificationStatus: state.verificationStatus,
        verificationErrors: state.verificationErrors
      }),
      onRehydrateStorage: () => {
        return () => {
          // Mark hydration complete after persisted state loads
          useAuthStore.setState({ hydrated: true })
        }
      },
    }
  )
)
