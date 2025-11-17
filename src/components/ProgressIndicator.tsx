import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type ProgressVariant = 'spinner' | 'bar' | 'dots' | 'pulse';

interface ProgressIndicatorProps {
  variant?: ProgressVariant;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  message?: string;
  progress?: number; // 0-100 for bar variant
  indeterminate?: boolean;
  className?: string;
  showPercentage?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const colorClasses = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};

const barColorClasses = {
  primary: 'bg-blue-600',
  secondary: 'bg-gray-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  error: 'bg-red-600',
};

const Spinner: React.FC<{ size: keyof typeof sizeClasses; color: keyof typeof colorClasses }> = ({ size, color }) => (
  <div className={cn('relative', sizeClasses[size], colorClasses[color])}>
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
);

const InternalProgressBar: React.FC<{ 
  progress?: number; 
  color: keyof typeof barColorClasses; 
  indeterminate?: boolean;
  showPercentage?: boolean;
}> = ({ progress = 0, color, indeterminate = false, showPercentage = false }) => (
  <div className="w-full">
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300 ease-out',
          barColorClasses[color],
          indeterminate ? 'animate-pulse w-1/3' : ''
        )}
        style={indeterminate ? {} : { width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    {showPercentage && !indeterminate && (
      <div className="text-xs text-gray-600 mt-1 text-center">
        {Math.round(progress)}%
      </div>
    )}
  </div>
);

const Dots: React.FC<{ size: keyof typeof sizeClasses; color: keyof typeof colorClasses }> = ({ size, color }) => {
  const dotSize = size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4';
  
  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            dotSize,
            colorClasses[color],
            'rounded-full animate-bounce'
          )}
          style={{
            animationDelay: `${index * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
};

const Pulse: React.FC<{ size: keyof typeof sizeClasses; color: keyof typeof colorClasses }> = ({ size, color }) => (
  <div className={cn('relative', sizeClasses[size])}>
    <div className={cn(
      'absolute inset-0 rounded-full opacity-75 animate-ping',
      colorClasses[color]
    )} />
    <div className={cn(
      'relative rounded-full',
      size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4',
      colorClasses[color]
    )} />
  </div>
);

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  message,
  progress,
  indeterminate = false,
  className,
  showPercentage = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const renderVariant = () => {
    switch (variant) {
      case 'spinner':
        return <Spinner size={size} color={color} />;
      case 'bar':
        return (
          <InternalProgressBar 
            progress={progress} 
            color={color} 
            indeterminate={indeterminate}
            showPercentage={showPercentage}
          />
        );
      case 'dots':
        return <Dots size={size} color={color} />;
      case 'pulse':
        return <Pulse size={size} color={color} />;
      default:
        return <Spinner size={size} color={color} />;
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {renderVariant()}
      {message && (
        <span className="text-sm text-gray-600">
          {message}
        </span>
      )}
    </div>
  );
};

// Convenience components for common use cases
export const LoadingSpinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg'; 
  message?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}> = ({ size = 'md', message, color = 'primary' }) => (
  <ProgressIndicator variant="spinner" size={size} color={color} message={message} />
);

export const ProgressBar: React.FC<{ 
  progress: number; 
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showPercentage?: boolean;
}> = ({ progress, color = 'primary', showPercentage = false }) => (
  <ProgressIndicator 
    variant="bar" 
    color={color} 
    progress={progress} 
    showPercentage={showPercentage}
  />
);

export const LoadingDots: React.FC<{ 
  size?: 'sm' | 'md' | 'lg'; 
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}> = ({ size = 'md', color = 'primary' }) => (
  <ProgressIndicator variant="dots" size={size} color={color} />
);

export default ProgressIndicator;