/**
 * Verification Status Indicator Component
 * Displays prominent visual indicators for user verification status with tooltips
 */

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
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
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const showTooltipEnabled = showTooltipProp;
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({});
  const [arrowOffsetPercent, setArrowOffsetPercent] = useState<number>(50);

  useEffect(() => {
    if (user) {
      // Use verification status from auth store if available
      if (authVerificationStatus) {
        setVerificationStatus({
          isVerified: Boolean(authVerificationStatus.verified || user?.email_confirmed_at),
          verifiedAt: authVerificationStatus.verification_timestamp || (user?.email_confirmed_at ?? null),
          verificationMethod: authVerificationStatus.verification_method || (user?.email_confirmed_at ? 'supabase_email' : null),
          hasValidToken: !!authVerificationStatus.verification_token_id,
          tokenExpiresAt: authVerificationStatus.verification_metadata?.expires_at || null
        });
        setLoading(false);
      } else {
        // Fetch verification status if not available
        fetchVerificationStatus();
      }
    } else {
      setLoading(false);
    }
  }, [user, authVerificationStatus]);

  const fetchVerificationStatus = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      await useAuthStore.getState().fetchVerificationStatus(user.id);
    } catch (error) {
      console.error('Failed to fetch verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  };

  const buildVerifiedTooltip = (vs: VerificationStatus) => {
    const dateText = formatDate(vs.verifiedAt);
    const parts: string[] = [];
    if (dateText) parts.push(`on ${dateText}`);
    return parts.length ? `Email verified ${parts.join(' ')}` : 'Email verified';
  };

  const buildPendingTooltip = (vs: VerificationStatus) => {
    const expText = formatDate(vs.tokenExpiresAt);
    return expText
      ? `Check your email for verification link (expires ${expText})`
      : 'Check your email for verification link';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          icon: 'w-4 h-4',
          text: 'text-xs',
          padding: 'px-2 py-1',
          gap: 'gap-1'
        };
      case 'lg':
        return {
          icon: 'w-6 h-6',
          text: 'text-base',
          padding: 'px-4 py-2',
          gap: 'gap-3'
        };
      case 'md':
      default:
        return {
          icon: 'w-5 h-5',
          text: 'text-sm',
          padding: 'px-3 py-1.5',
          gap: 'gap-2'
        };
    }
  };

  const computeTooltipPosition = () => {
    const margin = 10;
    const gap = 8;
    const container = containerRef.current;
    const tooltip = tooltipRef.current;
    if (!container || !tooltip) return;

    const containerRect = container.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let position: 'top' | 'bottom' = tooltipPosition;

    const preferredTopTop = containerRect.top - tooltipRect.height - gap;
    const preferredTopBottom = containerRect.bottom + gap;

    let top = position === 'top' ? preferredTopTop : preferredTopBottom;
    let left = containerRect.left + (containerRect.width / 2) - (tooltipRect.width / 2);

    const maxTop = window.innerHeight - margin - tooltipRect.height;
    const maxLeft = window.innerWidth - margin - tooltipRect.width;

    // Flip if clipped vertically
    if (top < margin) {
      position = 'bottom';
      top = preferredTopBottom;
    } else if (top > maxTop) {
      position = 'top';
      top = preferredTopTop;
    }

    // Clamp within viewport
    top = Math.min(Math.max(top, margin), maxTop);
    left = Math.min(Math.max(left, margin), maxLeft);

    // Arrow offset relative to tooltip
    const containerCenterX = containerRect.left + (containerRect.width / 2);
    const offsetPercent = ((containerCenterX - left) / tooltipRect.width) * 100;
    const clampedOffset = Math.max(5, Math.min(95, offsetPercent));

    setTooltipPosition(position);
    setArrowOffsetPercent(clampedOffset);
    setTooltipStyle({ position: 'fixed', top, left, zIndex: 9999 } as CSSProperties);
  };

  useEffect(() => {
    if (!showTooltip) return;
    // Recompute on show and when viewport changes
    const handler = () => computeTooltipPosition();
    // Initial compute
    handler();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [showTooltip, tooltipPosition]);

  const getStatusConfig = () => {
    const { isLoading, error } = useAuthStore.getState();
    
    if (loading || isLoading) {
      return {
        icon: Clock,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        text: 'Checking status...',
        tooltip: 'Loading verification status'
      };
    }

    if (error) {
      return {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        text: 'Error',
        tooltip: `Failed to load verification status: ${error}`
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
        tooltip: buildVerifiedTooltip(verificationStatus)
      };
    }

    if (verificationStatus?.hasValidToken) {
      return {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        text: 'Verification pending',
        tooltip: buildPendingTooltip(verificationStatus)
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

  const config = getStatusConfig();
  const sizeClasses = getSizeClasses();
  const IconComponent = config.icon;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className={`
          inline-flex items-center ${sizeClasses.gap} ${sizeClasses.padding}
          rounded-lg border ${config.borderColor} ${config.bgColor}
          transition-all duration-200 hover:shadow-sm
          ${showTooltip ? 'cursor-help' : ''}
        `}
        onMouseEnter={() => {
          if (showTooltipEnabled) {
            // Coarse pre-selection of position based on available space
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const spaceAbove = rect.top;
              const spaceBelow = window.innerHeight - rect.bottom;
              setTooltipPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
            }
            setShowTooltip(true);
            // Fine positioning happens in effect using measured tooltip size
          }
        }}
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
          ref={tooltipRef}
          className={`
            fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg
            ${showTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'}
            transition-opacity duration-200
            whitespace-nowrap max-w-xs sm:max-w-sm md:max-w-md
            pointer-events-none
            break-words
          `}
          style={tooltipStyle}
        >
          {config.tooltip}
          <div 
            className={`absolute ${
              tooltipPosition === 'top' 
                ? 'top-full -mt-1' 
                : 'bottom-full -mb-1'
            }`}
            style={{ left: `${arrowOffsetPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div className={`w-0 h-0 border-l-4 border-r-4 ${
              tooltipPosition === 'top' 
                ? 'border-t-4 border-transparent border-t-gray-900' 
                : 'border-b-4 border-transparent border-b-gray-900'
            }`}></div>
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

            
            {verificationStatus.hasValidToken && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Token expires:</span>
                <span className="text-yellow-600">
                  {verificationStatus.tokenExpiresAt ? new Date(verificationStatus.tokenExpiresAt).toLocaleString() : '—'}
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
