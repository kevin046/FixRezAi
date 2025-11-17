import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Mock components for testing
import React from 'react';

const ProgressIndicator = ({ variant, size, text, ...props }: any) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div role="status" aria-live="polite" {...props}>
      {variant === 'spinner' && (
        <div data-testid="spinner" className={`animate-spin ${sizeClasses[size] || sizeClasses.md} border-2 border-blue-500 border-t-transparent rounded-full`} />
      )}
      {variant === 'bar' && (
        <div data-testid="bar" role="progressbar" className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${props.value}%` }} />
        </div>
      )}
      {variant === 'dots' && (
        <div data-testid="dots" className="flex space-x-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}
      {variant === 'pulse' && (
        <div data-testid="pulse" className="w-full h-2 bg-gray-200 rounded-full animate-pulse" />
      )}
      {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
    </div>
  );
};

const ErrorMessage = ({ type, title, message, errors, dismissible, onDismiss, autoDismiss, onAction, actionLabel, guidance, ...props }: any) => {
  const typeStyles = {
    validation: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    auth: 'border-red-200 bg-red-50 text-red-800',
    'rate-limit': 'border-orange-200 bg-orange-50 text-orange-800',
    network: 'border-blue-200 bg-blue-50 text-blue-800'
  };

  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);

  if (!show) return null;

  return (
    <div role="alert" className={`border rounded-lg p-4 ${typeStyles[type] || typeStyles.validation}`} {...props}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && <h3 className="font-semibold mb-1">{title}</h3>}
          {message && <p className="text-sm">{message}</p>}
          {errors && (
            <ul className="mt-2 text-sm list-disc list-inside">
              {errors.map((error: any, index: number) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          )}
          {guidance && <p className="mt-2 text-sm opacity-75">{guidance}</p>}
          {onAction && actionLabel && (
            <button onClick={onAction} className="mt-2 text-sm underline hover:no-underline">
              {actionLabel}
            </button>
          )}
        </div>
        {dismissible && onDismiss && (
          <button onClick={() => { setShow(false); onDismiss(); }} className="ml-2 text-lg leading-none">
            ×
          </button>
        )}
      </div>
    </div>
  );
};

import { supabase } from '../supabase.js';

// Mock Supabase
vi.mock('../lib/supabase');

describe('User Experience and Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Progress Indicator Component', () => {
    it('should show spinner variant during email sending', () => {
      render(<ProgressIndicator variant="spinner" size="md" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should show progress bar with percentage', () => {
      render(<ProgressIndicator variant="bar" value={75} size="md" />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should show dots variant for indeterminate progress', () => {
      render(<ProgressIndicator variant="dots" size="md" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByTestId('dots')).toBeInTheDocument();
    });

    it('should show pulse variant for subtle loading', () => {
      render(<ProgressIndicator variant="pulse" size="md" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByTestId('pulse')).toBeInTheDocument();
    });

    it('should support different sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      
      sizes.forEach(size => {
        const { container } = render(<ProgressIndicator variant="spinner" size={size} />);
        const spinner = screen.getByTestId('spinner');
        
        switch (size) {
          case 'sm':
            expect(spinner).toHaveClass('w-4', 'h-4');
            break;
          case 'md':
            expect(spinner).toHaveClass('w-6', 'h-6');
            break;
          case 'lg':
            expect(spinner).toHaveClass('w-8', 'h-8');
            break;
        }
      });
    });

    it('should be accessible with proper ARIA attributes', () => {
      render(<ProgressIndicator variant="spinner" size="md" aria-label="Loading verification email" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading verification email');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });

    it('should show loading text when provided', () => {
      render(<ProgressIndicator variant="spinner" size="md" text="Sending verification email..." />);
      
      expect(screen.getByText('Sending verification email...')).toBeInTheDocument();
    });
  });

  describe('Error Message Component', () => {
    it('should display validation errors with proper styling', () => {
      render(
        <ErrorMessage 
          type="validation"
          title="Validation Error"
          message="Please enter a valid email address"
        />
      );
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Validation Error')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      
      // Check for validation-specific styling
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-yellow-200', 'bg-yellow-50');
    });

    it('should display authentication errors', () => {
      render(
        <ErrorMessage 
          type="auth"
          title="Authentication Failed"
          message="Invalid email or password"
        />
      );
      
      expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-red-200', 'bg-red-50');
    });

    it('should display rate limit errors', () => {
      render(
        <ErrorMessage 
          type="rate-limit"
          title="Rate Limit Exceeded"
          message="Please wait 5 minutes before trying again"
        />
      );
      
      expect(screen.getByText('Rate Limit Exceeded')).toBeInTheDocument();
      expect(screen.getByText('Please wait 5 minutes before trying again')).toBeInTheDocument();
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-orange-200', 'bg-orange-50');
    });

    it('should display network errors', () => {
      render(
        <ErrorMessage 
          type="network"
          title="Network Error"
          message="Please check your internet connection"
        />
      );
      
      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(screen.getByText('Please check your internet connection')).toBeInTheDocument();
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-blue-200', 'bg-blue-50');
    });

    it('should be dismissible when specified', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      
      render(
        <ErrorMessage 
          type="validation"
          title="Error"
          message="Test error"
          dismissible
          onDismiss={onDismiss}
        />
      );
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should auto-dismiss after timeout when specified', async () => {
      const onDismiss = vi.fn();
      
      render(
        <ErrorMessage 
          type="validation"
          title="Error"
          message="Test error"
          autoDismiss={1000}
          onDismiss={onDismiss}
        />
      );
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it('should show action button when provided', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      
      render(
        <ErrorMessage 
          type="validation"
          title="Error"
          message="Test error"
          actionLabel="Retry"
          onAction={onAction}
        />
      );
      
      const actionButton = screen.getByRole('button', { name: /retry/i });
      await user.click(actionButton);
      
      expect(onAction).toHaveBeenCalled();
    });

    it('should handle multiple errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too weak' },
        { field: 'confirmPassword', message: 'Passwords do not match' }
      ];
      
      render(
        <ErrorMessage 
          type="validation"
          title="Multiple Validation Errors"
          errors={errors}
        />
      );
      
      expect(screen.getByText('Multiple Validation Errors')).toBeInTheDocument();
      errors.forEach(error => {
        expect(screen.getByText(error.message)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience Flows', () => {
    it('should show progress during email verification resend', async () => {
      const user = userEvent.setup();
      
      // Mock slow response
      (supabase.auth.resend as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 1000))
      );
      
      const { ResendVerificationButton } = createTestComponents();
      
      render(<ResendVerificationButton />);
      
      const button = screen.getByRole('button', { name: /resend verification/i });
      await user.click(button);
      
      // Should show progress indicator
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Email sent!')).toBeInTheDocument();
      });
    });

    it('should show appropriate error messages for different failure scenarios', async () => {
      const user = userEvent.setup();
      
      const errorScenarios = [
        {
          error: { message: 'Rate limit exceeded' },
          expectedType: 'rate-limit',
          expectedMessage: /rate limit/i
        },
        {
          error: { message: 'Network error' },
          expectedType: 'network',
          expectedMessage: /network/i
        },
        {
          error: { message: 'Invalid email format' },
          expectedType: 'validation',
          expectedMessage: /invalid email/i
        },
        {
          error: { message: 'Authentication failed' },
          expectedType: 'auth',
          expectedMessage: /authentication failed/i
        }
      ];
      
      for (const scenario of errorScenarios) {
        (supabase.auth.resend as any).mockResolvedValue({
          data: null,
          error: scenario.error
        });
        
        const { ResendVerificationButton } = createTestComponents();
        const { unmount } = render(<ResendVerificationButton />);
        
        await user.click(screen.getByRole('button', { name: /resend verification/i }));
        
        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument();
          expect(screen.getByText(scenario.expectedMessage)).toBeInTheDocument();
        });
        
        unmount();
      }
    });

    it('should provide helpful guidance for common issues', () => {
      const guidanceScenarios = [
        {
          error: 'Email not found',
          guidance: 'Please check your email address or create a new account'
        },
        {
          error: 'Token expired',
          guidance: 'Request a new verification email'
        },
        {
          error: 'Already verified',
          guidance: 'Your email is already verified. You can access all features.'
        },
        {
          error: 'Invalid token format',
          guidance: 'The verification link appears to be corrupted. Request a new one.'
        }
      ];
      
      guidanceScenarios.forEach(scenario => {
        const { unmount } = render(
          <ErrorMessage 
            type="validation"
            title={scenario.error}
            message={scenario.error}
            guidance={scenario.guidance}
          />
        );
        
        expect(screen.getByText(scenario.guidance)).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle retry logic with exponential backoff', async () => {
      const user = userEvent.setup();
      let attemptCount = 0;
      
      // Mock failing then succeeding
      (supabase.auth.resend as any).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({ data: null, error: { message: 'Temporary error' } });
        }
        return Promise.resolve({ data: {}, error: null });
      });
      
      const { ResendVerificationButtonWithRetry } = createTestComponents();
      render(<ResendVerificationButtonWithRetry />);
      
      await user.click(screen.getByRole('button', { name: /resend verification/i }));
      
      // Should show retry message
      await waitFor(() => {
        expect(screen.getByText(/retrying in/i)).toBeInTheDocument();
      });
      
      // Wait for retry attempts
      await waitFor(() => {
        expect(screen.getByText('Email sent!')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      expect(attemptCount).toBe(3);
    });
  });

  describe('Accessibility and Mobile Experience', () => {
    it('should be fully keyboard navigable', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <ProgressIndicator variant="spinner" size="md" />
          <ErrorMessage 
            type="validation"
            title="Test Error"
            message="Test message"
            dismissible
          />
        </div>
      );
      
      // Tab to dismiss button
      await user.tab();
      expect(screen.getByRole('button', { name: /dismiss/i })).toHaveFocus();
      
      // Activate with Enter
      await user.keyboard('{Enter}');
      
      // Progress indicator should be accessible
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('should work with screen readers', () => {
      render(
        <div>
          <ProgressIndicator 
            variant="spinner" 
            size="md" 
            aria-label="Loading verification email"
            text="Please wait while we send your verification email"
          />
          <ErrorMessage 
            type="validation"
            title="Email Verification Error"
            message="Unable to send verification email"
            role="alert"
          />
        </div>
      );
      
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading verification email');
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
      expect(screen.getByText('Please wait while we send your verification email')).toBeInTheDocument();
    });

    it('should be responsive on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      render(
        <div className="p-4">
          <ProgressIndicator variant="spinner" size="md" />
          <ErrorMessage 
            type="validation"
            title="Mobile Error"
            message="This should be readable on mobile"
          />
        </div>
      );
      
      // Components should still be visible and functional
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('This should be readable on mobile')).toBeInTheDocument();
    });
  });
});

// Test component helpers
function createTestComponents() {
  const ResendVerificationButton = () => {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    
    const handleResend = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.auth.resend({
          type: 'signup',
          email: 'test@example.com'
        });
        
        if (error) throw error;
        setSuccess(true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <div>
        {loading && (
          <ProgressIndicator 
            variant="spinner" 
            size="md" 
            text="Sending..." 
          />
        )}
        
        {error && (
          <ErrorMessage 
            type="validation"
            title="Error"
            message={error}
          />
        )}
        
        {success && (
          <div className="text-green-600">Email sent!</div>
        )}
        
        <button 
          onClick={handleResend}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Resend Verification
        </button>
      </div>
    );
  };
  
  const ResendVerificationButtonWithRetry = () => {
    const [loading, setLoading] = React.useState(false);
    const [retryCount, setRetryCount] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    
    const handleResend = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.auth.resend({
          type: 'signup',
          email: 'test@example.com'
        });
        
        if (error) throw error;
        setRetryCount(0);
      } catch (err: any) {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setError(`Retrying in ${Math.pow(2, retryCount)} seconds...`);
          
          setTimeout(() => {
            handleResend();
          }, Math.pow(2, retryCount) * 1000);
        } else {
          setError('Failed after 3 attempts');
        }
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <div>
        {loading && (
          <ProgressIndicator 
            variant="dots" 
            size="md" 
            text="Sending..." 
          />
        )}
        
        {error && (
          <ErrorMessage 
            type="validation"
            title="Error"
            message={error}
          />
        )}
        
        <button 
          onClick={handleResend}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Resend Verification
        </button>
      </div>
    );
  };
  
  return { ResendVerificationButton, ResendVerificationButtonWithRetry };
}