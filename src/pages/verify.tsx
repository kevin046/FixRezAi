import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isVerified, resendVerification, secureLogout, syncVerifiedMetadata, canResend, getResendCooldownRemaining } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getApiBase } from '@/lib/http'

export default function VerifyPage() {
  const { user } = useAuthStore()
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldownMs, setCooldownMs] = useState<number>(getResendCooldownRemaining())
  const email = user?.email || ''

  useEffect(() => {
    const id = setInterval(() => setCooldownMs(getResendCooldownRemaining()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      // If arriving with our JWT token in query, forward to backend verifier
      const qs = new URLSearchParams(window.location.search)
      const token = qs.get('token')
      if (token) {
        const apiBase = getApiBase()
        const verifyUrl = `${apiBase}/verify?token=${encodeURIComponent(token)}`
        window.location.assign(verifyUrl)
        return
      }
    } catch {}

    // If arriving from Supabase email link, it appends a hash with type=signup and tokens
    // Clean the hash from the URL for a nicer UX. Also, defensively hydrate session.
    try {
      const hash = window.location.hash.replace('#', '')
      const hashParams = new URLSearchParams(hash)
      const type = hashParams.get('type')
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')

      // Fallback: if tokens are present, set the session explicitly
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
          if (error) {
            console.warn('Supabase setSession error:', error.message)
          }
          const { data: { user: fresh } } = await supabase.auth.getUser()
          if (fresh && isVerified(fresh)) {
            // Persist a metadata flag to simplify downstream checks
            await syncVerifiedMetadata()
            setStatus({ type: 'success', message: 'Email verified successfully. Redirecting…' })
            setTimeout(() => { window.location.replace('/') }, 800)
          }
          // Clean the hash from the URL
          const cleanUrl = window.location.pathname + window.location.search
          window.history.replaceState({}, '', cleanUrl)
        })
        return
      }

      if (type === 'signup') {
        // Give Supabase a moment to hydrate the session, then reflect verified state
        setTimeout(async () => {
          const { data: { user: fresh } } = await supabase.auth.getUser()
          if (fresh && isVerified(fresh)) {
            await syncVerifiedMetadata()
            setStatus({ type: 'success', message: 'Email verified successfully. Redirecting…' })
            setTimeout(() => { window.location.replace('/') }, 800)
          }
          // Clean the hash from the URL
          const cleanUrl = window.location.pathname + window.location.search
          window.history.replaceState({}, '', cleanUrl)
        }, 300)
      }
    } catch { /* no-op */ }
  }, [])

  // If user is verified, do not show verify page
  useEffect(() => {
    if (user && isVerified(user)) {
      window.location.replace('/')
    }
  }, [user])

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handleResend = async () => {
    if (!email) {
      setStatus({ type: 'error', message: 'Please sign in and provide your email to resend verification.' })
      return
    }
    if (!canResend()) {
      const seconds = Math.ceil(getResendCooldownRemaining() / 1000)
      setStatus({ type: 'error', message: `Please wait ${seconds}s before requesting again.` })
      return
    }
    setLoading(true)
    setStatus({ type: 'success', message: 'Sending verification email…' })
    const res = await resendVerification(email)
    setLoading(false)
    setCooldownMs(getResendCooldownRemaining())
    setStatus(res.success ? { type: 'success', message: res.message } : { type: 'error', message: res.message })
    const token = (res as any).token as string | undefined
  }

  const handleGoToLogin = () => {
    window.location.assign('/auth?mode=login')
  }

  const handleLogout = async () => {
    const res = await secureLogout()
    if (res.success) {
      window.location.replace('/?logout=1')
    } else {
      window.location.replace('/?logout_error=1')
    }
  }

  const cooldownSeconds = Math.ceil(cooldownMs / 1000)
  const resendDisabled = loading || cooldownMs > 0
  const resendLabel = loading ? 'Sending...' : (cooldownMs > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend verification email')
  

  

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Top nav bar */}
      <nav className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a
              href="/"
              className="px-3 py-1.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Home
            </a>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto max-w-2xl px-4 py-10">
        {/* Explicit Not Verified banner */}
        {!status && (
          <div className="mb-4 rounded-lg border px-4 py-3 border-red-300 bg-red-50 text-red-700">
            {email ? (
              <span>Your email ({email}) is not verified. Please click the link sent to your inbox or resend the verification email below.</span>
            ) : (
              <span>Your email is not verified. Please sign in and resend the verification email.</span>
            )}
          </div>
        )}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verify your email</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            To use FixRez AI, please verify your email by clicking the link sent to{' '}
            <span className="font-medium">{email || 'your inbox'}</span>.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Secure verification protects your account and enables access to all features.</p>

          {status && (
            <div className={`mb-4 rounded-lg border px-4 py-3 ${status.type === 'success' ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
              {status.message}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={resendDisabled}
              className="w-full py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {resendLabel}
            </button>
            
            
            <button
              onClick={handleGoToLogin}
              className="w-full py-2 rounded-xl text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 Summit Pixels Inc.</p>
            <div className="flex items-center gap-6 text-sm">
              <a href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Terms</a>
              <a href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Privacy</a>
              <a href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Contact</a>
              <a href="/accessibility" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Accessibility</a>
              <a href="/settings#security" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Security</a>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 dark:text-gray-300">Powered by Summit Pixels Inc.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
