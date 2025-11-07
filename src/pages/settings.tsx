import React, { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import LogoutButton from '@/components/LogoutButton'
import { isVerified, resendVerification, canResend, getResendCooldownRemaining } from '@/lib/auth'

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore()
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [cooldownMs, setCooldownMs] = useState<number>(getResendCooldownRemaining())

  useEffect(() => {
    const id = setInterval(() => setCooldownMs(getResendCooldownRemaining()), 1000)
    return () => clearInterval(id)
  }, [])

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.assign('/')
    }
  }

  const verified = isVerified(user)
  const email = user?.email || ''

  const handleResend = async () => {
    if (!email) {
      setStatus({ type: 'error', message: 'Please sign in to resend verification.' })
      return
    }
    if (!canResend()) {
      const seconds = Math.ceil(getResendCooldownRemaining() / 1000)
      setStatus({ type: 'error', message: `Please wait ${seconds}s before requesting again.` })
      return
    }
    const result = await resendVerification(email)
    setCooldownMs(getResendCooldownRemaining())
    setStatus({ type: result.success ? 'success' : 'error', message: result.message })
  }

  const cooldownSeconds = Math.ceil(cooldownMs / 1000)
  const resendDisabled = cooldownMs > 0
  const resendLabel = cooldownMs > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend verification email'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation identical to index */}
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
                  <LogoutButton className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" />
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

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Status banner */}
        {status && (
          <div className={`mb-4 p-4 rounded ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {status.message}
          </div>
        )}

        {/* Verification section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Email Verification</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Status: {verified ? 'Verified ✅' : 'Not Verified ❌'}
          </p>
          {!verified && (
            <button
              onClick={handleResend}
              disabled={resendDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {resendLabel}
            </button>
          )}
        </section>

        {/* Account section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Account</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Email: {email}</p>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
