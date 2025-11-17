import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isVerified } from '@/lib/auth'
import { Lock, Mail, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerificationGateProps {
  children: React.ReactNode
  featureName?: string
  className?: string
  onResendVerification?: () => void
}

export default function VerificationGate({ 
  children, 
  featureName = "this feature",
  className,
  onResendVerification 
}: VerificationGateProps) {
  const { user } = useAuthStore()
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Check if user is verified
  const isUserVerified = user ? isVerified(user) : true

  // Handle resend verification email - only for logged-in users
  const handleResendVerification = async () => {
    if (isResending || !user) return
    
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
    }
  }

  // If user is verified or no user is logged in, show the children content
  if (isUserVerified) {
    return <>{children}</>
  }

  // If user is logged in but not verified, show the verification gate
  return (
    <div className={cn(
      "relative bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed",
      "border-gray-300 dark:border-gray-600 p-6 text-center",
      className
    )}>
      <div className="flex flex-col items-center gap-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Verify Your Email to Access {featureName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
            Email verification is required to ensure account security and unlock all features including resume optimization tools.
          </p>
        </div>

        {resendStatus && (
          <div className={cn(
            "w-full max-w-xs p-3 rounded text-sm",
            resendStatus.type === 'success' 
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          )}>
            {resendStatus.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "dark:bg-blue-500 dark:hover:bg-blue-600"
            )}
          >
            <Mail className="w-4 h-4" />
            {isResending ? 'Sending...' : 'Resend Verification'}
          </button>
          
          <a
            href="/verify"
            className={cn(
              "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "bg-gray-100 hover:bg-gray-200 text-gray-900",
              "dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
            )}
          >
            Go to Verification
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Already verified? <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline">Refresh the page</a>
        </p>
      </div>

      {/* Overlay effect */}
      <div className="absolute inset-0 bg-white/20 dark:bg-gray-900/20 rounded-lg pointer-events-none" />
    </div>
  )
}