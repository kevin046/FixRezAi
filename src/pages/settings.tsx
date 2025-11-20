import React, { useState, useEffect, useMemo } from 'react'
import { 
  Home, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Shield, 
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Lock,
  HelpCircle,
  RefreshCw,
  Mail,
  Eye,
  EyeOff,
  Moon,
  Sun,
  AlertTriangle,
  Info,
  Check,
  X,
  Key,
  LayoutDashboard,
  ChevronRight,
  Menu
} from 'lucide-react'
import { Twitter, Instagram, Facebook, Linkedin } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import LogoutButton from '@/components/LogoutButton'
import { isVerified, resendVerification, canResend, getResendCooldownRemaining, sendPasswordResetEmail } from '@/lib/auth'
 
import { useTheme } from '@/hooks/useTheme'
import { toast } from 'sonner'
import VerificationStatusBadge from '@/components/VerificationStatusBadge'

interface SettingsCategory {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  settings: SettingItem[]
}

interface SettingItem {
  id: string
  title: string
  description: string
  type: 'toggle' | 'button' | 'select' | 'info'
  value?: any
  options?: string[]
  onChange?: (value: any) => void
  onClick?: () => void
  disabled?: boolean
  tooltip?: string
  dangerous?: boolean
}

const SettingsPage: React.FC = () => {
  const { user, verificationStatus, error: verificationError, setVerificationStatus } = useAuthStore()
  const { theme, toggleTheme, isDark } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [cooldownMs, setCooldownMs] = useState<number>(getResendCooldownRemaining())
  const [showSecurityDetails, setShowSecurityDetails] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Added UI and toggle states
  const [showVerificationOverlay, setShowVerificationOverlay] = useState<boolean>(false)
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true)
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(true)
  const [verificationRemindersEnabled, setVerificationRemindersEnabled] = useState<boolean>(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(true)

  // Define verified/email BEFORE any effects that reference them
  const verified = isVerified(user)
  const email = user?.email || ''

  // Initialize overlay and reminder state based on verification
  useEffect(() => {
    setShowVerificationOverlay(!!user && !verified)
    setVerificationRemindersEnabled(!verified)
  }, [user, verified])

  // Cooldown timer effect
  useEffect(() => {
    const id = setInterval(() => setCooldownMs(getResendCooldownRemaining()), 1000)
    return () => clearInterval(id)
  }, [])

  // Clear status messages after 5 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.assign('/')
    }
  }


  // Enhanced resend verification function with better UX
  const handleResendVerification = async () => {
    if (!email) {
      setStatus({ type: 'error', message: 'Please sign in to resend verification.' })
      toast.error('Please sign in to resend verification.')
      return
    }
    
    if (!canResend()) {
      const seconds = Math.ceil(getResendCooldownRemaining() / 1000)
      setStatus({ type: 'error', message: `Please wait ${seconds}s before requesting again.` })
      toast.error(`Please wait ${seconds}s before requesting again.`)
      return
    }

    setResendingEmail(true)
    const result = await resendVerification(email)
    setResendingEmail(false)
    
    setCooldownMs(getResendCooldownRemaining())
    
    if (result.success) {
      setStatus({ type: 'success', message: result.message })
      toast.success(result.message)
    } else {
      setStatus({ type: 'error', message: result.message })
      toast.error(result.message)
    }
  }

  const cooldownSeconds = Math.ceil(cooldownMs / 1000)
  const resendDisabled = cooldownMs > 0 || resendingEmail
  const resendLabel = cooldownMs > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend verification email'

  // Password reset handler
  const handlePasswordReset = async () => {
    if (!email) {
      setStatus({ type: 'error', message: 'Please ensure you are logged in to reset your password.' })
      toast.error('Please ensure you are logged in to reset your password.')
      return
    }

    setResettingPassword(true)
    const result = await sendPasswordResetEmail(email)
    setResettingPassword(false)

    if (result.success) {
      setStatus({ type: 'success', message: result.message })
      toast.success(result.message)
    } else {
      setStatus({ type: 'error', message: result.message })
      toast.error(result.message)
    }
  }

  // Settings categories with enhanced functionality
  const settingsCategories: SettingsCategory[] = useMemo(() => [
    {
      id: 'account',
      title: 'Account Settings',
      icon: <User className="w-5 h-5" />,
      description: 'Manage your account information and security',
      settings: [
        {
          id: 'email-verification',
          title: 'Email Verification',
          description: verified ? 'Your email is verified' : 'Verify your email address to access all features',
          type: 'info',
          value: verified ? 'verified' : 'unverified',
          tooltip: verified ? 'Your email has been successfully verified' : 'Click the button below to resend verification email'
        },
        {
          id: 'resend-verification',
          title: 'Resend Verification Email',
          description: 'Send a new verification email to your inbox',
          type: 'button',
          onClick: handleResendVerification,
          disabled: resendDisabled || verified,
          tooltip: verified ? 'Your email is already verified' : resendDisabled ? 'Please wait for the cooldown period' : 'Click to resend verification email'
        },
        {
          id: 'security-status',
          title: 'Security Status',
          description: showSecurityDetails ? 'Hide detailed security information' : 'View your account security details',
          type: 'button',
          onClick: () => setShowSecurityDetails(!showSecurityDetails),
          tooltip: 'Click to view detailed security information about your account'
        }
      ]
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: <Palette className="w-5 h-5" />,
      description: 'Customize the look and feel of the application',
      settings: [
        {
          id: 'theme',
          title: 'Theme',
          description: 'Switch between light and dark mode',
          type: 'toggle',
          value: isDark,
          onChange: () => toggleTheme(),
          tooltip: 'Toggle between light and dark themes'
        },
        {
          id: 'animations',
          title: 'Enable Animations',
          description: 'Turn on smooth animations and transitions',
          type: 'toggle',
          value: animationsEnabled,
          onChange: (value) => {
            setAnimationsEnabled(value)
            document.documentElement.style.setProperty('--animation-duration', value ? '0.3s' : '0s')
          },
          tooltip: 'Enable or disable UI animations for better performance'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      description: 'Control how you receive updates and alerts',
      settings: [
        {
          id: 'email-notifications',
          title: 'Email Notifications',
          description: 'Receive important updates via email',
          type: 'toggle',
          value: emailNotificationsEnabled,
          onChange: (value) => {
            setEmailNotificationsEnabled(value)
            toast.info(`Email notifications ${value ? 'enabled' : 'disabled'}`)
          },
          tooltip: 'Control whether you receive email notifications'
        },
        {
          id: 'verification-reminders',
          title: 'Verification Reminders',
          description: 'Get reminded to verify your email if not verified',
          type: 'toggle',
          value: verificationRemindersEnabled,
          disabled: verified,
          onChange: (value) => {
            setVerificationRemindersEnabled(value)
            toast.info(`Verification reminders ${value ? 'enabled' : 'disabled'}`)
          },
          tooltip: verified ? 'Reminders disabled - your email is verified' : 'Enable periodic reminders to verify your email'
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: <Lock className="w-5 h-5" />,
      description: 'Manage your privacy settings and data preferences',
      settings: [
        {
          id: 'data-sharing',
          title: 'Anonymous Analytics',
          description: 'Help improve the app by sharing anonymous usage data',
          type: 'toggle',
          value: analyticsEnabled,
          onChange: (value) => {
            setAnalyticsEnabled(value)
            toast.info(`Anonymous analytics ${value ? 'enabled' : 'disabled'}`)
          },
          tooltip: 'Help us improve the app by sharing anonymous usage statistics'
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced',
      icon: <SettingsIcon className="w-5 h-5" />,
      description: 'Advanced settings and configurations',
      settings: [
        {
          id: 'reset-settings',
          title: 'Reset All Settings',
          description: 'Restore all settings to their default values',
          type: 'button',
          onClick: () => {
            if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
              // Reset local toggles to defaults
              if (isDark) toggleTheme()
              setAnimationsEnabled(true)
              setEmailNotificationsEnabled(true)
              setVerificationRemindersEnabled(!verified)
              setAnalyticsEnabled(true)
              toast.success('All settings have been reset to defaults')
            }
          },
          dangerous: true,
          tooltip: 'Reset all custom settings to their default values'
        }
      ]
    }
  ], [verified, isDark, toggleTheme, animationsEnabled, emailNotificationsEnabled, verificationRemindersEnabled, analyticsEnabled, showSecurityDetails, resendDisabled])

  // Filter settings based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return settingsCategories
    
    const query = searchQuery.toLowerCase()
    return settingsCategories
      .map(category => ({
        ...category,
        settings: category.settings.filter(setting =>
          setting.title.toLowerCase().includes(query) ||
          setting.description.toLowerCase().includes(query) ||
          category.title.toLowerCase().includes(query)
        )
      }))
      .filter(category => category.settings.length > 0)
  }, [settingsCategories, searchQuery])

  // Security status overview
  const getSecurityStatus = () => {
    if (!user) return { level: 'unknown', color: 'gray', message: 'Not authenticated' }
    
    const isEmailVerified = verified
    const hasStrongSecurity = isEmailVerified // Add more security checks as needed
    
    if (hasStrongSecurity) {
      return { level: 'high', color: 'green', message: 'Your account is secure' }
    } else if (isEmailVerified) {
      return { level: 'medium', color: 'yellow', message: 'Basic security enabled' }
    } else {
      return { level: 'low', color: 'red', message: 'Security improvements needed' }
    }
  }

  const securityStatus = getSecurityStatus()

  // Restore defaults per category (used by "Restore Defaults" buttons)
  const restoreDefaults = (categoryId: string) => {
    if (categoryId === 'appearance') {
      setAnimationsEnabled(true)
      if (isDark) toggleTheme()
      toast.success('Appearance settings restored to defaults')
    } else if (categoryId === 'notifications') {
      setEmailNotificationsEnabled(true)
      setVerificationRemindersEnabled(!verified)
      toast.success('Notification settings restored to defaults')
    } else if (categoryId === 'privacy') {
      setAnalyticsEnabled(true)
      toast.success('Privacy settings restored to defaults')
    } else {
      // Account/advanced: keep safe actions minimal
      toast.success('Settings restored to defaults')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Enhanced Navigation */}
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
                    <span className="text-gray-700 dark:text-gray-300 text-sm">
                      Welcome, {(user.user_metadata as any)?.first_name ?? user.email?.split('@')[0]}
                    </span>
                    
                    <a
                      href="/"
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition inline-flex items-center gap-1"
                    >
                      <Home className="w-4 h-4" /> Home
                    </a>
                    <a
                      href="/dashboard"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/settings"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
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
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Welcome, {(user.user_metadata as any)?.first_name ?? user.email?.split('@')[0]}</span>
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
                        <span className="flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Settings</span>
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

      {/* Email Verification Overlay */}
      {user && !verified && showVerificationOverlay && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verify your email</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 break-words">
              To use FixRez AI fully, please verify your email by clicking the link sent to {email || 'your inbox'}. You can resend a verification email below.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleResendVerification}
                disabled={resendDisabled}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  resendDisabled
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {resendingEmail ? 'Sending...' : resendLabel}
              </button>
              <button
                onClick={() => setShowVerificationOverlay(false)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-600 dark:text-gray-300">Manage your account preferences and application settings</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {status && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  status.type === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                }`}>
                  {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {status.message}
                </div>
              )}
            </div>
          </div>

          {/* Security Status Overview */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${securityStatus.color === 'green' ? 'text-green-600 dark:text-green-400' : securityStatus.color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Security Status</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{securityStatus.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <VerificationStatusBadge compact={true} />
                <button
                  onClick={() => setShowSecurityDetails(!showSecurityDetails)}
                  className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {showSecurityDetails ? 'Hide Details' : 'View Details'}
                </button>
              </div>
            </div>

            {/* Detailed Security Information */}
            {showSecurityDetails && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                <VerificationStatusBadge showDetails={true} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 dark:text-green-400">Account Status: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600 dark:text-blue-400">
                      Member Since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Mail className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600 dark:text-gray-400">Email: {email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings Categories */}
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      {category.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{category.title}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{category.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => restoreDefaults(category.id)}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Restore Defaults
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                {category.settings.map((setting) => (
                  <div key={setting.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{setting.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{setting.description}</p>
                        {setting.tooltip && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{setting.tooltip}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        {setting.type === 'toggle' && (
                          <button
                            onClick={() => setting.onChange && setting.onChange(!setting.value)}
                            disabled={setting.disabled}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              setting.value
                                ? 'bg-blue-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                            } ${
                              setting.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                setting.value ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        )}
                        {setting.type === 'button' && (
                          <button
                            onClick={setting.onClick}
                            disabled={setting.disabled}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              setting.dangerous
                                ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            } ${
                              setting.disabled ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {setting.title}
                          </button>
                        )}
                        {setting.type === 'info' && (
                          <div className="flex items-center gap-2">
                            {setting.value === 'verified' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : setting.value === 'unverified' ? (
                              <XCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Info className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                              {setting.value}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Need Help?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Contact support for assistance with your account</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/contact"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Contact Support
              </a>
              <a
                href="/help"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Help Center
              </a>
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}

export default SettingsPage
