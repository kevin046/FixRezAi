import { useState } from 'react'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import { sendPasswordResetEmail } from '@/lib/auth'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Basic validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    const result = await sendPasswordResetEmail(email)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      toast.success(result.message)
    } else {
      setError(result.message)
      toast.error(result.message)
    }
  }

  const handleBackToLogin = () => {
    window.location.href = '/auth?mode=login'
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-gray-900/60 border-b border-slate-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToLogin}
              className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <a href="/" className="inline-flex items-center gap-2" aria-label="FixRez AI home">
              <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FixRez AI</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mx-auto w-full max-w-lg">
            <section className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/85 dark:bg-gray-900/60 backdrop-blur shadow-sm p-6 sm:p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Forgot Password?</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {success ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                    <p className="font-medium">Check your email!</p>
                    <p className="text-sm mt-1">
                      We've sent a password reset link to <strong>{email}</strong>. 
                      Please check your inbox (and spam folder) and click the link to reset your password.
                    </p>
                  </div>
                  <button
                    onClick={handleBackToLogin}
                    className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4" aria-label="Password reset form">
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
                    <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="email">
                      Email Address
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
                        aria-describedby="reset-error"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />} 
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}