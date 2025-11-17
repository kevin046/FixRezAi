import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';

export type ErrorType = 'validation' | 'auth' | 'rate_limit' | 'network' | 'server' | 'token' | 'generic';

interface ErrorMessageProps {
  type: ErrorType;
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  autoHide?: number; // milliseconds
  onDismiss?: () => void;
  className?: string;
}

const errorConfig = {
  validation: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    title: 'Validation Error',
  },
  auth: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    title: 'Authentication Error',
  },
  rate_limit: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    title: 'Rate Limit Exceeded',
  },
  network: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    title: 'Network Error',
  },
  server: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    title: 'Server Error',
  },
  token: {
    icon: AlertCircle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    title: 'Token Error',
  },
  generic: {
    icon: AlertCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    title: 'Error',
  },
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type,
  title,
  message,
  action,
  dismissible = true,
  autoHide,
  onDismiss,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const config = errorConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} ${config.color}
        border rounded-lg p-4 shadow-sm
        animate-in slide-in-from-top-2 duration-300
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium mb-1">
            {title || config.title}
          </h3>
          <p className="text-sm opacity-90 leading-relaxed">
            {message}
          </p>
          
          {action && (
            <button
              onClick={action.onClick}
              className={`
                mt-2 text-sm font-medium underline hover:no-underline
                focus:outline-none focus:ring-2 focus:ring-offset-1
                ${config.color} focus:ring-current
              `}
            >
              {action.label}
            </button>
          )}
        </div>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 p-1 rounded-md hover:bg-black hover:bg-opacity-10
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${config.color} focus:ring-current
              transition-colors duration-200
            `}
            aria-label="Dismiss error message"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <ErrorMessage
                type="server"
                title="Application Error"
                message={
                  this.state.error?.message ||
                  'Something went wrong. Please try refreshing the page.'
                }
                action={{
                  label: 'Refresh Page',
                  onClick: () => window.location.reload(),
                }}
                dismissible={false}
              />
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorMessage;