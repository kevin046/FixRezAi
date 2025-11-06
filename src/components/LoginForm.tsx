import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { isVerified } from '@/lib/auth'

interface LoginFormProps {
  onToggle?: () => void
}

export default function LoginForm({ onToggle }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { setUser } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // Basic client-side validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(email)) {
        setError('Please enter a valid email address.')
        return
      }
      if (!password || password.length < 1) {
        setError('Please enter your password.')
        return
      }

      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      if (!data.user) {
        throw new Error('Login failed. Please try again.')
      }
      setUser(data.user)

      // If not verified, send to Verify page and stop
      if (!isVerified(data.user)) {
        window.location.assign('/verify')
        return
      }

      // Verified → go Home
      window.location.assign('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      const normalized = msg.toLowerCase()
      if (normalized.includes('email') && normalized.includes('confirm')) {
        setError('Your email is not verified yet. Please check your inbox for the confirmation link, then try again.')
      } else if (normalized.includes('invalid login credentials')) {
        setError('Incorrect email or password. Please try again.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sign In</h2>

      {error && (
        <div
          id="login-error"
          role="alert"
          aria-live="polite"
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4" aria-label="Login form">
        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              aria-describedby="login-error"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pl-10 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              aria-required="true"
              aria-describedby="login-error"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <button
          type="button"
          onClick={() => onToggle?.()}
          className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
        >
          Need an account? Register
        </button>
      </form>
    </div>
  )
}
