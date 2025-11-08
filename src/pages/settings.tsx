import React, { useState, useEffect, useMemo } from 'react'
import { 
  ArrowLeft, 
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
  X
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import LogoutButton from '@/components/LogoutButton'
import { isVerified, resendVerification, canResend, getResendCooldownRemaining } from '@/lib/auth'
import VerificationIndicator from '@/components/VerificationIndicator'
import { useTheme } from '@/hooks/useTheme'
import { toast } from 'sonner'

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
  const { user, verificationStatus } = useAuthStore()
  const { theme, toggleTheme, isDark } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [cooldownMs, setCooldownMs] = useState<number>(getResendCooldownRemaining())
  const [showSecurityDetails, setShowSecurityDetails] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Enhanced Navigation */}
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
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    Welcome, {user.email?.split('@')[0]}
                  </span>
                  <VerificationIndicator size="sm" />
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
          </div>
        </div>
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                aria-label="Resend verification email"
              >
                {resendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  resendLabel
                )}
              </button>
              <button
                onClick={() => setShowVerificationOverlay(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-2 px-4 rounded-lg"
                aria-label="Close verification overlay"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account preferences and application settings</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {status && (
          <div className={`mb-6 p-4 rounded-lg border ${status.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' 
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {status.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              <span className="font-medium">{status.message}</span>
            </div>
          </div>
        )}

        {/* Security Status Overview */}
        {user && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account Security
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                securityStatus.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                securityStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
              }`}>
                {securityStatus.level === 'high' ? 'High' : securityStatus.level === 'medium' ? 'Medium' : 'Low'}
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{securityStatus.message}</p>
            
            {showSecurityDetails && (
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Email Verification</span>
                  <div className="flex items-center gap-2">
                    {verified ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Verified</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-600 dark:text-yellow-400">Not Verified</span>
                      </>
                    )}
                  </div>
                </div>
                
                {verificationStatus && (
                  <>
                    {verificationStatus.verification_timestamp && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Verified On</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {new Date(verificationStatus.verification_timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {verificationStatus.has_valid_token && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Token Status</span>
                        <span className="text-blue-600 dark:text-blue-400">Valid until {new Date(verificationStatus.token_expires_at).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Settings Categories */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No settings found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search query or browse all settings.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        {category.icon}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{category.title}</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{category.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => restoreDefaults(category.id)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Restore ${category.title} defaults`}
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
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white">{setting.title}</h3>
                            {setting.tooltip && (
                              <div className="group relative">
                                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
                                  {setting.tooltip}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{setting.description}</p>
                          
                          {setting.type === 'info' && setting.value && (
                            <div className="mt-3">
                              {setting.id === 'email-verification' && (
                                <div className="flex items-center gap-2">
                                  {setting.value === 'verified' ? (
                                    <>
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                      <span className="text-green-600 dark:text-green-400 font-medium">Email Verified</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-5 h-5 text-red-500" />
                                      <span className="text-red-600 dark:text-red-400 font-medium">Email Not Verified</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          {setting.type === 'toggle' && (
                            <button
                              onClick={() => setting.onChange?.(!setting.value)}
                              disabled={setting.disabled}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                setting.value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                              } ${setting.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              role="switch"
                              aria-checked={setting.value}
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
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                setting.dangerous
                                  ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/20 dark:hover:bg-red-900/30 focus:ring-red-500'
                                  : 'text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 focus:ring-blue-500'
                              } ${setting.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {setting.id === 'resend-verification' && resendingEmail ? (
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Sending...
                                </div>
                              ) : (
                                setting.id === 'resend-verification' ? resendLabel :
                                setting.id === 'security-status' ? (showSecurityDetails ? 'Hide Details' : 'Show Details') :
                                setting.title
                              )}
                            </button>
                          )}
                          
                          {setting.type === 'select' && setting.options && (
                            <select
                              value={setting.value}
                              onChange={(e) => setting.onChange?.(e.target.value)}
                              disabled={setting.disabled}
                              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {setting.options.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {user && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={handleResendVerification}
              disabled={resendDisabled || verified}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Resend Verification</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {verified ? 'Already verified' : resendLabel}
                  </div>
                </div>
              </div>
            </button>
            
            <button
               onClick={toggleTheme}
               className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
             >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-yellow-600" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Toggle Theme</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Switch to {theme === 'dark' ? 'light' : 'dark'} mode
                  </div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => {
                if (confirm('Are you sure you want to log out?')) {
                  // Trigger logout through LogoutButton component
                  const logoutButton = document.querySelector('[data-logout-button]')
                  if (logoutButton instanceof HTMLButtonElement) {
                    logoutButton.click()
                  }
                }
              }}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 text-red-600">🚪</div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Sign Out</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Log out of your account</div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
