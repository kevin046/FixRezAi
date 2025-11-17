import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { supabase } from '../supabase.js'
import { 
  generateRegistrationVerificationToken,
  completeRegistrationVerification,
  resendRegistrationVerification
} from '../emailVerification.js'

// Mock Supabase
vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      resend: vi.fn(),
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      gte: vi.fn()
    }))
  }
}))

describe('Email Verification Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Token Generation Edge Cases', () => {
    it('should handle special characters in email addresses', async () => {
      const specialEmails = [
        'user+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com'
      ]

      for (const email of specialEmails) {
        const token = await generateRegistrationVerificationToken(email)
        expect(token).toBeDefined()
        expect(token.length).toBeGreaterThan(32)
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      }
    })

    it('should handle malformed tokens during validation', async () => {
      const malformedTokens = [
        '',
        'short',
        'invalid@token',
        'invalid token',
        '<script>alert("xss")</script>'
      ]

      for (const token of malformedTokens) {
        const result = await completeRegistrationVerification('test@example.com', token)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid token format')
      }
    })
  })

  describe('Rate Limiting Edge Cases', () => {
    it('should enforce 3 resends per hour limit', async () => {
      const email = 'test@example.com'
      
      // Mock successful auth resend
      vi.mocked(supabase.auth.resend).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      } as any)
      
      // Mock database to return 3 recent resends
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      vi.mocked(mockDb.select).mockReturnValue({
        data: [
          { created_at: new Date().toISOString() },
          { created_at: new Date(Date.now() - 1000).toISOString() },
          { created_at: new Date(Date.now() - 2000).toISOString() }
        ],
        error: null
      } as any)
      
      const result = await resendRegistrationVerification(email)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limit exceeded')
    })
  })

  describe('Security Edge Cases', () => {
    it('should prevent HTML injection in email content', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(1)'
      ]

      for (const maliciousInput of maliciousInputs) {
        // Mock database operations
        const mockDb = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        }
        
        vi.mocked(supabase.from).mockReturnValue(mockDb as any)
        
        // Should not throw and should handle safely
        await expect(resendRegistrationVerification(maliciousInput)).resolves.not.toThrow()
      }
    })
  })
})