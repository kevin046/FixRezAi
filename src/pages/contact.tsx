import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { secureLogout } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'

export default function ContactPage() {
  const email = 'hello@summitpixels.com'
  const [name, setName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  // Anti-bot: honeypot, time gate, simple challenge
  const [honey, setHoney] = useState('')
  const [formStartAt, setFormStartAt] = useState<number>(Date.now())
  const [challengeA, setChallengeA] = useState<number>(0)
  const [challengeB, setChallengeB] = useState<number>(0)
  const [challengeAnswer, setChallengeAnswer] = useState('')

  const { user, logout, hydrated } = useAuthStore()
  const handleLogout = async () => {
    const res = await secureLogout()
    if (res.success) {
      window.location.replace('/?logout=1')
    } else {
      window.location.replace('/?logout_error=1')
    }
  }

  useEffect(() => {
    setFormStartAt(Date.now())
    // generate small numbers 3-9 for a simple sum
    const a = 3 + Math.floor(Math.random() * 7)
    const b = 3 + Math.floor(Math.random() * 7)
    setChallengeA(a)
    setChallengeB(b)
  }, [])

  const validate = () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // Honeypot should be empty; bots often fill hidden fields
    if (honey.trim()) return 'Invalid submission.'
    // Minimum time on page before submit
    if (Date.now() - formStartAt < 2500) return 'Please take a moment before submitting.'
    if (!name.trim()) return 'Please enter your name.'
    if (!fromEmail.trim() || !emailPattern.test(fromEmail)) return 'Please enter a valid email address.'
    if (!message.trim() || message.trim().length < 10) return 'Please enter a message of at least 10 characters.'
    // Simple math challenge
    const ans = parseInt(challengeAnswer, 10)
    if (isNaN(ans) || ans !== challengeA + challengeB) return 'Please solve the anti-spam challenge correctly.'
    return ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setLoading(true)
    ;(async () => {
      try {
        const finalSubject = subject.trim() || 'Contact from FixRez AI'
        // Submit via Formsubmit AJAX endpoint, which returns JSON
        const resp = await fetch('https://formsubmit.co/ajax/hello@summitpixels.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name,
            email: fromEmail,
            subject: finalSubject,
            message,
            _subject: finalSubject,
            _template: 'table',
            _captcha: 'false',
            _honey: honey
          })
        })

        const data = await resp.json().catch(() => ({}))
        if (!resp.ok || (data?.success !== 'true' && data?.success !== true)) {
          const msg = data?.message || 'Submission failed. Please try again or email us directly.'
          setError(msg)
          setSuccess(false)
        } else {
          setSuccess(true)
        }
      } catch (e) {
        setError('Network error. Please try again or email us directly.')
      } finally {
        setLoading(false)
      }
    })()
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

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
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Logout
                  </button>
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
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We’d love to hear from you. For support, feedback, partnerships, or general inquiries,
            reach us using the form below or email us directly.
          </p>

          {error && (
            <div role="alert" aria-live="polite" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-900/30 dark:border-green-700 p-6 mb-6">
              <p className="text-green-700 dark:text-green-300">
                Thanks! Your message was submitted successfully. We’ll reply to {fromEmail || 'your email'} soon.
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-6">
            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Contact form">
              {/* Honeypot field (hidden from users) */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  type="text"
                  value={honey}
                  onChange={(e) => setHoney(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm text-gray-700 dark:text-gray-300">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm text-gray-700 dark:text-gray-300">Email</label>
                <input
                  id="email"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm text-gray-700 dark:text-gray-300">Subject (optional)</label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm text-gray-700 dark:text-gray-300">Message</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us a bit about your inquiry..."
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please avoid sharing sensitive information.</p>
              </div>
              <div>
                <label htmlFor="challenge" className="block text-sm text-gray-700 dark:text-gray-300">Anti-spam challenge</label>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">What is {challengeA} + {challengeB}?</span>
                  <input
                    id="challenge"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={challengeAnswer}
                    onChange={(e) => setChallengeAnswer(e.target.value)}
                    className="w-24 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Answer"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <a
                  href={`mailto:${email}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Or email us directly at {email}
                </a>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center items-center px-6 py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Sending…' : 'Send Message'}
                </button>
              </div>
              
            </form>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Summit Pixels Inc.</p>
        </div>
      </div>
      {/* Footer identical to index */}
      <footer className="py-10 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 Summit Pixels Inc.</p>
            <div className="flex items-center gap-6 text-sm">
              <a href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Terms</a>
              <a href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Privacy</a>
              <a href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Contact</a>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 dark:text-gray-300">Powered by Summit Pixels Inc.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
