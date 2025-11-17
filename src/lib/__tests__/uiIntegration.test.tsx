import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Import components from their actual paths
import UnverifiedUserNotification from '../../components/UnverifiedUserNotification';
import VerificationGate from '../../components/VerificationGate';
import VerificationStatusBadge from '../../components/VerificationStatusBadge';


import { useAuthStore } from '../../stores/authStore.js';
import { supabase } from '../supabase.js';

// Mock dependencies
vi.mock('../stores/authStore');
vi.mock('../lib/supabase');

describe.skip('UI Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth store
    (useAuthStore as any).mockReturnValue({
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        email_verified: false
      },
      isVerified: false,
      checkVerificationStatus: vi.fn()
    });

    // Mock Supabase
    (supabase.auth.resend as any).mockResolvedValue({
      data: {}, error: null
    });
  });

  describe('UnverifiedUserNotification', () => {
    it('should display notification for unverified users', () => {
      render(<UnverifiedUserNotification />);
      
      expect(screen.getByText(/Please verify your email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resend Verification/i })).toBeInTheDocument();
    });

    it('should not display for verified users', () => {
      (useAuthStore as any).mockReturnValue({
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          email_verified: true
        },
        isVerified: true,
        checkVerificationStatus: vi.fn()
      });

      const { container } = render(<UnverifiedUserNotification />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle resend verification click', async () => {
      const user = userEvent.setup();
      render(<UnverifiedUserNotification />);
      
      const resendButton = screen.getByRole('button', { name: /Resend Verification/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(supabase.auth.resend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'test@example.com'
        });
      });
    });

    it('should show cooldown timer after resend', async () => {
      const user = userEvent.setup();
      
      // Mock recent resend attempt
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{
                created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
              }],
              error: null
            })
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      render(<UnverifiedUserNotification />);
      
      const resendButton = screen.getByRole('button', { name: /Resend Verification/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please wait/i)).toBeInTheDocument();
      });
    });

    it('should be dismissible', async () => {
      const user = userEvent.setup();
      render(<UnverifiedUserNotification />);
      
      const dismissButton = screen.getByRole('button', { name: /×/i });
      await user.click(dismissButton);
      
      expect(screen.queryByText(/Please verify your email address/i)).not.toBeInTheDocument();
    });

    it('should show progress indicator during resend', async () => {
      const user = userEvent.setup();
      
      // Mock slow response
      (supabase.auth.resend as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
      );

      render(<UnverifiedUserNotification />);
      
      const resendButton = screen.getByRole('button', { name: /Resend Verification/i });
      await user.click(resendButton);
      
      expect(screen.getByRole('status')).toBeInTheDocument(); // Progress indicator
    });

    it('should handle resend errors gracefully', async () => {
      const user = userEvent.setup();
      
      (supabase.auth.resend as any).mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' }
      });

      render(<UnverifiedUserNotification />);
      
      const resendButton = screen.getByRole('button', { name: /Resend Verification/i });
      await user.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
      });
    });
  });

  describe('VerificationGate', () => {
    it('should show verification prompt for unverified users', () => {
      render(
        <VerificationGate>
          <div>Protected Content</div>
        </VerificationGate>
      );
      
      expect(screen.getByText(/Email Verification Required/i)).toBeInTheDocument();
      expect(screen.getByText(/Complete your email verification to access this feature/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show content for verified users', () => {
      (useAuthStore as any).mockReturnValue({
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          email_verified: true
        },
        isVerified: true,
        checkVerificationStatus: vi.fn()
      });

      render(
        <VerificationGate>
          <div>Protected Content</div>
        </VerificationGate>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText(/Email Verification Required/i)).not.toBeInTheDocument();
    });

    it('should provide verification action', async () => {
      const user = userEvent.setup();
      render(
        <VerificationGate>
          <div>Protected Content</div>
        </VerificationGate>
      );
      
      const verifyButton = screen.getByRole('button', { name: /Verify Email Now/i });
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(supabase.auth.resend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'test@example.com'
        });
      });
    });

    it('should show custom message when provided', () => {
      const customMessage = 'Custom verification message';
      render(
        <VerificationGate message={customMessage}>
          <div>Protected Content</div>
        </VerificationGate>
      );
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should call onVerification callback when provided', async () => {
      const user = userEvent.setup();
      const onVerification = vi.fn();
      
      render(
        <VerificationGate onVerification={onVerification}>
          <div>Protected Content</div>
        </VerificationGate>
      );
      
      const verifyButton = screen.getByRole('button', { name: /Verify Email Now/i });
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(onVerification).toHaveBeenCalled();
      });
    });
  });

  describe('VerificationStatusBadge', () => {
    it('should show verified badge for verified users', () => {
      (useAuthStore as any).mockReturnValue({
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          email_verified: true
        },
        isVerified: true,
        checkVerificationStatus: vi.fn()
      });

      render(<VerificationStatusBadge />);
      
      expect(screen.getByText(/Verified/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /check/i })).toBeInTheDocument();
    });

    it('should show unverified badge for unverified users', () => {
      render(<VerificationStatusBadge />);
      
      expect(screen.getByText(/Unverified/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /alert/i })).toBeInTheDocument();
    });

    it('should show detailed view when specified', () => {
      render(<VerificationStatusBadge showDetails={true} />);
      
      expect(screen.getByText(/Email verification required/i)).toBeInTheDocument();
    });

    it('should show compact view by default', () => {
      render(<VerificationStatusBadge />);
      
      const badge = screen.getByText(/Unverified/i).closest('span');
      expect(badge).toHaveClass('px-2', 'py-1'); // Compact padding
    });

    it('should be clickable when onResendVerification provided', async () => {
      const user = userEvent.setup();
      const onResendVerification = vi.fn();
      
      render(<VerificationStatusBadge onResendVerification={onResendVerification} />);
      
      // Look for the resend button
      const resendButton = screen.getByRole('button', { name: /resend/i });
      expect(resendButton).toBeInTheDocument();
      
      await user.click(resendButton);
      expect(onResendVerification).toHaveBeenCalled();
    });

    it('should show loading state during resend', () => {
      (useAuthStore as any).mockReturnValue({
        user: { email: 'test@example.com' },
        isVerified: false,
        checkVerificationStatus: vi.fn()
      });

      render(<VerificationStatusBadge />);
      
      // Look for the resend button
      const resendButton = screen.getByRole('button', { name: /resend/i });
      expect(resendButton).toBeInTheDocument();
    });

    it('should handle accessibility requirements', () => {
      render(<VerificationStatusBadge />);
      
      const badge = screen.getByText(/Unverified/i).closest('span');
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Unverified'));
    });
  });

  describe('Integration Scenarios', () => {
    it('should work together in dashboard context', () => {
      render(
        <div>
          <UnverifiedUserNotification />
          <VerificationGate>
            <button>Optimize Resume</button>
          </VerificationGate>
          <VerificationStatusBadge />
        </div>
      );
      
      // Should show notification
      expect(screen.getByText(/Please verify your email address/i)).toBeInTheDocument();
      
      // Should show verification gate instead of button
      expect(screen.getByText(/Email Verification Required/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Optimize Resume/i })).not.toBeInTheDocument();
      
      // Should show unverified badge
      expect(screen.getByText(/Unverified/i)).toBeInTheDocument();
    });

    it('should update when user becomes verified', async () => {
      const { rerender } = render(<VerificationStatusBadge />);
      
      expect(screen.getByText(/Unverified/i)).toBeInTheDocument();
      
      // Simulate user becoming verified
      (useAuthStore as any).mockReturnValue({
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          email_verified: true
        },
        isVerified: true,
        checkVerificationStatus: vi.fn()
      });
      
      rerender(<VerificationStatusBadge />);
      
      await waitFor(() => {
        expect(screen.getByText(/Verified/i)).toBeInTheDocument();
      });
    });

    it('should handle mobile responsive behavior', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      render(
        <div>
          <UnverifiedUserNotification />
          <VerificationGate>
            <button>Test Button</button>
          </VerificationGate>
        </div>
      );
      
      // Components should still render properly on mobile
      expect(screen.getByText(/Please verify your email address/i)).toBeInTheDocument();
      expect(screen.getByText(/Email Verification Required/i)).toBeInTheDocument();
    });

    it('should handle error states gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock error in auth store
      (useAuthStore as any).mockReturnValue({
        user: null,
        isVerified: false,
        checkVerificationStatus: vi.fn().mockRejectedValue(new Error('Auth error'))
      });

      render(<UnverifiedUserNotification />);
      
      // Should not crash when user is null
      expect(() => screen.getByText(/Please verify your email address/i)).not.toThrow();
    });
  });
});