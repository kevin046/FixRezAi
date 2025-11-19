import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
 
 
import { Home, LayoutDashboard, Settings, Twitter, Instagram, Facebook, Linkedin, Menu, X, ChevronRight } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

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

  const { user } = useAuthStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const displayName = ((user?.user_metadata as { first_name?: string })?.first_name) || user?.email?.split('@')[0]

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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <a href="/" className="inline-flex items-center gap-2" aria-label="FixRez AI home">
                <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FixRez AI</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-gray-700 dark:text-gray-300">
                      Welcome, {displayName}
                    </span>
                    
                    <a
                      href="/"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <Home className="w-4 h-4 inline mr-1" />
                      Home
                    </a>
                    <a
                      href="/dashboard"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <LayoutDashboard className="w-4 h-4 inline mr-1" />
                      Dashboard
                    </a>
                    <a
                      href="/settings"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <Settings className="w-4 h-4 inline mr-1" />
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
              <button
                className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70"
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-label="Menu"
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-nav-menu"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden" id="mobile-nav-menu">
            <div className="container mx-auto px-4 pb-4">
              <div className="rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="p-3">
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Welcome, {displayName}</span>
                      </div>
                      <a href="/" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><Home className="w-4 h-4" /> Home</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a href="/dashboard" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Dashboard</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a href="/settings" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <div className="border-t border-gray-200 dark:border-gray-800" />
                      <LogoutButton className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => { window.location.href = '/auth?mode=login' }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => { window.location.href = '/auth?mode=register' }}
                        className="px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md"
                      >
                        Register
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Contact Us</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Questions, feedback, or business inquiries? We'd love to hear from you.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-700 p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-900/30 dark:border-green-700 p-6 mb-6">
            <p className="text-green-700 dark:text-green-300">
              Thanks! Your message was submitted successfully. We'll reply to {fromEmail || 'your email'} soon.
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
                placeholder="What is this about?"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm text-gray-700 dark:text-gray-300">Message</label>
              <textarea
                id="message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us more..."
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="challenge" className="text-sm text-gray-700 dark:text-gray-300">
                Anti-spam: {challengeA} + {challengeB} =
              </label>
              <input
                id="challenge"
                type="number"
                value={challengeAnswer}
                onChange={(e) => setChallengeAnswer(e.target.value)}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="?"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Or email us directly at{' '}
                <a href={`mailto:${email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {email}
                </a>
              </p>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Sending...' : 'Send message'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">Summit Pixels Inc.</p>
      </div>


    </div>
  )
}
