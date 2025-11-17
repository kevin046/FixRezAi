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
  const [resendAttemptsRemaining, setResendAttemptsRemaining] = useState<number | undefined>()
  const { setUser } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResendSuccess('')

    try {
      // Basic client-side validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!email || !emailPattern.test(email)) {
        setError('Please enter a valid email address.')
        return
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }

      setLoading(true)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (!data.user) {
        throw new Error('No user data returned')
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
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailPattern.test(email)) {
      setError('Please enter a valid email address first.')
      return
    }

    setResendLoading(true)
    setResendSuccess('')
    setError('')
    setResendAttemptsRemaining(undefined)

    try {
      const result = await resendVerification(email)
      if (result.success) {
        setResendSuccess(result.message)
        setShowResendOption(false)
        if (result.attempts_remaining !== undefined) {
          setResendAttemptsRemaining(result.attempts_remaining)
        }
        return
      }
      const msg = (result.message || '').toLowerCase()
      if (msg.includes('no account found')) {
        setError('No account found with this email address. Would you like to register for a new account?')
        setShowResendOption(true)
      } else {
        setError(result.message)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification email.'
      setError(errorMessage)
    } finally {
      setResendLoading(false)
    }
  }

  // OPTION 2: Alternative approach - for authenticated users only
  const handleResendVerificationReauthenticate = async () => {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }
    
    setResendLoading(true)
    setResendSuccess('')
    setError('')
    
    try {
      // This requires the user to be authenticated
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('You must be logged in to use this feature.')
        return
      }

      // Use Supabase's reauthenticate method
      const { error: reauthError } = await supabase.auth.reauthenticate()
      
      if (reauthError) {
        throw reauthError
      }
      
      setResendSuccess('Verification email sent! Please check your inbox.')
      setShowResendOption(false)
    } catch (err) {
      console.error('Failed to send verification email:', err)
      const msg = err instanceof Error ? err.message : 'Failed to send verification email.'
      setError(msg)
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sign In</h2>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
          {error.toLowerCase().includes('no account found') && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onToggle?.()}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline"
              >
                Click here to register for a new account
              </button>
            </div>
          )}
        </div>
      )}

      {resendSuccess && (
        <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg">
          {resendSuccess}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
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
            {error && error.toLowerCase().includes('no account found') ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onToggle?.()}
                  className="w-full py-2 rounded-xl text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition inline-flex items-center justify-center"
                >
                  Register for a new account
                </button>
                <button
                  type="button"
                  onClick={handleClearResendOption}
                  className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleResendVerification} // Use the current approach (RECOMMENDED)
                  disabled={resendLoading}
                  className="w-full py-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center"
                >
                  {resendLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
                
                {resendAttemptsRemaining !== undefined && resendAttemptsRemaining > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {resendAttemptsRemaining} verification attempt{resendAttemptsRemaining !== 1 ? 's' : ''} remaining
                  </div>
                )}
                
                {resendAttemptsRemaining === 0 && (
                  <div className="text-xs text-red-500 dark:text-red-400 text-center">
                    No verification attempts remaining. Please contact support.
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handleClearResendOption}
                  className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                >
                  Try a different email or password
                </button>
              </>
            )}
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
