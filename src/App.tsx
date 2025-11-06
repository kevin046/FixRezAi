import { useState, useEffect } from 'react'
import { Hero } from './components/Hero'
import { OptimizationWizard } from './components/OptimizationWizard'
import TermsAndConditions from './pages/terms'
import PrivacyPolicy from './pages/privacy'
import AuthPage from './pages/AuthPage'
import ContactPage from './pages/contact'
import SettingsPage from './pages/settings'
import VerifyPage from './pages/verify'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import { secureLogout, isVerified, syncVerifiedMetadata } from './lib/auth'

function App() {
  const { user, setUser, logout } = useAuthStore()
  
  // Check URL path to determine initial view
  const getInitialView = (): 'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify' => {
    const path = window.location.pathname
    if (path === '/optimize') {
      return 'wizard'
    }
    if (path === '/terms') {
      return 'terms'
    }
    if (path === '/privacy') {
      return 'privacy'
    }
    if (path === '/settings') {
      return 'settings'
    }
    if (path.startsWith('/auth')) {
      return 'auth'
    }
    if (path === '/contact') {
      return 'contact'
    }
    if (path === '/verify') {
      return 'verify'
    }
    return 'home'
  }

  const [currentView, setCurrentView] = useState<'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify'>(
    getInitialView()
  )

  const handleNavigation = (view: 'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' | 'verify') => {
    // Gate wizard: unverified users go to verify page
    if (view === 'wizard' && user && !isVerified(user)) {
      view = 'verify'
    }

    setCurrentView(view)
    let path = '/'
    if (view === 'wizard') {
      path = '/optimize'
    } else if (view === 'terms') {
      path = '/terms'
    } else if (view === 'privacy') {
      path = '/privacy'
    } else if (view === 'settings') {
      path = '/settings'
    } else if (view === 'auth') {
      path = '/auth'
    } else if (view === 'contact') {
      path = '/contact'
    } else if (view === 'verify') {
      path = '/verify'
    }
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

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        try { if (session.user.email_confirmed_at) { await syncVerifiedMetadata() } } catch {}
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // Best-effort metadata sync when email becomes confirmed
      try { if (session?.user?.email_confirmed_at) { syncVerifiedMetadata() } } catch {}
    })

    return () => subscription.unsubscribe()
  }, [setUser])

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
          .then(() => {
            const cleanUrl = window.location.pathname + window.location.search
            window.history.replaceState({}, '', cleanUrl)
            setCurrentView(getInitialView())
            // Sync metadata in case email was just confirmed
            try { syncVerifiedMetadata() } catch {}
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
      default:
        return <Hero onGetStarted={handleGetStarted} user={user} onLogout={handleLogout} />
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {renderView()}
    </div>
  )
}

export default App

