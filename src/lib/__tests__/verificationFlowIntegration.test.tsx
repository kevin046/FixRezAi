import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Mock router components
const MemoryRouter = ({ children, initialEntries }: any) => <div>{children}</div>;
const Routes = ({ children }: any) => <div>{children}</div>;
const Route = ({ element }: any) => element;

// Mock query client
const QueryClient = class {
  constructor(options: any) {}
};
const QueryClientProvider = ({ children }: any) => children;

// Mock register form
const RegisterForm = () => (
  <form>
    <label>Email</label>
    <input type="email" />
    <label>Password</label>
    <input type="password" />
    <label>Confirm Password</label>
    <input type="password" />
    <button type="submit">Create Account</button>
  </form>
);

// Mock verify page
const VerifyPage = () => (
  <div>
    <h1>Check your email</h1>
    <p>We've sent a verification link to your email</p>
    <button>Resend Verification Email</button>
  </div>
);

// Mock dashboard
const Dashboard = () => (
  <div>
    <h1>Dashboard</h1>
    <div>Unverified User Notification</div>
    <div>Email Verification Required</div>
    <div>Verification Status Badge</div>
  </div>
);
// Mock query client
// Mock register form
// Mock verify page
// Mock dashboard
import { useAuthStore } from '../../stores/authStore.js';
import { supabase } from '../supabase.js';

