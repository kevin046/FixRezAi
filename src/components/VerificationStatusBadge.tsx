import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isVerified } from '@/lib/auth'
import { CheckCircle, XCircle, AlertTriangle, Clock, Mail, Shield, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerificationStatusBadgeProps {
  className?: string
  showDetails?: boolean
  compact?: boolean
  onResendVerification?: () => void
}

export default function VerificationStatusBadge({ 
  className, 
  showDetails = false, 
  compact = false,
  onResendVerification 
}: VerificationStatusBadgeProps) {
  const { user, verificationStatus } = useAuthStore()
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const isUserVerified = user ? isVerified(user) : false
  const lastVerifiedAt = verificationStatus?.verification_timestamp
  const verificationMethod = verificationStatus?.verification_method

  // Calculate time since verification
  const getTimeSinceVerification = () => {
    if (!lastVerifiedAt) return null
    const verifiedDate = new Date(lastVerifiedAt)
    const now = new Date()
    const diffMs = now.getTime() - verifiedDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  // Handle resend verification
  const handleResendVerification = async () => {
    if (isResending || !user?.email) return
    
    setIsResending(true)
    setResendStatus(null)
    
    try {
      const { resendRegistrationVerification } = await import('@/lib/emailVerification')
      const result = await resendRegistrationVerification(user.email)
      
      if (result.success) {
        setResendStatus({ 
          type: 'success', 
          message: 'Verification email sent! Check your inbox.'
        })
        
        // Trigger parent callback if provided
        if (onResendVerification) {
          onResendVerification()
        }
      } else {
        setResendStatus({ 
          type: 'error', 
          message: result.message || 'Failed to send verification email.'
        })
      }
    } catch (error) {
      console.error('Failed to resend verification:', error)
      setResendStatus({ 
        type: 'error', 
        message: 'Failed to send verification email.'
      })
    } finally {
      setIsResending(false)
      // Clear status after 5 seconds
      setTimeout(() => setResendStatus(null), 5000)
    }
  }

  const timeSinceVerification = getTimeSinceVerification()

  if (compact) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        isUserVerified 
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        className
      )}>
        {isUserVerified ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        {isUserVerified ? 'Verified' : 'Unverified'}
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg border p-4",
      isUserVerified 
        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
        : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full",
          isUserVerified 
            ? "bg-green-100 dark:bg-green-900/30"
            : "bg-amber-100 dark:bg-amber-900/30"
        )}>
          {isUserVerified ? (
            <Shield className={cn("w-5 h-5", isUserVerified ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")} />
          ) : (
            <AlertTriangle className={cn("w-5 h-5", "text-amber-600 dark:text-amber-400")} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className={cn(
              "text-sm font-semibold",
              isUserVerified ? "text-green-900 dark:text-green-100" : "text-amber-900 dark:text-amber-100"
            )}>
              {isUserVerified ? 'Email Verified' : 'Email Verification Required'}
            </h3>
            
            {!isUserVerified && (
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors",
                  "bg-amber-600 hover:bg-amber-700 text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "dark:bg-amber-500 dark:hover:bg-amber-600"
                )}
              >
                <Mail className="w-3 h-3" />
                {isResending ? 'Sending...' : 'Resend'}
              </button>
            )}
          </div>
          
          <p className={cn(
            "text-sm mb-2",
            isUserVerified ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"
          )}>
            {isUserVerified 
              ? 'Your email address has been verified and your account is secure.'
              : 'Please verify your email address to unlock all features and ensure account security.'
            }
          </p>

          {showDetails && (
            <div className="space-y-1 text-xs">
              {timeSinceVerification && (
                <div className={cn(
                  "flex items-center gap-1",
                  isUserVerified ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  <Clock className="w-3 h-3" />
                  {isUserVerified ? `Verified ${timeSinceVerification}` : `Last attempt ${timeSinceVerification}`}
                </div>
              )}
              
              {verificationMethod && (
                <div className={cn(
                  "flex items-center gap-1",
                  isUserVerified ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  <UserCheck className="w-3 h-3" />
                  Method: {verificationMethod.replace('_', ' ')}
                </div>
              )}
            </div>
          )}

          {resendStatus && (
            <div className={cn(
              "mt-2 p-2 rounded text-xs",
              resendStatus.type === 'success' 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            )}>
              {resendStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}