import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, Wand2, Clipboard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getApiBase } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'
import { validatePassword, generateStrongPassword } from '@/lib/password'
import { Progress } from './ui/progress'

interface RegisterFormProps {
  onToggle: () => void
}

function strengthToColors(strength: string) {
  switch (strength) {
    case 'weak':
      return { bar: 'bg-red-500', text: 'text-red-600' }
    case 'medium':
      return { bar: 'bg-orange-500', text: 'text-orange-600' }
    case 'strong':
      return { bar: 'bg-green-500', text: 'text-green-600' }
    case 'very strong':
      return { bar: 'bg-emerald-500', text: 'text-emerald-600' }
    default:
      return { bar: 'bg-gray-400', text: 'text-gray-600' }
  }
}


export default function RegisterForm({ onToggle }: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const { setUser } = useAuthStore()

  const pwdValidation = validatePassword(password, { requireSpecial: false, minLength: 8 })
  const colors = strengthToColors(pwdValidation.strength)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Basic validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
      const redirectTo = `${window.location.origin}/verify`
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      })
      if (error) throw error
      if (!data.user) throw new Error('Registration failed. Please try again.')

      setUser(data.user)

      // Issue CSRF and send verification via backend
      try {
        const apiBase = getApiBase()
        const csrf = await fetch(`${apiBase}/csrf`, { method: 'GET', credentials: 'include' })
        const csrfData = await csrf.json()
        const token = csrfData?.token
        if (token) {
          const resp = await fetch(`${apiBase}/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
            credentials: 'include',
            body: JSON.stringify({ email, userId: data.user.id }),
          })
          if (!resp.ok) {
            const details = await resp.text()
            console.warn('Send verification failed:', details)
          }
        }
      } catch (e) {
        console.warn('Verification email dispatch error:', (e as any)?.message || e)
      }

      // Immediate redirect to Confirm Email page
      window.location.assign('/verify?sent=1')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      if (msg.toLowerCase().includes('user already registered')) {
        setError('This email is already registered. Please sign in instead.')
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
        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="reg-email">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="reg-password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pl-10 pr-28 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              required
            />
            <div className="absolute inset-y-0 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={handleCopyPassword}
                disabled={!password}
                className="flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition disabled:opacity-50"
                aria-label="Copy password"
              >
                <Clipboard className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={pwdValidation.score} indicatorClassName={`${colors.bar}`} className="w-full" />
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Wand2 className="w-4 h-4" /> Generate password
            </button>
          </div>
          <div className="text-xs mt-1 flex items-center gap-2">
            <span className={`${colors.text}`}>Strength: {pwdValidation.strength}</span>
            {copied && <span className="text-green-600">Copied!</span>}
          </div>
          {!pwdValidation.valid && password && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Requirements: {pwdValidation.missing.join(', ')}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">Use at least 8 characters with letters and numbers.</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="reg-confirm">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="reg-confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 pl-10 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              required
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Re-enter your password to confirm.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
        >
          Already have an account? Sign in
        </button>

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </div>
      </form>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Password must be at least 8 characters and include a mix of letters and numbers.
      </div>
    </div>
  )
}
