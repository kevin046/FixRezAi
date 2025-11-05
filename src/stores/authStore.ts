import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  hydrated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hydrated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        try {
          localStorage.removeItem('fixrez-auth')
        } catch {}
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'fixrez-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => {
        return () => {
          // Mark hydration complete after persisted state loads
          useAuthStore.setState({ hydrated: true })
        }
      },
    }
  )
)
