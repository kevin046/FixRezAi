import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Mail, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface VerificationErrorHandlerProps {
  className?: string;
  onRetry?: () => void;
  onRequestNewToken?: () => void;
  showDetails?: boolean;
}

// Rename to avoid collision with store's VerificationError type
interface ParsedVerificationError {
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
  const [parsedError, setParsedError] = useState<ParsedVerificationError | null>(null);

  useEffect(() => {
    if (error || verificationErrors.length > 0) {
      const latestError = error || verificationErrors[verificationErrors.length - 1];
      setParsedError(parseVerificationError(latestError));
    } else {
      setParsedError(null);
    }
  }, [error, verificationErrors]);

  const parseVerificationError = (err: any): ParsedVerificationError => {
    if (!err) {
      return { type: 'unknown', message: 'Unknown error occurred' };
    }

    // Support both string and object errors
    if (typeof err === 'string') {
      return { type: 'unknown', message: err };
    }

    // Prefer `error_message` if present (from audit log)
    const message = err.error_message || err.message || 'An error occurred';
    const type: ParsedVerificationError['type'] =
      (err.error_type as ParsedVerificationError['type']) ||
      (err.type as ParsedVerificationError['type']) ||
      'unknown';

    return {
      type,
      message,
      details: err.details || err.metadata?.details || undefined,
      timestamp: err.timestamp ? new Date(err.timestamp) : undefined
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
        await createVerificationToken('email');
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
            Request New Code
          </button>
        );
      default:
        return (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            <AlertCircle className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            Dismiss
          </button>
        );
    }
  };

  // Helper to render any error shape safely
  const renderErrMessage = (err: unknown): string => {
    if (typeof err === 'string') return err;
    const anyErr = err as any;
    return anyErr?.error_message || anyErr?.message || 'Unknown error';
  };

  return (
    <div className={`p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="text-red-600 dark:text-red-400">
          {getErrorIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-red-800 dark:text-red-200">Verification Error</div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">{parsedError.message}</div>
            </div>
            <button
              onClick={() => clearError()}
              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {showDetails && parsedError.details && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
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
                  {renderErrMessage(err as unknown)}
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