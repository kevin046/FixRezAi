import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { isVerified, resendVerification } from '@/lib/auth'
import { getApiBase } from '@/lib/http'

interface LoginFormProps {
  onToggle?: () => void
}

export default function LoginForm({ onToggle }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showResendOption, setShowResendOption] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState('')
  const { setUser } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResendSuccess('')

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

      // If not verified, show resend option instead of redirecting
      if (!isVerified(data.user)) {
        setShowResendOption(true)
        setError('Your email is not verified yet. Please check your inbox for the confirmation link, or click below to resend the verification email.')
        return
      }

      // Verified → go Home
      window.location.assign('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      const normalized = msg.toLowerCase()
      if (normalized.includes('email') && normalized.includes('confirm')) {
        setShowResendOption(true)
        setError('Your email is not verified yet. Please check your inbox for the confirmation link, or click below to resend the verification email.')
      } else if (normalized.includes('invalid login credentials')) {
        setError('Incorrect email or password. Please try again.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClearResendOption = () => {
    setShowResendOption(false)
    setError('')
    setResendSuccess('')
  }

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }
    
    setResendLoading(true)
    setResendSuccess('')
    setError('')
    
    try {
      // Since the user is not logged in, use the public endpoint
      const apiBase = getApiBase()
      const resp = await fetch(`${apiBase.replace(/\/$/, '')}/send-verification-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const result = await resp.json()
      
      if (result.success) {
        setResendSuccess(result.message || 'Verification email sent! Please check your inbox.')
        setShowResendOption(false)
      } else {
        setError(result.error || result.message || 'Failed to send verification email.')
      }
    } catch (err) {
      console.error('Failed to send verification email:', err)
      setError('Failed to send verification email. Please try again.')
    } finally {
      setResendLoading(false)
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

      {resendSuccess && (
        <div
          id="resend-success"
          role="alert"
          aria-live="polite"
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
        >
          {resendSuccess}
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
          <div className="text-center">
            <button
              type="button"
              onClick={() => window.location.href = '/forgot-password'}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
            >
              Forgot password?
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

        {showResendOption && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="w-full py-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center"
            >
              {resendLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {resendLoading ? 'Sending...' : 'Resend verification email'}
            </button>
            <button
              type="button"
              onClick={handleClearResendOption}
              className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
            >
              Try a different email or password
            </button>
          </div>
        )}

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