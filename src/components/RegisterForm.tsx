import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { validatePassword, generateStrongPassword } from '@/lib/password'
import { Eye, EyeOff, Wand2 } from 'lucide-react'
import { Progress } from './ui/progress'

interface RegisterFormProps {
  onToggle: () => void
}

export default function RegisterForm({ onToggle }: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordValidation = useMemo(() => validatePassword(password, { requireSpecial: false, minLength: 8 }), [password])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!passwordValidation.valid) {
      setError(`Password requirements: ${passwordValidation.missing.join(', ')}`)
      return
    }

    setLoading(true)

    try {
      const emailRedirectTo = `${window.location.origin}/auth?verified=1&mode=login`
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
        },
      })

      if (error) throw error

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Success!</h2>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Check your email for a confirmation link to complete your registration.
        </div>
        <button
          onClick={onToggle}
          className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Back to Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create Account</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4" aria-label="Registration form">
        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              aria-describedby="password-requirements"
              aria-required="true"
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

          <div className="space-y-2" id="password-requirements">
            <div className="flex items-center gap-2">
              <Progress value={passwordValidation.score} className="w-full" />
              <span className={`text-xs font-medium ${passwordValidation.color} transition-colors`}>
                {passwordValidation.strength}
              </span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300">
              <li className={`${passwordValidation.requirements.minLength ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>• Minimum 8 characters</li>
              <li className={`${passwordValidation.requirements.hasUpper ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>• At least one uppercase</li>
              <li className={`${passwordValidation.requirements.hasLower ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>• At least one lowercase</li>
              <li className={`${passwordValidation.requirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>• At least one number</li>
            </ul>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Use a unique password you don’t use elsewhere.</p>
              <button
                type="button"
                onClick={() => {
                  const gen = generateStrongPassword({ length: 12, requireSpecial: false })
                  setPassword(gen)
                  setConfirmPassword(gen)
                }}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
                aria-label="Generate strong password"
              >
                <Wand2 className="w-4 h-4" /> Generate
              </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Optional: include a special character for extra strength.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              aria-required="true"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((s) => !s)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              aria-pressed={showConfirmPassword}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Re-enter your password to confirm.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
        >
          Already have an account? Sign in
        </button>
      </form>
    </div>
  )
}
