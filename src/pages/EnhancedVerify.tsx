/**
 * Enhanced Verification Page
 * Provides comprehensive verification status display and user feedback
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, Mail, Clock, RefreshCw, Shield } from 'lucide-react';
 
import VerificationErrorHandler from '@/components/VerificationErrorHandler';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface VerificationResult {
  success: boolean;
  message: string;
  timestamp?: string;
  tokenId?: string;
  auditLogId?: string;
}

const EnhancedVerify: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, verifyEmail, createVerificationToken, fetchVerificationStatus, error, clearError } = useAuthStore();
  
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const token = searchParams.get('token');
  const userId = searchParams.get('user_id');
  const tokenId = searchParams.get('token_id');

  useEffect(() => {
    if (token) {
      verifyEmailToken();
    } else if (isAuthenticated && user?.id) {
      // Show current verification status for authenticated user
      fetchVerificationStatus(user.id);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [token, isAuthenticated, user?.id]);

  const verifyEmailToken = async () => {
    try {
      setLoading(true);
      clearError();
      
      // Use the new verification system
      await verifyEmail(token!);
      
      setVerificationResult({
        success: true,
        message: 'Email verification successful! Your account is now verified.',
        timestamp: new Date().toISOString()
      });
      
      // Refresh verification status after successful verification
      if (user?.id) {
        await fetchVerificationStatus(user.id);
      }
      
      // Show success toast
      toast.success('Email verified successfully!');
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error: any) {
      console.error('Verification error:', error);
      
      let errorMessage = 'Email verification failed.';
      
      if (error.message?.includes('expired')) {
        errorMessage = 'The verification token has expired. Please request a new verification email.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'The verification token is invalid. Please request a new verification email.';
      } else if (error.message?.includes('already verified')) {
        errorMessage = 'Your email is already verified.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setVerificationResult({
        success: false,
        message: errorMessage
      });
      
      // Show error toast
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const refreshUserData = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (currentUser && !error) {
        useAuthStore.getState().setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const resendVerificationEmail = async () => {
    if (!user) return;
    
    try {
      setSendingEmail(true);
      clearError();
      
      // Use the new verification system to create a token
      await createVerificationToken(user.email, 'email');
      
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      
      let errorMessage = 'Failed to send verification email.';
      
      if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (error.message?.includes('already verified')) {
        errorMessage = 'Your email is already verified.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSendingEmail(false);
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  const goToLogin = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Email Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Secure your account with email verification
          </p>
        </div>

        {/* Error Handler */}
        <VerificationErrorHandler 
          className="mb-6"
          onRetry={() => token && verifyEmailToken()}
          onRequestNewToken={resendVerificationEmail}
          showDetails={showDetails}
        />

        {/* Current Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Verification Status
            </h2>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          

          {verificationResult && (
            <div className={`p-4 rounded-lg border ${verificationResult.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'} mb-4`}>
              <div className="flex items-center">
                {verificationResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                )}
                <p className={`font-medium ${verificationResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {verificationResult.message}
                </p>
              </div>
              
              {verificationResult.timestamp && (
                <p className="text-sm text-gray-600 mt-2">
                  Verified at: {new Date(verificationResult.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Resend Verification */}
          {user && !verificationResult?.success && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <Mail className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Resend Verification Email
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Didn't receive the verification email? We can send you a new one.
              </p>
              <button
                onClick={resendVerificationEmail}
                disabled={sendingEmail}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Email'
                )}
              </button>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Security
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Email verification helps protect your account and enables access to all features.
            </p>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Enhanced account security</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Access to premium features</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Priority customer support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {verificationResult?.success ? (
            <button
              onClick={goToDashboard}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={goToLogin}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Back to Login
              </button>
              {user && (
                <button
                  onClick={resendVerificationEmail}
                  disabled={sendingEmail}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Resend Email
                </button>
              )}
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Need help? Contact support at help@fixrez.ai</p>
          <p className="mt-1">Verification tokens expire after 24 hours for security reasons.</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedVerify;
