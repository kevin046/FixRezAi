import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'

export interface VerificationStatus {
  is_verified: boolean
  verification_timestamp: string | null
  verification_method: string | null
  has_valid_token: boolean
  token_expires_at: string | null
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  verificationStatus: VerificationStatus | null
  hydrated: boolean
  setUser: (user: User | null) => void
  setVerificationStatus: (status: VerificationStatus | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      verificationStatus: null,
      hydrated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setVerificationStatus: (status) => set({ verificationStatus: status }),
      logout: () => {
        try {
          localStorage.removeItem('fixrez-auth')
        } catch {}
        set({ user: null, isAuthenticated: false, verificationStatus: null })
      },
    }),
    {
      name: 'fixrez-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        verificationStatus: state.verificationStatus 
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
