import { useState, useEffect } from 'react'
import { Hero } from './components/Hero'
import { OptimizationWizard } from './components/OptimizationWizard'
import TermsAndConditions from './pages/terms'
import PrivacyPolicy from './pages/privacy'
import AuthPage from './pages/AuthPage'
import ContactPage from './pages/contact'
import SettingsPage from './pages/settings'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import { secureLogout } from './lib/auth'

function App() {
  const { user, setUser, logout } = useAuthStore()
  
  // Check URL path to determine initial view
  const getInitialView = (): 'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings' => {
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
    return 'home'
  }

  const [currentView, setCurrentView] = useState<'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings'>(
    getInitialView()
  )

  const handleNavigation = (view: 'home' | 'wizard' | 'terms' | 'privacy' | 'auth' | 'contact' | 'settings') => {
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
    }
    window.history.pushState({}, '', path)
  }

  const handleGetStarted = () => {
    if (user) {
      handleNavigation('wizard')
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
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  // If user is authenticated and currently on Auth page, send them to the wizard
  useEffect(() => {
    if (user && currentView === 'auth') {
      handleNavigation('home')
    }
  }, [user, currentView])

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

