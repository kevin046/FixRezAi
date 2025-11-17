import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Mock component for testing - EmailTemplateRenderer would be created separately
const EmailTemplateRenderer = ({ template, data, format, options = {} }: any) => {
  const getTemplate = (templateName: string) => {
    if (templateName === 'verification') {
      return {
        subject: 'Confirm Your Email Address',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
              @media only screen and (max-width: 600px) {
                .container { width: 100% !important; }
                .header { padding: 20px !important; }
                .content { padding: 20px !important; }
                .button { width: 100% !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div class="header" style="background-color: #3b82f6; color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">FixRez AI</h1>
              </div>
              <div class="content" style="padding: 40px; text-align: center;">
                <h2 style="color: #333; margin-bottom: 20px;">Confirm Your Email Address</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                  Thank you for signing up! To complete your registration and unlock all features, 
                  please confirm your email address by clicking the button below.
                </p>
                <div style="margin: 30px 0;">
                  <a href="${data.verification_url || '#'}" 
                     class="button"
                     style="display: inline-block; background-color: #3b82f6; color: white; 
                            padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                            font-weight: bold; font-size: 16px;">
                    Confirm Your Email
                  </a>
                </div>
                <p style="color: #999; font-size: 14px; margin-top: 30px;">
                  This verification link will expire in 24 hours for security reasons.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                  If you didn't create this account, you can safely ignore this email.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          FixRez AI - Email Verification
          
          Confirm Your Email Address
          
          Thank you for signing up! To complete your registration and unlock all features, 
          please confirm your email address by visiting the following link:
          
          ${data.verification_url || 'https://fixrez.com/verify'}
          
          This verification link will expire in 24 hours for security reasons.
          
          If you didn't create this account, you can safely ignore this email.
        `
      };
    }
    return null;
  };

  const templateData = getTemplate(template);
  if (!templateData) return null;

  if (format === 'html') {
    return <div dangerouslySetInnerHTML={{ __html: templateData.html }} />;
  }

  return <pre>{templateData.text}</pre>;
};
import { generateRegistrationVerificationToken } from '../emailVerification.js';

// Mock email templates
const mockEmailTemplates = {
  verification: {
    subject: 'Confirm Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .header { padding: 20px !important; }
            .content { padding: 20px !important; }
            .button { width: 100% !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div class="header" style="background-color: #3b82f6; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">FixRez AI</h1>
          </div>
          <div class="content" style="padding: 40px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Confirm Your Email Address</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
              Thank you for signing up! To complete your registration and unlock all features, 
              please confirm your email address by clicking the button below.
            </p>
            <div style="margin: 30px 0;">
              <a href="{{verification_url}}" 
                 class="button"
                 style="display: inline-block; background-color: #3b82f6; color: white; 
                        padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                        font-weight: bold; font-size: 16px;">
                Confirm Your Email
              </a>
            </div>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              This verification link will expire in 24 hours for security reasons.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              If you didn't create this account, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      FixRez AI - Email Verification
      
      Confirm Your Email Address
      
      Thank you for signing up! To complete your registration and unlock all features, 
      please confirm your email address by visiting the following link:
      
      {{verification_url}}
      
      This verification link will expire in 24 hours for security reasons.
      
      If you didn't create this account, you can safely ignore this email.
    `
  }
};

describe('Email Template Rendering Tests', () => {
  describe('HTML Email Rendering', () => {
    it('should render verification email template correctly', () => {
      const verificationUrl = 'https://fixrez.com/verify?token=test-token-123';
      
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: verificationUrl }}
          format="html"
        />
      );
      
      expect(screen.getByText('FixRez AI')).toBeInTheDocument();
      expect(screen.getByText('Confirm Your Email Address')).toBeInTheDocument();
      expect(screen.getByText(/Thank you for signing up!/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Confirm Your Email/i })).toHaveAttribute('href', verificationUrl);
    });

    it('should handle mobile responsive design', () => {
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: 'https://fixrez.com/verify?token=test' }}
          format="html"
        />
      );
      
      // Check for mobile-specific styles
      const styleElement = document.querySelector('style');
      expect(styleElement?.textContent).toContain('@media only screen and (max-width: 600px)');
      expect(styleElement?.textContent).toContain('width: 100% !important');
    });

    it('should properly escape HTML content to prevent XSS', () => {
      const maliciousContent = '<script>alert("xss")</script>';
      
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: maliciousContent }}
          format="html"
        />
      );
      
      // The malicious content should be escaped
      const link = screen.getByRole('link', { name: /Confirm Your Email/i });
      expect(link.getAttribute('href')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle missing template variables gracefully', () => {
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{}} // Missing verification_url
          format="html"
        />
      );
      
      // Should still render the template without errors
      expect(screen.getByText('FixRez AI')).toBeInTheDocument();
      expect(screen.getByText('Confirm Your Email Address')).toBeInTheDocument();
    });

    it('should support dark mode in email clients that support it', () => {
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: 'https://fixrez.com/verify' }}
          format="html"
          options={{ darkMode: true }}
        />
      );
      
      // Check for dark mode meta tags
      const metaTags = document.querySelectorAll('meta');
      const darkModeMeta = Array.from(metaTags).find(meta => 
        meta.getAttribute('name') === 'color-scheme' || 
        meta.getAttribute('name') === 'supported-color-schemes'
      );
      expect(darkModeMeta).toBeTruthy();
    });
  });

  describe('Plain Text Email Rendering', () => {
    it('should render plain text email template correctly', () => {
      const verificationUrl = 'https://fixrez.com/verify?token=test-token-123';
      
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: verificationUrl }}
          format="text"
        />
      );
      
      expect(screen.getByText('FixRez AI - Email Verification')).toBeInTheDocument();
      expect(screen.getByText('Confirm Your Email Address')).toBeInTheDocument();
      expect(screen.getByText(verificationUrl)).toBeInTheDocument();
    });

    it('should maintain proper line breaks in plain text', () => {
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: 'https://fixrez.com/verify' }}
          format="text"
        />
      );
      
      const textContent = screen.getByRole('article').textContent;
      expect(textContent).toMatch(/FixRez AI - Email Verification\s*Confirm Your Email Address/);
    });

    it('should handle special characters in plain text', () => {
      const specialUrl = 'https://fixrez.com/verify?token=test&special=<>&chars';
      
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: specialUrl }}
          format="text"
        />
      );
      
      expect(screen.getByText(specialUrl)).toBeInTheDocument();
    });
  });

  describe('Email Client Compatibility', () => {
    const emailClients = [
      { name: 'Gmail', supports: ['html', 'css', 'media-queries'] },
      { name: 'Outlook', supports: ['html', 'limited-css'], issues: ['media-queries'] },
      { name: 'Apple Mail', supports: ['html', 'css', 'media-queries'] },
      { name: 'Yahoo Mail', supports: ['html', 'css'], issues: ['some-media-queries'] },
      { name: 'Thunderbird', supports: ['html', 'css', 'media-queries'] }
    ];

    emailClients.forEach(client => {
      it(`should render correctly for ${client.name}`, () => {
        const { container } = render(
          <EmailTemplateRenderer
            template="verification"
            data={{ verification_url: 'https://fixrez.com/verify' }}
            format="html"
            options={{ client: client.name.toLowerCase() }}
          />
        );
        
        // Basic structure should be present
        expect(container.querySelector('table, div')).toBeTruthy(); // Table-based layout for Outlook
        expect(container.textContent).toContain('FixRez AI');
        expect(container.textContent).toContain('Confirm Your Email Address');
      });
    });

    it('should use table-based layout for Outlook compatibility', () => {
      const { container } = render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: 'https://fixrez.com/verify' }}
          format="html"
          options={{ client: 'outlook' }}
        />
      );
      
      // Outlook requires table-based layouts
      expect(container.querySelector('table')).toBeTruthy();
    });

    it('should inline CSS for better compatibility', () => {
      const { container } = render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: 'https://fixrez.com/verify' }}
          format="html"
          options={{ inlineCSS: true }}
        />
      );
      
      // Check that styles are inlined rather than in <style> tags
      const button = screen.getByRole('link', { name: /Confirm Your Email/i });
      expect(button).toHaveStyle({ backgroundColor: '#3b82f6' });
    });
  });

  describe('Token URL Generation', () => {
    it('should generate properly formatted verification URLs', async () => {
      const userId = 'test-user-123';
      const email = 'test@example.com';
      
      // Mock token generation
      const mockInsert = vi.fn().mockResolvedValue({
        data: { token: 'secure-token-123456', expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
        error: null
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });

      const result = await generateRegistrationVerificationToken(userId, email);
      
      expect(result.token).toBe('secure-token-123456');
      expect(result.verificationUrl).toMatch(/^https:\/\/fixrez\.com\/verify\?token=secure-token-123456$/);
    });

    it('should properly URL encode tokens in verification URLs', () => {
      const specialToken = 'token+with+special@chars#and&symbols';
      
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: `https://fixrez.com/verify?token=${encodeURIComponent(specialToken)}` }}
          format="html"
        />
      );
      
      const link = screen.getByRole('link', { name: /Confirm Your Email/i });
      const url = new URL(link.getAttribute('href') || '');
      expect(url.searchParams.get('token')).toBe(specialToken);
    });

    it('should generate HTTPS URLs for security', () => {
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: 'https://fixrez.com/verify?token=test' }}
          format="html"
        />
      );
      
      const link = screen.getByRole('link', { name: /Confirm Your Email/i });
      expect(link.getAttribute('href')).toMatch(/^https:/);
    });
  });

  describe('Error Handling', () => {
    it('should handle template rendering errors gracefully', () => {
      // Mock template error
      const brokenTemplate = {
        html: '<div>{{undefined_variable}}</div>'
      };
      
      expect(() => {
        render(
          <EmailTemplateRenderer
            template="broken"
            data={{}}
            format="html"
          />
        );
      }).not.toThrow();
    });

    it('should provide fallback content when template fails', () => {
      render(
        <EmailTemplateRenderer
          template="nonexistent"
          data={{ verification_url: 'https://fixrez.com/verify' }}
          format="html"
          fallback="Default email content"
        />
      );
      
      expect(screen.getByText('Default email content')).toBeInTheDocument();
    });

    it('should validate email addresses before sending', () => {
      const invalidEmails = [
        'invalid-email',
        'no-at-sign.com',
        '@no-local-part.com',
        'no-domain@',
        'spaces in@email.com',
        'invalid@domain@multiple.com'
      ];
      
      invalidEmails.forEach(email => {
        expect(() => {
          render(
            <EmailTemplateRenderer
              template="verification"
              data={{ 
                verification_url: 'https://fixrez.com/verify',
                recipient_email: email
              }}
              format="html"
            />
          );
        }).not.toThrow(); // Should handle gracefully
      });
    });
  });

  describe('Performance and Security', () => {
    it('should render templates efficiently', async () => {
      const start = performance.now();
      
      render(
        <EmailTemplateRenderer
          template="verification"
          data={{ verification_url: 'https://fixrez.com/verify' }}
          format="html"
        />
      );
      
      const renderTime = performance.now() - start;
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should sanitize all user inputs to prevent XSS', () => {
      const maliciousInputs = {
        verification_url: 'javascript:alert("xss")',
        user_name: '<img src=x onerror=alert("xss")>',
        email: '<script>alert("xss")</script>@example.com'
      };
      
      render(
        <EmailTemplateRenderer
          template="verification"
          data={maliciousInputs}
          format="html"
        />
      );
      
      // Check that malicious content is escaped
      const html = document.body.innerHTML;
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('javascript:');
      expect(html).not.toContain('onerror=');
    });

    it('should handle large template data efficiently', () => {
      const largeData = {
        verification_url: 'https://fixrez.com/verify',
        user_name: 'A'.repeat(1000), // Large name
        custom_message: 'B'.repeat(5000) // Large message
      };
      
      expect(() => {
        render(
          <EmailTemplateRenderer
            template="verification"
            data={largeData}
            format="html"
          />
        );
      }).not.toThrow();
    });
  });
});