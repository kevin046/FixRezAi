import { useState, useEffect, useRef } from 'react'
import { Hero } from './components/Hero'
import { OptimizationWizard } from './components/OptimizationWizard'
import TermsAndConditions from './pages/terms'
import PrivacyPolicy from './pages/privacy'
import AuthPage from './pages/AuthPage'
import ContactPage from './pages/contact'
import SettingsPage from './pages/settings'
import VerifyPage from './pages/verify'
import DashboardPage from './pages/dashboard'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import { secureLogout, isVerified, syncVerifiedMetadata } from './lib/auth'
import { VerificationStatus } from './stores/authStore'
import AdminMetricsPage from './pages/AdminMetrics'
import { Toaster } from 'sonner'
import Footer from '@/components/Footer'
import SocialShareButtons from '@/components/SocialShareButtons'

function App() {
  const { user, setUser, setVerificationStatus, logout } = useAuthStore()
  
  // Check URL path to determine initial view
  const getInitialView = (): 'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify' | 'dashboard' | 'adminMetrics' => {
    const path = window.location.pathname
    if (path === '/optimize') return 'wizard'
    if (path === '/terms') return 'terms'
    if (path === '/privacy') return 'privacy'
    if (path === '/settings') return 'settings'
    if (path.startsWith('/auth')) return 'auth'
    if (path === '/contact') return 'contact'
    if (path === '/verify') return 'verify'
    if (path === '/dashboard') return 'dashboard'
    if (path === '/admin/metrics') return 'adminMetrics'
    return 'home'
  }

  const [currentView, setCurrentView] = useState<'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify' | 'dashboard' | 'adminMetrics'>(
    getInitialView()
  )

  const handleNavigation = (view: 'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify' | 'dashboard' | 'adminMetrics') => {
    if (view === 'wizard' && user && !isVerified(user)) {
      view = 'verify'
    }

    setCurrentView(view)
    let path = '/'
    if (view === 'wizard') path = '/optimize'
    else if (view === 'terms') path = '/terms'
    else if (view === 'privacy') path = '/privacy'
    else if (view === 'settings') path = '/settings'
    else if (view === 'auth') path = '/auth'
    else if (view === 'contact') path = '/contact'
    else if (view === 'verify') path = '/verify'
    else if (view === 'dashboard') path = '/dashboard'
    else if (view === 'adminMetrics') path = '/admin/metrics'
    window.history.pushState({}, '', path)
  }

  const handleGetStarted = () => {
    if (user) {
      if (!isVerified(user)) {
        handleNavigation('verify')
      } else {
        handleNavigation('wizard')
      }
    } else {
      handleNavigation('auth')
    }
  }

  const handleBackToHome = () => {
    handleNavigation('home')
  }

  const handleLogout = async () => {
    console.log('👉 App: Logout clicked')
    try {
      const result = await secureLogout()
      console.log('✅ App: Logout completed', result)
      if (result.success) {
        window.location.replace('/?logout=1')
      } else {
        window.location.replace('/?logout_error=1')
      }
    } catch (err) {
      console.error('❌ App: Logout error', err)
      window.location.replace('/?logout_error=1')
    }
  }

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Listen for ATSRating prompt to navigate to upload wizard
  useEffect(() => {
    const handleNavigateToUpload = () => {
      handleNavigation('wizard')
    }
    window.addEventListener('navigate-to-upload', handleNavigateToUpload as EventListener)
    return () => window.removeEventListener('navigate-to-upload', handleNavigateToUpload as EventListener)
  }, [user])

  // Throttle / debounce helpers for verification-status fetching
  const lastVerificationFetchRef = useRef<number>(0)
  const nextAllowedFetchTimeRef = useRef<number>(0)
  const inFlightVerificationRef = useRef<Promise<void> | null>(null)
  const prevUserIdRef = useRef<string | null>(null)
  const VERIFICATION_COOLDOWN_MS = 10000 // minimum 10s cooldown between requests

  // Fetch verification status for authenticated user
  const fetchVerificationStatus = async (userId: string) => {
    const now = Date.now()
    // Respect server-provided retry window and local cooldown
    if (now < nextAllowedFetchTimeRef.current) {
      return
    }
    // Avoid redundant calls for same user within cooldown window
    if (userId === prevUserIdRef.current && (now - lastVerificationFetchRef.current) < VERIFICATION_COOLDOWN_MS) {
      return
    }
    // If a request is already in-flight, skip
    if (inFlightVerificationRef.current) {
      return
    }
  
    lastVerificationFetchRef.current = now
  
    const run = (async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const response = await fetch('/api/verification-status', {
          headers: {
            'Authorization': `Bearer ${token ?? ''}`
          }
        })
  
        if (response.status === 429) {
          // Rate limited; honor Retry-After if present, otherwise back off for 15s
          const retryAfterHeader = response.headers.get('Retry-After')
          const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 15
          const backoffMs = Math.max(VERIFICATION_COOLDOWN_MS, (retryAfterSeconds || 15) * 1000)
          nextAllowedFetchTimeRef.current = Date.now() + backoffMs
          console.warn('Rate limited on /api/verification-status. Backing off for', backoffMs, 'ms')
          return
        }
  
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.verification_status) {
            setVerificationStatus(data.verification_status)
          }
          // Successful request resets allowed time window
          nextAllowedFetchTimeRef.current = Date.now() + VERIFICATION_COOLDOWN_MS
        } else {
          // Non-OK response: apply a short cooldown to avoid hammering
          nextAllowedFetchTimeRef.current = Date.now() + VERIFICATION_COOLDOWN_MS
          console.warn('Non-OK response fetching verification status:', response.status)
        }
      } catch (error) {
        // Network or auth error: back off briefly
        nextAllowedFetchTimeRef.current = Date.now() + VERIFICATION_COOLDOWN_MS
        console.error('Error fetching verification status:', error)
      } finally {
        inFlightVerificationRef.current = null
      }
    })()
  
    inFlightVerificationRef.current = run
    await run
  }
  
  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        prevUserIdRef.current = session.user.id
        // Fetch enhanced verification status (throttled)
        await fetchVerificationStatus(session.user.id)
        // Only sync once if email_confirmed_at present and metadata not yet verified
        try { if (session.user.email_confirmed_at && session.user.user_metadata?.verified !== true) { await syncVerifiedMetadata() } } catch {}
      }
    }
  
    checkSession()
  
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const uid = session.user.id
        // Track last seen user id
        if (prevUserIdRef.current !== uid) {
          prevUserIdRef.current = uid
        }
        // Throttled fetch; will no-op if within cooldown/backoff
        fetchVerificationStatus(uid)
      } else {
        setVerificationStatus(null)
      }
      // Best-effort metadata sync when email becomes confirmed and not already set
      try { if (session?.user?.email_confirmed_at && session.user.user_metadata?.verified !== true) { syncVerifiedMetadata() } } catch {}
    })
  
    return () => subscription.unsubscribe()
  }, [setUser, setVerificationStatus])

  // If user is authenticated and currently on Auth page, send them home or to Verify
  useEffect(() => {
    if (user && currentView === 'auth') {
      if (!isVerified(user)) {
        handleNavigation('verify')
      } else {
        handleNavigation('home')
      }
    }
  }, [user, currentView])

  // Force unverified authenticated users to the Verify page universally
  useEffect(() => {
    if (user && !isVerified(user) && currentView !== 'verify') {
      handleNavigation('verify')
    }
  }, [user, currentView])

  // Hydrate session from verification hash tokens if present
  useEffect(() => {
    try {
      const hash = window.location.hash.replace('#', '')
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token })
          .then(async () => {
            const cleanUrl = window.location.pathname + window.location.search
            window.history.replaceState({}, '', cleanUrl)
            setCurrentView(getInitialView())
            // Sync metadata in case email was just confirmed and not yet set
            try {
              const { data: { user: fresh } } = await supabase.auth.getUser()
              if (fresh?.email_confirmed_at && fresh.user_metadata?.verified !== true) {
                await syncVerifiedMetadata()
              }
            } catch {}
          })
          .catch((e) => console.warn('Supabase setSession error:', e))
      }
    } catch { /* no-op */ }
  }, [])

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Hero onGetStarted={handleGetStarted} user={user} onLogout={handleLogout} />
      case 'wizard':
        return <OptimizationWizard onBack={handleBackToHome} />
      case 'terms':
        return <TermsAndConditions />
      case 'privacy':
        return <PrivacyPolicy />
      case 'auth':
        return <AuthPage />
      case 'contact':
        return <ContactPage />
      case 'settings':
        return <SettingsPage />
      case 'verify':
        return <VerifyPage />
      case 'dashboard':
        return <DashboardPage />
      case 'adminMetrics':
        return <AdminMetricsPage />
      default:
        return <Hero onGetStarted={handleGetStarted} user={user} onLogout={handleLogout} />
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {renderView()}
      
      {/* Social Share Buttons - Show on home page */}
      {currentView === 'home' && (
        <div className="fixed bottom-4 right-4 z-50">
          <SocialShareButtons />
        </div>
      )}
      
      {/* Footer */}
      <Footer />
      <Toaster position="top-right" />
    </div>
  )
}

export default App

