import { useState, useEffect } from 'react'
import { Hero } from './components/Hero'
import { OptimizationWizard } from './components/OptimizationWizard'
import TermsAndConditions from './pages/terms'
import PrivacyPolicy from './pages/privacy'
import AuthPage from './pages/AuthPage'
import ContactPage from './pages/contact_fixed'
import SettingsPage from './pages/settings'
import VerifyPage from './pages/verify'
import DashboardPage from './pages/dashboard'
import { useAuthStore } from './stores/authStore'
import { getApiBase } from '@/lib/http'
import { supabase } from './lib/supabase'
import { secureLogout, isVerified, syncVerifiedMetadata } from './lib/auth'
import { VerificationStatus } from './stores/authStore'
import AdminMetricsPage from './pages/AdminMetrics'
import AccessibilityPage from './pages/accessibility'
import SecurityPage from './pages/security'
import ATSRatingPage from './pages/ATSRatingPage'
import { Toaster } from 'sonner'
import Footer from '@/components/Footer'

function App() {
  const { user, setUser, setVerificationStatus, logout, verificationStatus, verificationLoaded, fetchVerificationStatus } = useAuthStore()
  
  // Check URL path to determine initial view
  const getInitialView = (): 'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify' | 'dashboard' | 'adminMetrics' | 'accessibility' | 'security' | 'atsRating' => {
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
    if (path === '/accessibility') return 'accessibility'
    if (path === '/security') return 'security'
    if (path === '/ats-rating') return 'atsRating'
    return 'home'
  }

  const [currentView, setCurrentView] = useState<'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify' | 'dashboard' | 'adminMetrics' | 'accessibility' | 'security' | 'atsRating'>(
    getInitialView()
  )

  const handleNavigation = (view: 'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify' | 'dashboard' | 'adminMetrics' | 'accessibility' | 'security' | 'atsRating') => {
    if (view === 'wizard' && user && !isVerified(user)) {
      view = 'verify'
    }
    if (view === 'atsRating' && user && !isVerified(user)) {
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
    else if (view === 'accessibility') path = '/accessibility'
    else if (view === 'security') path = '/security'
    else if (view === 'atsRating') path = '/ats-rating'
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

  const prevUserIdRef = { current: null as string | null }
  
  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        prevUserIdRef.current = session.user.id
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
    if (user && currentView !== 'verify') {
      const ready = verificationLoaded || !!user.email_confirmed_at
      if (!ready) return
      const isUserVerified = verificationStatus ?
        Boolean((verificationStatus as any).verified ?? (verificationStatus as any).is_verified) :
        isVerified(user)
      if (!isUserVerified) {
        handleNavigation('verify')
      }
    }
  }, [user, currentView, verificationStatus, verificationLoaded])

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
      case 'accessibility':
        return <AccessibilityPage />
      case 'security':
        return <SecurityPage />
      case 'atsRating':
        return <ATSRatingPage />
      default:
        return <Hero onGetStarted={handleGetStarted} user={user} onLogout={handleLogout} />
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-1">
        {renderView()}
      </div>
      <Footer />
      <Toaster position="top-right" />
    </div>
  )
}

export default App


