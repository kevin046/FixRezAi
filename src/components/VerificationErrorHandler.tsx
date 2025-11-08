import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Mail, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface VerificationErrorHandlerProps {
  className?: string;
  onRetry?: () => void;
  onRequestNewToken?: () => void;
  showDetails?: boolean;
}

interface VerificationError {
  type: 'network' | 'invalid_token' | 'expired_token' | 'rate_limit' | 'server_error' | 'unknown';
  message: string;
  details?: string;
  timestamp?: Date;
}

const VerificationErrorHandler: React.FC<VerificationErrorHandlerProps> = ({
  className = '',
  onRetry,
  onRequestNewToken,
  showDetails = false
}) => {
  const { error, verificationErrors, clearError, createVerificationToken, isLoading } = useAuthStore();
  const [isRetrying, setIsRetrying] = useState(false);
  const [parsedError, setParsedError] = useState<VerificationError | null>(null);

  useEffect(() => {
    if (error || verificationErrors.length > 0) {
      const latestError = error || verificationErrors[verificationErrors.length - 1];
      setParsedError(parseVerificationError(latestError));
    } else {
      setParsedError(null);
    }
  }, [error, verificationErrors]);

  const parseVerificationError = (error: any): VerificationError => {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const errorCode = error?.code || error?.status || '';
    
    if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        details: 'Please check your internet connection and try again.',
        timestamp: new Date()
      };
    }
    
    if (errorMessage.includes('invalid') || errorCode === 400) {
      return {
        type: 'invalid_token',
        message: 'Invalid verification token',
        details: 'The verification token is invalid or malformed. Please request a new verification email.',
        timestamp: new Date()
      };
    }
    
    if (errorMessage.includes('expired') || errorCode === 410) {
      return {
        type: 'expired_token',
        message: 'Verification token has expired',
        details: 'The verification token has expired. Please request a new verification email.',
        timestamp: new Date()
      };
    }
    
    if (errorCode === 429 || errorMessage.includes('rate limit')) {
      return {
        type: 'rate_limit',
        message: 'Too many requests',
        details: 'You\'ve made too many verification attempts. Please wait a few minutes before trying again.',
        timestamp: new Date()
      };
    }
    
    if (errorCode >= 500) {
      return {
        type: 'server_error',
        message: 'Server error occurred',
        details: 'There was a problem with our servers. Please try again in a few moments.',
        timestamp: new Date()
      };
    }
    
    return {
      type: 'unknown',
      message: errorMessage,
      details: 'An unexpected error occurred. Please try again.',
      timestamp: new Date()
    };
  };

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
        clearError();
      } catch (error) {
        console.error('Retry failed:', error);
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleRequestNewToken = async () => {
    if (onRequestNewToken) {
      setIsRetrying(true);
      try {
        await onRequestNewToken();
        clearError();
      } catch (error) {
        console.error('Failed to request new token:', error);
      } finally {
        setIsRetrying(false);
      }
    } else {
      // Fallback to store method
      setIsRetrying(true);
      try {
        await createVerificationToken();
        clearError();
      } catch (error) {
        console.error('Failed to create new token:', error);
      } finally {
        setIsRetrying(false);
      }
    }
  };

  if (!parsedError) {
    return null;
  }

  const getErrorIcon = () => {
    switch (parsedError.type) {
      case 'network':
        return <RefreshCw className="w-5 h-5" />;
      case 'invalid_token':
      case 'expired_token':
        return <Mail className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getErrorActions = () => {
    switch (parsedError.type) {
      case 'network':
        return (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry
          </button>
        );
      case 'invalid_token':
      case 'expired_token':
        return (
          <button
            onClick={handleRequestNewToken}
            disabled={isRetrying}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            <Mail className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            Request New Email
          </button>
        );
      case 'rate_limit':
        return (
          <div className="text-sm text-gray-500">
            Please wait a few minutes before trying again.
          </div>
        );
      default:
        return (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            Try Again
          </button>
        );
    }
  };

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="text-red-400">
            {getErrorIcon()}
          </div>
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              {parsedError.message}
            </h3>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {parsedError.details && (
            <div className="mt-1 text-sm text-red-700 dark:text-red-300">
              {parsedError.details}
            </div>
          )}
          
          {showDetails && parsedError.timestamp && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              Error occurred at {parsedError.timestamp.toLocaleTimeString()}
            </div>
          )}
          
          <div className="mt-3">
            {getErrorActions()}
          </div>
        </div>
      </div>
      
      {showDetails && verificationErrors.length > 1 && (
        <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
          <details className="text-sm">
            <summary className="cursor-pointer text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200">
              Show all errors ({verificationErrors.length})
            </summary>
            <div className="mt-2 space-y-2">
              {verificationErrors.map((err, index) => (
                <div key={index} className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                  {typeof err === 'string' ? err : err?.message}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default VerificationErrorHandler;