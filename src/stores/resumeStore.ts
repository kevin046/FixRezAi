import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { OptimizedResume } from '@/types/resume'

interface ResumeState {
  optimizedResume: OptimizedResume | null
  setOptimizedResume: (resume: OptimizedResume | null) => void
  clear: () => void
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set) => ({
      optimizedResume: null,
      setOptimizedResume: (resume) => set({ optimizedResume: resume }),
      clear: () => set({ optimizedResume: null }),
    }),
    {
      name: 'fixrez-resume',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ optimizedResume: state.optimizedResume }),
    }
  )
)