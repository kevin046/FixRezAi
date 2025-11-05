import { useEffect, useState } from 'react'
import LoginForm from '@/components/LoginForm'
import RegisterForm from '@/components/RegisterForm'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { secureLogout } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'

export default function AuthPage() {
  const { user, logout, hydrated } = useAuthStore()
  const initialIsLogin = (() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const mode = params.get('mode')
      return mode !== 'register'
    } catch {
      return true
    }
  })()
  const [isLogin, setIsLogin] = useState(initialIsLogin)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const isVerifiedParam = params.get('verified') === '1'

      const hash = window.location.hash.replace('#', '')
      const hashParams = new URLSearchParams(hash)
      const isSignupType = hashParams.get('type') === 'signup'

      if (isVerifiedParam || isSignupType) {
        setVerified(true)

        if (window.location.hash) {
          const cleanUrl = window.location.pathname + window.location.search
          window.history.replaceState({}, '', cleanUrl)
        }
      }
    } catch {
      // no-op
    }
  }, [])

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handleLogout = async () => {
    const res = await secureLogout()
    if (res.success) {
      window.location.replace('/?logout=1')
    } else {
      window.location.replace('/?logout_error=1')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Navigation Bar */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                aria-label="Go back"
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FixRez AI
              </a>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700 dark:text-gray-300">
                    Welcome, {user.email?.split('@')[0]}
                  </span>
                  <a
                    href="/settings"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    Settings
                  </a>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { window.location.href = '/auth?mode=login' }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { window.location.href = '/auth?mode=register' }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Card */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FixRez AI
              </h1>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Create professional resumes with AI assistance
              </p>
            </div>

        {verified && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 text-green-700 px-4 py-3">
            Email verified successfully. You can now sign in.
          </div>
        )}

        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-full p-1">
            <button
              onClick={() => setIsLogin(true)}
                className={`px-4 py-2 text-sm rounded-full transition ${isLogin ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`px-4 py-2 text-sm rounded-full transition ${!isLogin ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Register
              </button>
            </div>
          </div>

            {isLogin ? (
              <LoginForm onToggle={() => setIsLogin(false)} />
            ) : (
              <RegisterForm onToggle={() => setIsLogin(true)} />
            )}
          </div>
        </div>
      </div>

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
