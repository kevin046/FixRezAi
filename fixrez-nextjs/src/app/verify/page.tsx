'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Loader2, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import SEO from '@/components/SEO'

export default function VerifyPage() {
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'error'>('pending')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit verification code')
      return
    }

    setIsLoading(true)
    setVerificationStatus('pending')

    try {
      const response = await fetch('/api/verification/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationCode,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setVerificationStatus('verified')
        alert('Email verified successfully!')
        
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        setVerificationStatus('error')
        alert(data.message || 'Invalid verification code')
      }
    } catch (error) {
      setVerificationStatus('error')
      alert('Failed to verify email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsSending(true)

    try {
      const response = await fetch('/api/verification/send-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'email_verification',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('A new verification code has been sent to your email')
        setVerificationCode('')
        setVerificationStatus('pending')
      } else {
        alert(data.message || 'Failed to resend verification code')
      }
    } catch (error) {
      alert('Failed to resend verification code. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <SEO 
        title="Verify Email - FixRez AI"
        description="Verify your email address to complete your FixRez AI account setup."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Verify Your Email
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Check your email for a verification code to complete your registration.
            </p>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Enter Verification Code
              </CardTitle>
              <CardDescription>
                We've sent a 6-digit code to your email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg font-mono"
                    disabled={verificationStatus === 'verified'}
                  />
                </div>

                {verificationStatus === 'error' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Invalid verification code. Please try again.
                    </p>
                  </div>
                )}

                {verificationStatus === 'verified' && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Email verified successfully! Redirecting...
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || verificationStatus === 'verified'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Didn't receive the code?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={isSending}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend Code'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}