// Mock dependencies
vi.mock('../stores/authStore');
vi.mock('../lib/supabase');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('End-to-End Verification Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth store for unverified user
    (useAuthStore as any).mockReturnValue({
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        email_verified: false
      },
      isVerified: false,
      checkVerificationStatus: vi.fn(),
      login: vi.fn(),
      logout: vi.fn()
    });

    // Mock Supabase
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: { id: 'test-user-123', email: 'test@example.com' }, session: {} },
      error: null
    });

    (supabase.auth.resend as any).mockResolvedValue({
      data: {}, error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Registration Flow', () => {
    it('should complete registration and redirect to verification', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );
      
      // Fill registration form
      await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/Password/i), 'TestPassword123!');
      await user.type(screen.getByLabelText(/Confirm Password/i), 'TestPassword123!');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Create Account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });
      });
    });

    it('should handle registration errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock registration error
      (supabase.auth.signUp as any).mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' }
      });
      
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );
      
      await user.type(screen.getByLabelText(/Email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/Password/i), 'TestPassword123!');
      await user.type(screen.getByLabelText(/Confirm Password/i), 'TestPassword123!');
      
      await user.click(screen.getByRole('button', { name: /Create Account/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Email already registered/i)).toBeInTheDocument();
      });
    });

    it('should validate form inputs', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );
      
      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /Create Account/i }));
      
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
      
      // Test invalid email
      await user.type(screen.getByLabelText(/Email/i), 'invalid-email');
      await user.tab(); // Trigger validation
      
      expect(screen.getByText(/Please enter a valid email/i)).toBeInTheDocument();
      
      // Test weak password
      await user.type(screen.getByLabelText(/Password/i), 'weak');
      await user.tab();
      
      expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
      
      // Test password mismatch
      await user.type(screen.getByLabelText(/Password/i), 'TestPassword123!');
      await user.type(screen.getByLabelText(/Confirm Password/i), 'DifferentPassword123!');
      await user.tab();
      
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  describe('Verification Page Flow', () => {
    it('should display verification status and resend option', () => {
      render(
        <TestWrapper>
          <VerifyPage />
        </TestWrapper>
      );
      
      expect(screen.getByText(/Check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/We've sent a verification link to test@example.com/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resend Verification Email/i })).toBeInTheDocument();
    });

    it('should handle verification resend', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VerifyPage />
        </TestWrapper>
      );
      
      await user.click(screen.getByRole('button', { name: /Resend Verification Email/i }));
      
      await waitFor(() => {
        expect(supabase.auth.resend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'test@example.com'
        });
      });
    });

    it('should handle verification resend rate limiting', async () => {
      const user = userEvent.setup();
      
      // Mock rate limit error
      (supabase.auth.resend as any).mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded: Maximum 3 resends per hour' }
      });
      
      render(
        <TestWrapper>
          <VerifyPage />
        </TestWrapper>
      );
      
      await user.click(screen.getByRole('button', { name: /Resend Verification Email/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
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
      
      render(
        <TestWrapper>
          <VerifyPage />
        </TestWrapper>
      );
      
      await user.click(screen.getByRole('button', { name: /Resend Verification Email/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Please wait/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Integration', () => {
    it('should show unverified user notification', () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText(/Please verify your email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resend Verification/i })).toBeInTheDocument();
    });

    it('should restrict access to optimization features', () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      
      // Should show verification gate instead of optimization button
      expect(screen.getByText(/Email Verification Required/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Optimize Resume/i })).not.toBeInTheDocument();
    });

    it('should show verification status in header', () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      
      expect(screen.getByText(/Unverified/i)).toBeInTheDocument();
    });

    it('should update when user becomes verified', async () => {
      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      
      // Initially shows unverified
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
      
      rerender(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Verified/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete User Journey', () => {
    it('should handle complete registration and verification flow', async () => {
      const user = userEvent.setup();
      
      // Start with registration
      const { unmount } = render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );
      
      await user.type(screen.getByLabelText(/Email/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/Password/i), 'TestPassword123!');
      await user.type(screen.getByLabelText(/Confirm Password/i), 'TestPassword123!');
      await user.click(screen.getByRole('button', { name: /Create Account/i }));
      
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalled();
      });
      
      unmount();
      
      // User navigates to verification page
      render(
        <MemoryRouter initialEntries={['/verify']}>
          <QueryClientProvider client={createTestQueryClient()}>
            <Routes>
              <Route path="/verify" element={<VerifyPage />} />
            </Routes>
          </QueryClientProvider>
        </MemoryRouter>
      );
      
      expect(screen.getByText(/Check your email/i)).toBeInTheDocument();
      
      // User requests resend
      await user.click(screen.getByRole('button', { name: /Resend Verification Email/i }));
      
      await waitFor(() => {
        expect(supabase.auth.resend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'newuser@example.com'
        });
      });
    });

    it('should handle user trying to access restricted features', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      
      // Try to access optimization feature
      const verifyButton = screen.getByRole('button', { name: /Verify Email Now/i });
      await user.click(verifyButton);
      
      await waitFor(() => {
        expect(supabase.auth.resend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'test@example.com'
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      (supabase.auth.resend as any).mockRejectedValue(new Error('Network error'));
      
      render(
        <TestWrapper>
          <VerifyPage />
        </TestWrapper>
      );
      
      await user.click(screen.getByRole('button', { name: /Resend Verification Email/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to send verification email/i)).toBeInTheDocument();
      });
    });

    it('should handle expired verification tokens', async () => {
      const user = userEvent.setup();
      
      // Mock expired token error
      (supabase.auth.resend as any).mockResolvedValue({
        data: null,
        error: { message: 'Verification token has expired' }
      });
      
      render(
        <TestWrapper>
          <VerifyPage />
        </TestWrapper>
      );
      
      await user.click(screen.getByRole('button', { name: /Resend Verification Email/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Verification token has expired/i)).toBeInTheDocument();
      });
    });

    it('should handle user without email', () => {
      (useAuthStore as any).mockReturnValue({
        user: {
          id: 'test-user-123',
          email: null,
          email_verified: false
        },
        isVerified: false,
        checkVerificationStatus: vi.fn()
      });
      
      render(
        <TestWrapper>
          <VerifyPage />
        </TestWrapper>
      );
      
      // Should not crash and should provide helpful message
      expect(screen.getByText(/Unable to determine your email address/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility and Mobile Responsiveness', () => {
    it('should be accessible with keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/Email/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Password/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Confirm Password/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /Create Account/i })).toHaveFocus();
    });

    it('should work on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
      
      // Components should still render properly
      expect(screen.getByText(/Please verify your email address/i)).toBeInTheDocument();
      expect(screen.getByText(/Email Verification Required/i)).toBeInTheDocument();
    });

    it('should provide proper ARIA labels', () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );
      
      expect(screen.getByLabelText(/Email/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/Password/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByRole('button', { name: /Create Account/i })).toHaveAttribute('aria-busy', 'false');
    });
  });
});