import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { getApiBase } from '@/lib/http'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { validatePassword, generateStrongPassword } from '@/lib/password'

export default function RegisterForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const { setUser } = useAuthStore()

  // Email validation pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Basic validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.')
      return
    }
    if (!emailPattern.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const pwdCheck = validatePassword(password, { requireSpecial: false, minLength: 8 })
    if (!pwdCheck.valid) {
      setError(pwdCheck.missing.length ? `Password requirements: ${pwdCheck.missing.join(', ')}` : 'Password does not meet requirements.')
      return
    }

    try {
      setLoading(true)
      const redirectTo = `${window.location.origin}/verify?type=signup`
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo, data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: `${firstName.trim()} ${lastName.trim()}` } },
      })
      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('error sending confirmation email')) {
          if (data?.user) setUser(data.user)
          try {
            const { error: resendError } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/verify?type=signup` } })
            if (!resendError) {
              window.location.assign('/verify?sent=1&provider=supabase')
              return
            }
          } catch {}
          setError('Email service is temporarily unavailable. Please try again later.')
          return
        }
        throw error
      }
      if (!data.user) throw new Error('Registration failed. Please try again.')

      setUser(data.user)

      // Use Supabase's built-in email verification instead of backend API
      // This is more reliable during the registration process
      try {
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email,
        })
        
        if (resendError) {
          console.warn('Verification email dispatch error:', resendError.message)
        } else {
          console.log('Verification email sent successfully via Supabase')
        }
      } catch (e) {
        console.warn('Verification email dispatch error:', (e as any)?.message || e)
      }

      // Immediate redirect to Confirm Email page
      window.location.assign('/verify?sent=1')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      console.error('Registration error details:', err)
      const lower = msg.toLowerCase()
      if (lower.includes('user already registered')) {
        setError('This email is already registered. Please sign in instead.')
      } else if (lower.includes('error sending confirmation email')) {
        try {
          const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
          if (!resendError) {
            window.location.assign('/verify?sent=1&provider=supabase')
            return
          }
        } catch {}
        setError('Email service is temporarily unavailable. Please try again later.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword({ length: 14, requireSpecial: false })
    setPassword(generated)
    setConfirmPassword(generated)
    setShowPassword(true)
    setError('')
  }

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // no-op
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create Account</h2>

      {error && (
        <div role="alert" aria-live="polite" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded mb-4 inline-flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4" aria-label="Registration form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="reg-first-name">
              First Name
            </label>
            <input
              id="reg-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John"
              required
              disabled={loading}
              aria-describedby={error && firstName.trim() === '' ? 'name-error' : undefined}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="reg-last-name">
              Last Name
            </label>
            <input
              id="reg-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Doe"
              required
              disabled={loading}
              aria-describedby={error && lastName.trim() === '' ? 'name-error' : undefined}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="reg-email">
            Email Address
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="john@example.com"
            required
            disabled={loading}
            aria-describedby={error && !emailPattern.test(email) ? 'email-error' : undefined}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="reg-password">
              Password
            </label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              disabled={loading}
            >
              Generate Strong
            </button>
          </div>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={loading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="reg-confirm-password">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        {password && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${validatePassword(password, { requireSpecial: false, minLength: 8 }).valid ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={validatePassword(password, { requireSpecial: false, minLength: 8 }).valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {validatePassword(password, { requireSpecial: false, minLength: 8 }).valid ? 'Strong password' : 'Weak password'}
              </span>
            </div>
            {copied && (
              <span className="text-green-600 dark:text-green-400 text-xs">Copied!</span>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
