/**
 * Verification Status Indicator Component
 * Displays prominent visual indicators for user verification status with tooltips
 */

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, Shield, Info } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface VerificationStatus {
  isVerified: boolean;
  verifiedAt: string | null;
  verificationMethod: string | null;
  hasValidToken: boolean;
  tokenExpiresAt: string | null;
}

interface VerificationIndicatorProps {
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const VerificationIndicator: React.FC<VerificationIndicatorProps> = ({
  showDetails = false,
  size = 'md',
  showTooltip: showTooltipProp = true,
  className = ''
}) => {
  const { user, verificationStatus: authVerificationStatus } = useAuthStore();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const showTooltipEnabled = showTooltipProp;

  useEffect(() => {
    if (user) {
      // Use verification status from auth store if available
      if (authVerificationStatus) {
        setVerificationStatus({
          isVerified: authVerificationStatus.is_verified,
          verifiedAt: authVerificationStatus.verification_timestamp,
          verificationMethod: authVerificationStatus.verification_method,
          hasValidToken: authVerificationStatus.has_valid_token,
          tokenExpiresAt: authVerificationStatus.token_expires_at
        });
        setLoading(false);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user, authVerificationStatus]);

  const getStatusConfig = () => {
    if (loading) {
      return {
        icon: Clock,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        text: 'Checking status...',
        tooltip: 'Loading verification status'
      };
    }

    if (!user) {
      return {
        icon: Info,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        text: 'Not authenticated',
        tooltip: 'Please sign in to view verification status'
      };
    }

    if (verificationStatus?.isVerified) {
      return {
        icon: Shield,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        text: 'Verified',
        tooltip: `Email verified on ${formatDate(verificationStatus.verifiedAt)} via ${verificationStatus.verificationMethod}`
      };
    }

    if (verificationStatus?.hasValidToken) {
      return {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        text: 'Verification pending',
        tooltip: `Check your email for verification link (expires ${formatDate(verificationStatus.tokenExpiresAt)})`
      };
    }

    return {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      text: 'Not verified',
      tooltip: 'Your email is not verified. Please check your inbox or request a new verification email.'
    };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          icon: 'w-4 h-4',
          text: 'text-sm',
          padding: 'px-2 py-1',
          gap: 'gap-1'
        };
      case 'lg':
        return {
          icon: 'w-6 h-6',
          text: 'text-base',
          padding: 'px-4 py-2',
          gap: 'gap-2'
        };
      default:
        return {
          icon: 'w-5 h-5',
          text: 'text-sm',
          padding: 'px-3 py-1.5',
          gap: 'gap-2'
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = getSizeClasses();
  const IconComponent = config.icon;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          inline-flex items-center ${sizeClasses.gap} ${sizeClasses.padding}
          rounded-lg border ${config.borderColor} ${config.bgColor}
          transition-all duration-200 hover:shadow-sm
          ${showTooltip ? 'cursor-help' : ''}
        `}
        onMouseEnter={() => showTooltipEnabled && setShowTooltip(true)}
        onMouseLeave={() => showTooltipEnabled && setShowTooltip(false)}
      >
        <IconComponent className={`${sizeClasses.icon} ${config.color}`} />
        <span className={`${sizeClasses.text} font-medium ${config.color}`}>
          {config.text}
        </span>
        
        {verificationStatus?.isVerified && (
          <CheckCircle className={`w-4 h-4 ${config.color}`} />
        )}
      </div>

      {showTooltipEnabled && showTooltip && (
        <div
          className={`
            absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg
            ${showTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'}
            transition-opacity duration-200
            bottom-full left-1/2 transform -translate-x-1/2 mb-2
            whitespace-nowrap
          `}
        >
          {config.tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}

      {showDetails && verificationStatus && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={verificationStatus.isVerified ? 'text-green-600' : 'text-red-600'}>
                {verificationStatus.isVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
            
            {verificationStatus.verifiedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Verified:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {new Date(verificationStatus.verifiedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {verificationStatus.verificationMethod && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Method:</span>
                <span className="text-gray-900 dark:text-gray-100 capitalize">
                  {verificationStatus.verificationMethod.replace('_', ' ')}
                </span>
              </div>
            )}
            
            {verificationStatus.hasValidToken && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Token expires:</span>
                <span className="text-yellow-600">
                  {new Date(verificationStatus.tokenExpiresAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationIndicator;