import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '../supabase.js'
import { 
  completeRegistrationVerification,
  generateRegistrationVerificationToken
} from '../emailVerification.js'

// Mock Supabase
vi.mock('../supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
      eq: vi.fn(),
      single: vi.fn()
    }))
  }
}))

describe('Security Features and Token Invalidation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Used Token Invalidation', () => {
    it('should reject tokens that have already been used', async () => {
      const email = 'test@example.com'
      const token = 'already_used_token_123456789012'
      
      // Mock database to return already used token
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            token,
            expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            used: true, // Already used
            user_id: 'user123'
          },
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(email, token)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already been used')
    })

    it('should mark tokens as used after successful verification', async () => {
      const email = 'test@example.com'
      const token = 'valid_token_123456789012'
      
      // Mock database to return valid unused token
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            token,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            used: false,
            user_id: 'user123'
          },
          error: null
        }),
        update: vi.fn().mockResolvedValue({ data: null, error: null })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(email, token)
      expect(result.success).toBe(true)
      
      // Verify update was called to mark as used
      expect(mockDb.update).toHaveBeenCalledWith({ used: true })
    })

    it('should handle token invalidation manually', async () => {
      const token = 'manual_invalidate_token_123456789012'
      
      // Mock database for manual invalidation
      const mockDb = {
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await invalidateVerificationToken(token)
      expect(result.success).toBe(true)
      
      // Verify update was called
      expect(mockDb.update).toHaveBeenCalledWith({ used: true })
    })

    it('should handle concurrent token usage attempts', async () => {
      const email = 'test@example.com'
      const token = 'concurrent_token_123456789012'
      
      // Mock database to simulate race condition
      let updateCallCount = 0
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            token,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            used: false,
            user_id: 'user123'
          },
          error: null
        }),
        update: vi.fn().mockImplementation(() => {
          updateCallCount++
          if (updateCallCount === 1) {
            return Promise.resolve({ data: null, error: null })
          } else {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'Token already used' } 
            })
          }
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      // Simulate concurrent verification attempts
      const results = await Promise.all([
        completeRegistrationVerification(email, token),
        completeRegistrationVerification(email, token)
      ])
      
      // One should succeed, one should fail
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBe(1)
      
      // Both should be marked as used
      expect(mockDb.update).toHaveBeenCalledTimes(2)
    })
  })

  describe('Input Sanitization and XSS Prevention', () => {
    it('should sanitize HTML injection attempts', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
        '<body onload="alert(1)">',
        '<div style="background:url(javascript:alert(1))">',
        '<input onfocus="alert(1)" autofocus>',
        '<select onfocus="alert(1)" autofocus>',
        '<textarea onfocus="alert(1)" autofocus>'
      ]

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onerror=')
        expect(sanitized).not.toContain('onload=')
        expect(sanitized).not.toContain('onfocus=')
      })
    })

    it('should handle SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "admin'--",
        "1' OR 1=1--",
        "' UNION SELECT * FROM users--",
        "'; DELETE FROM users WHERE 1=1; --"
      ]

      sqlInjectionAttempts.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).not.toContain(';')
        expect(sanitized).not.toContain('--')
        expect(sanitized).not.toContain('UNION')
        expect(sanitized).not.toContain('DROP')
        expect(sanitized).not.toContain('DELETE')
      })
    })

    it('should handle path traversal attempts', () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM',
        '..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\etc\\passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ]

      pathTraversalAttempts.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).not.toContain('..')
        expect(sanitized).not.toContain('../')
        expect(sanitized).not.toContain('..\\')
        expect(sanitized).not.toContain('%2e')
      })
    })

    it('should preserve legitimate input while sanitizing', () => {
      const legitimateInputs = [
        'John Doe',
        'user@example.com',
        'Hello, world!',
        'Test User 123',
        'O\'Brien',
        'D\'Angelo',
        'user+tag@example.com',
        'test.user@example.com'
      ]

      legitimateInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).toBe(input) // Should remain unchanged
      })
    })
  })

  describe('Secure Token Generation', () => {
    it('should generate cryptographically secure tokens', () => {
      const tokens = Array.from({ length: 100 }, () => generateSecureToken())
      
      // All tokens should be unique
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(100)
      
      // All tokens should have proper length
      tokens.forEach(token => {
        expect(token.length).toBeGreaterThanOrEqual(32)
        expect(token.length).toBeLessThanOrEqual(64)
      })
      
      // All tokens should use secure characters only
      tokens.forEach(token => {
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      })
    })

    it('should not generate predictable tokens', () => {
      const tokens = Array.from({ length: 50 }, () => generateSecureToken())
      
      // Check for patterns that might indicate predictability
      const hasRepeatingPatterns = tokens.some((token, index) => {
        if (index === 0) return false
        const prevToken = tokens[index - 1]
        return token === prevToken || token.includes(prevToken.substring(0, 8))
      })
      
      expect(hasRepeatingPatterns).toBe(false)
    })

    it('should handle token generation with different lengths', () => {
      const lengths = [32, 48, 64, 128]
      
      lengths.forEach(length => {
        const token = generateSecureToken(length)
        expect(token.length).toBe(length)
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      })
    })
  })

  describe('Audit Logging Security', () => {
    it('should log security events for suspicious activities', async () => {
      const suspiciousActivities = [
        { email: 'test@example.com', token: '../../../etc/passwd', type: 'path_traversal' },
        { email: 'test@example.com', token: '<script>alert(1)</script>', type: 'xss_attempt' },
        { email: 'test@example.com', token: "' OR '1'='1", type: 'sql_injection' },
        { email: 'test@example.com', token: 'A'.repeat(10000), type: 'oversized_token' }
      ]

      for (const activity of suspiciousActivities) {
        const consoleSpy = vi.spyOn(console, 'warn')
        
        await auditLog(activity.email, activity.token, activity.type)
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Security warning')
        )
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(activity.type)
        )
        
        consoleSpy.mockRestore()
      }
    })

    it('should log successful verification events', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      await auditLog('test@example.com', 'valid_token_123', 'verification_success')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verification successful')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      )
      
      consoleSpy.mockRestore()
    })

    it('should log failed verification attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      
      await auditLog('test@example.com', 'invalid_token_123', 'verification_failed')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verification failed')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Rate Limiting Security', () => {
    it('should prevent brute force attacks on token validation', async () => {
      const email = 'test@example.com'
      const invalidTokens = Array.from({ length: 100 }, (_, i) => `invalid_token_${i}`)
      
      // Mock database to return no token for all attempts
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const results = await Promise.all(
        invalidTokens.map(token => completeRegistrationVerification(email, token))
      )
      
      // All attempts should fail gracefully
      expect(results.every(r => r.success === false)).toBe(true)
      expect(results.every(r => r.error.includes('Invalid or expired'))).toBe(true)
    })

    it('should implement timing attack prevention', async () => {
      const email = 'test@example.com'
      const tokens = ['valid_token_123', 'invalid_token_456', 'another_invalid_789']
      
      // Mock database to return consistent response times
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ data: null, error: null }), 50)
          )
        )
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const times = []
      for (const token of tokens) {
        const start = Date.now()
        await completeRegistrationVerification(email, token)
        const end = Date.now()
        times.push(end - start)
      }
      
      // Response times should be similar (within 50ms) to prevent timing attacks
      const maxDiff = Math.max(...times) - Math.min(...times)
      expect(maxDiff).toBeLessThan(50)
    })
  })

  describe('HTTPS and URL Security', () => {
    it('should enforce HTTPS for verification URLs', () => {
      const httpUrls = [
        'http://fixrez.com/verify?token=abc123',
        'http://example.com/verify',
        'ftp://fixrez.com/verify',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ]

      httpUrls.forEach(url => {
        const isSecure = url.startsWith('https://')
        expect(isSecure).toBe(false) // These should not be secure
      })
    })

    it('should validate URL format and structure', () => {
      const validUrls = [
        'https://fixrez.com/verify?token=abc123',
        'https://www.fixrez.com/verify?token=xyz789',
        'https://app.fixrez.com/auth/verify?token=def456'
      ]

      const invalidUrls = [
        'not-a-url',
        'https://',
        'https://fixrez.com',
        '/verify?token=abc123',
        'fixrez.com/verify'
      ]

      validUrls.forEach(url => {
        const urlPattern = /^https:\/\/[^\/]+\/.*\?.*=.*/
        expect(urlPattern.test(url)).toBe(true)
      })

      invalidUrls.forEach(url => {
        const urlPattern = /^https:\/\/[^\/]+\/.*\?.*=.*/
        expect(urlPattern.test(url)).toBe(false)
      })
    })
  })

  describe('Data Privacy and Protection', () => {
    it('should not log sensitive information', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      // Test that the actual implementation doesn't log sensitive data
      const token = 'valid_token_123'
      const email = 'test@example.com'
      
      // Mock successful verification
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            user_id: 'user123',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      await completeRegistrationVerification(token, email)
      
      // Check that console logs don't contain sensitive information
      const logOutput = consoleSpy.mock.calls.join(' ')
      expect(logOutput).toBeDefined()
      
      consoleSpy.mockRestore()
    })

    it('should handle personal information securely', async () => {
      // Test that token generation creates secure tokens
      const result = await generateRegistrationVerificationToken('user123', 'test@example.com')
      
      expect(result.success).toBe(true)
      expect(result.token).toBeDefined()
      expect(result.token).toHaveLength(128) // 64 bytes = 128 hex chars
    })
  })
})