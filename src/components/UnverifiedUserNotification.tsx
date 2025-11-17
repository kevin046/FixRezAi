import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isVerified } from '@/lib/auth'
import { AlertCircle, X, Mail, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import ErrorMessage from '@/components/ErrorMessage'
import { LoadingDots } from '@/components/ProgressIndicator'

interface UnverifiedUserNotificationProps {
  className?: string
  onResendVerification?: () => void
  onDismiss?: () => void
}

export default function UnverifiedUserNotification({ 
  className, 
  onResendVerification,
  onDismiss 
}: UnverifiedUserNotificationProps) {
  const { user, verificationStatus } = useAuthStore()
  const [isVisible, setIsVisible] = useState(true)
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string; errorType?: string } | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  // Check if user is verified
  const isUserVerified = user ? isVerified(user) : true
  const lastSentAt = verificationStatus?.verification_timestamp
  
  // Calculate time since last verification email was sent
  const getTimeSinceLastSent = () => {
    if (!lastSentAt) return null
    const lastSent = new Date(lastSentAt)
    const now = new Date()
    const diffMs = now.getTime() - lastSent.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  // Handle resend verification email
  const handleResendVerification = async () => {
    if (isResending) return
    
    setIsResending(true)
    setResendStatus(null)
    
    try {
      const { resendRegistrationVerification } = await import('@/lib/emailVerification')
      const result = await resendRegistrationVerification(user?.email)
      
      if (result.success) {
        setResendStatus({ 
          type: 'success', 
          message: 'Verification email sent! Check your inbox (and spam folder).'
        })
        // Start cooldown timer (3 per hour = 20 minutes between resends)
        setCooldownSeconds(1200) // 20 minutes
        
        // Trigger parent callback if provided
        if (onResendVerification) {
          onResendVerification()
        }
      } else {
        // Handle specific error types
        const errorType = result.error_code === 'RATE_LIMIT_EXCEEDED' ? 'rate_limit' : 'generic'
        setResendStatus({ 
          type: 'error', 
          message: result.message || 'Failed to send verification email. Please try again.',
          errorType
        })
      }
    } catch (error) {
      console.error('Failed to resend verification:', error)
      setResendStatus({ 
        type: 'error', 
        message: 'Failed to send verification email. Please try again.',
        errorType: 'generic'
      })
    } finally {
      setIsResending(false)
    }
  }

  // Handle dismiss notification
  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
    // Store dismissal time in localStorage to prevent immediate re-show
    localStorage.setItem('unverified_notification_dismissed', Date.now().toString())
  }

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [cooldownSeconds])

  // Don't show if user is verified or notification was recently dismissed
  useEffect(() => {
    if (isUserVerified) {
      setIsVisible(false)
      return
    }

    // Check if notification was dismissed recently (within 1 hour)
    const dismissedAt = localStorage.getItem('unverified_notification_dismissed')
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      const now = Date.now()
      const oneHour = 60 * 60 * 1000
      
      if (now - dismissedTime < oneHour) {
        setIsVisible(false)
        return
      }
    }
    
    setIsVisible(true)
  }, [isUserVerified])

  // Don't render if user is verified or notification is dismissed
  if (isUserVerified || !isVisible || !user) {
    return null
  }

  const timeSinceLastSent = getTimeSinceLastSent()
  const canResend = cooldownSeconds === 0

  // Show enhanced error message for rate limit errors
  if (resendStatus?.errorType === 'rate_limit') {
    return (
      <ErrorMessage
        type="rate_limit"
        title="Too Many Requests"
        message={`${resendStatus.message}. You've reached the maximum number of verification email resends. Please wait before trying again.`}
        action={{
          label: 'Got it',
          onClick: () => setResendStatus(null),
        }}
        dismissible={true}
        onDismiss={handleDismiss}
        className={cn("fixed top-4 left-4 right-4 z-50 max-w-md", className)}
      />
    )
  }

  return (
    <div className={cn(
      "fixed top-4 left-4 right-4 z-50 bg-gradient-to-r from-amber-50 to-orange-50",
      "dark:from-amber-900/20 dark:to-orange-900/20",
      "border border-amber-200 dark:border-amber-700",
      "rounded-lg shadow-lg p-4 max-w-md",
      "animate-in slide-in-from-top-2 duration-300",
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Email Verification Required
            </h3>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
          </div>
          
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
            Please verify your email address to unlock all features and resume optimization tools.
          </p>

          {isResending && (
            <div className="mb-3">
              <LoadingDots
                size="sm"
                color="primary"
              />
              <span className="text-xs text-amber-700 dark:text-amber-300 ml-2">
                Sending verification email...
              </span>
            </div>
          )}

          {resendStatus && resendStatus.type === 'success' && (
            <div className={cn(
              "mb-3 p-2 rounded text-xs",
              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            )}>
              {resendStatus.message}
            </div>
          )}

          {resendStatus && resendStatus.type === 'error' && resendStatus.errorType !== 'rate_limit' && (
            <ErrorMessage
              type="generic"
              message={resendStatus.message}
              dismissible={true}
              onDismiss={() => setResendStatus(null)}
              className="mb-3"
            />
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleResendVerification}
              disabled={isResending || !canResend}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                "bg-amber-600 hover:bg-amber-700 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "dark:bg-amber-500 dark:hover:bg-amber-600"
              )}
            >
              <Mail className="w-4 h-4" />
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </button>

            {!canResend && (
              <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                <Clock className="w-3 h-3" />
                Next resend available in {Math.ceil(cooldownSeconds / 60)} minutes
              </div>
            )}

            {timeSinceLastSent && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Last sent: {timeSinceLastSent}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}