import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isVerified, resendVerification, secureLogout, syncVerifiedMetadata, canResend, getResendCooldownRemaining } from '@/lib/auth'

import { supabase } from '@/lib/supabase'
import { getApiBase } from '@/lib/http'

export default function VerifyPage() {
  const { user, verificationStatus, fetchVerificationStatus } = useAuthStore()
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldownMs, setCooldownMs] = useState<number>(getResendCooldownRemaining())
  const [inputEmail, setInputEmail] = useState('')
  // Get email from user object or metadata
  const getUserEmail = () => {
    return user?.email || (user?.user_metadata as any)?.email || ''
  }
  
  const email = getUserEmail() || inputEmail

  useEffect(() => {
    const id = setInterval(() => setCooldownMs(getResendCooldownRemaining()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // Handle Supabase email verification links
    try {
      const hash = window.location.hash.replace('#', '')
      const hashParams = new URLSearchParams(hash)
      const type = hashParams.get('type')
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')

      // If tokens are present from Supabase email verification
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
          if (error) {
            console.warn('Supabase setSession error:', error.message)
            setStatus({ type: 'error', message: 'Verification failed. Please try again.' })
            return
          }
          
          const { data: { user: fresh } } = await supabase.auth.getUser()
          if (fresh && isVerified(fresh)) {
            // Persist a metadata flag to simplify downstream checks
            await syncVerifiedMetadata()
            setStatus({ type: 'success', message: 'Email verified successfully.' })
            setTimeout(() => { window.location.replace('/verified') }, 800)
          } else {
            setStatus({ type: 'error', message: 'Email verification failed. Please try again.' })
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
            setStatus({ type: 'success', message: 'Email verified successfully.' })
            setTimeout(() => { window.location.replace('/verified') }, 800)
          } else {
            setStatus({ type: 'error', message: 'Email verification failed. Please check your email and try again.' })
          }
          
          // Clean the hash from the URL
          const cleanUrl = window.location.pathname + window.location.search
          window.history.replaceState({}, '', cleanUrl)
        }, 300)
      }
    } catch { /* no-op */ }
  }, [])

  useEffect(() => {
    if (user) {
      fetchVerificationStatus(user.id).catch(() => {})
    }
  }, [user])

  // If user is verified, do not show verify page
  useEffect(() => {
    if (user && isVerified(user)) {
      window.location.replace('/verified')
    }
  }, [user])

  useEffect(() => {
    if (verificationStatus?.verified) {
      window.location.replace('/verified')
    }
  }, [verificationStatus])

  const handleResend = async () => {
    const userEmail = getUserEmail() || inputEmail
    if (!userEmail) {
      setStatus({ type: 'error', message: 'Please enter your email address to resend.' })
      return
    }
    
    if (!canResend()) {
      const seconds = Math.ceil(getResendCooldownRemaining() / 1000)
      setStatus({ type: 'error', message: `Please wait ${seconds}s before requesting again.` })
      return
    }
    
    setLoading(true)
    setStatus({ type: 'success', message: 'Sending verification email…' })
    
    try {
      const res = await resendVerification(userEmail)
      setCooldownMs(getResendCooldownRemaining())
      setStatus(res.success ? { type: 'success', message: res.message } : { type: 'error', message: res.message })
      const token = (res as any).token as string | undefined
    } catch (error) {
      console.error('Failed to resend verification:', error)
      setStatus({ type: 'error', message: 'Failed to send verification email. Please try again.' })
    } finally {
      setLoading(false)
    }
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
          <div className="flex items-center gap-2"></div>
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
        {!status && (
          <div className="mb-4 rounded-lg border px-4 py-3 border-blue-300 bg-blue-50 text-blue-700">
            <span>
              {user ? 'Thanks for signing up!' : 'Thanks for signing up.'} We sent a confirmation to <span className="font-medium">{email || 'your email'}</span> from <span className="font-medium">noreply@summitpixels.com</span>.
              The link is valid for 24 hours. It may take up to 2 minutes for the email to arrive. If you don't see it, check your Spam/Junk folder.
            </span>
          </div>
        )}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirm your email to activate your account</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Open the email from <span className="font-medium">noreply@summitpixels.com</span> and click the verification button to finish setting up your account.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">This protects your account and enables access to all features.</p>

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
            {!getUserEmail() && (
              <input
                type="email"
                placeholder="Enter your email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                className="w-full mt-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100"
              />
            )}
            {resendDisabled && (
              <div className="text-xs text-gray-500 dark:text-gray-400">Next resend available in {cooldownSeconds}s</div>
            )}
            
            
            <button
              onClick={handleGoToLogin}
              className="w-full py-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              Already verified? Go to login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
