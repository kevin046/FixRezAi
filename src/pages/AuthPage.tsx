import LoginForm from '@/components/LoginForm'
import RegisterForm from '@/components/RegisterForm'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
// Removed LogoutButton import for unauthenticated header

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { user } = useAuthStore()

  // Set initial tab from query string (e.g., /auth?mode=login)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const m = params.get('mode')
      if (m === 'login' || m === 'register') {
        setMode(m)
      }
    } catch { /* no-op */ }
  }, [])

  // If already verified, send to home (App will route to wizard as needed)
  useEffect(() => {
    if (user?.email_confirmed_at) {
      window.location.replace('/')
    }
  }, [user])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
      {/* Top nav minimal for unauthenticated users */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-gray-900/60 border-b border-slate-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = '/')}
              className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800"
            >
              ← Back
            </button>
            <a href="/" className="font-semibold text-slate-900 dark:text-white">FixRez AI</a>
          </div>
          {/* Removed Settings and Logout for unauthenticated header */}
        </div>
      </header>

      {/* Main content - centered card with tabs */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mx-auto w-full max-w-lg">
            <section className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/85 dark:bg-gray-900/60 backdrop-blur shadow-sm p-6 sm:p-8">
              <div className="flex justify-center mb-6">
                <div role="tablist" aria-label="Authentication" className="inline-flex rounded-xl bg-slate-100 dark:bg-gray-800 p-1">
                  <button
                    role="tab"
                    aria-selected={mode === 'login'}
                    className={`px-4 py-2 text-sm rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'}`}
                    onClick={() => setMode('login')}
                  >
                    Sign In
                  </button>
                  <button
                    role="tab"
                    aria-selected={mode === 'register'}
                    className={`px-4 py-2 text-sm rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'}`}
                    onClick={() => setMode('register')}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {mode === 'login' ? (
                  <LoginForm />
                ) : (
                  <RegisterForm />
                )}

                <p className="text-xs text-slate-500 dark:text-gray-400 text-center">
                  Email verification is required to access your dashboard.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer identical to index */}
      <footer className="py-10 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 Summit Pixels Inc.</p>
            <div className="flex items-center gap-6 text-sm">
              <a href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Terms</a>
              <a href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Privacy</a>
              <a href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Contact</a>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 dark:text-gray-300">Powered by Summit Pixels Inc.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
