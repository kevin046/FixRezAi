import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { updatePassword } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check if we have a valid session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsValidSession(!!session)
      } catch (e) {
        console.error('Error checking session:', e)
        setIsValidSession(false)
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validation
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const result = await updatePassword(password)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      toast.success(result.message)
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/auth?mode=login'
      }, 3000)
    } else {
      setError(result.message)
      toast.error(result.message)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Checking session...</p>
        </div>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
        <header className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-gray-900/60 border-b border-slate-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <a href="/" className="inline-flex items-center gap-2" aria-label="FixRez AI home">
              <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FixRez AI</span>
            </a>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/85 dark:bg-gray-900/60 backdrop-blur shadow-sm p-6 sm:p-8 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Invalid or Expired Link</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  This password reset link is invalid or has expired. Please request a new password reset link.
                </p>
              </div>
              <button
                onClick={() => window.location.href = '/forgot-password'}
                className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              >
                Request New Reset Link
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-gray-900/60 border-b border-slate-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2" aria-label="FixRez AI home">
            <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FixRez AI</span>
          </a>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mx-auto w-full max-w-lg">
            {success ? (
              <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/85 dark:bg-gray-900/60 backdrop-blur shadow-sm p-6 sm:p-8 text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Password Updated!</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your password has been successfully updated. Redirecting you to the sign in page...
                  </p>
                </div>
              </div>
            ) : (
              <section className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/85 dark:bg-gray-900/60 backdrop-blur shadow-sm p-6 sm:p-8">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Your Password</h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Enter your new password below.
                  </p>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-4" aria-label="Reset password form">
                  {error && (
                    <div
                      id="reset-error"
                      role="alert"
                      aria-live="polite"
                      className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
                    >
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="password">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pl-10 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter new password"
                        aria-describedby="reset-error"
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

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 pl-10 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirm new password"
                        aria-describedby="reset-error"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showConfirmPassword}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />} 
                    {loading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
