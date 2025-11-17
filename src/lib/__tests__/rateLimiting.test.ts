import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '../supabase.js'
import { 
  resendRegistrationVerification,
  checkRateLimit,
  recordResendAttempt
} from '../emailVerification.js'

// Mock Supabase
vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      resend: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      gte: vi.fn(),
      lt: vi.fn()
    }))
  }
}))

describe('Rate Limiting Functionality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('3 Resends Per Hour Limit', () => {
    it('should allow first 3 resend attempts within an hour', async () => {
      const email = 'test@example.com'
      const userId = 'user123'
      
      // Mock successful auth resend
      vi.mocked(supabase.auth.resend).mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      } as any)
      
      // Mock database to return fewer than 3 attempts
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      // Return 2 existing attempts (less than limit)
      vi.mocked(mockDb.select).mockReturnValue({
        data: [
          { created_at: new Date(Date.now() - 1800000).toISOString() }, // 30 min ago
          { created_at: new Date(Date.now() - 3600000).toISOString() }  // 1 hour ago
        ],
        error: null
      } as any)
      
      const result = await resendRegistrationVerification(email)
      expect(result.success).toBe(true)
    })

    it('should block 4th resend attempt within an hour', async () => {
      const email = 'test@example.com'
      
      // Mock database to return exactly 3 attempts
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      // Return 3 existing attempts (at limit)
      vi.mocked(mockDb.select).mockReturnValue({
        data: [
          { created_at: new Date(Date.now() - 1200000).toISOString() }, // 20 min ago
          { created_at: new Date(Date.now() - 2400000).toISOString() }, // 40 min ago
          { created_at: new Date(Date.now() - 3600000).toISOString() }  // 1 hour ago
        ],
        error: null
      } as any)
      
      const result = await resendRegistrationVerification(email)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limit exceeded')
    })

    it('should allow resend after 1 hour cooldown period', async () => {
      const email = 'test@example.com'
      const userId = 'user123'
      
      // Mock successful auth resend
      vi.mocked(supabase.auth.resend).mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      } as any)
      
      // Mock database to return old attempts (more than 1 hour ago)
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      // Return 3 old attempts (all more than 1 hour ago)
      vi.mocked(mockDb.select).mockReturnValue({
        data: [
          { created_at: new Date(Date.now() - 7200000).toISOString() }, // 2 hours ago
          { created_at: new Date(Date.now() - 10800000).toISOString() }, // 3 hours ago
          { created_at: new Date(Date.now() - 14400000).toISOString() }  // 4 hours ago
        ],
        error: null
      } as any)
      
      const result = await resendRegistrationVerification(email)
      expect(result.success).toBe(true)
    })
  })

  describe('Rate Limit Check Function', () => {
    it('should return true when under rate limit', async () => {
      const email = 'test@example.com'
      
      // Mock database to return 1 attempt
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      vi.mocked(mockDb.select).mockReturnValue({
        data: [{ created_at: new Date(Date.now() - 1800000).toISOString() }], // 30 min ago
        error: null
      } as any)
      
      const result = await checkRateLimit(email)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('should return false when at rate limit', async () => {
      const email = 'test@example.com'
      
      // Mock database to return 3 attempts
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
          { created_at: new Date(Date.now() - 1200000).toISOString() },
          { created_at: new Date(Date.now() - 2400000).toISOString() },
          { created_at: new Date(Date.now() - 3600000).toISOString() }
        ],
        error: null
      } as any)
      
      const result = await checkRateLimit(email)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.resetTime).toBeDefined()
    })

    it('should calculate correct reset time', async () => {
      const email = 'test@example.com'
      
      // Mock database to return attempts with oldest at 45 minutes ago
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const oldestTime = new Date(Date.now() - 2700000) // 45 minutes ago
      vi.mocked(mockDb.select).mockReturnValue({
        data: [
          { created_at: oldestTime.toISOString() },
          { created_at: new Date(Date.now() - 1800000).toISOString() },
          { created_at: new Date(Date.now() - 900000).toISOString() }
        ],
        error: null
      } as any)
      
      const result = await checkRateLimit(email)
      expect(result.resetTime).toBeDefined()
      
      // Reset time should be 15 minutes from now (60 - 45 = 15)
      const expectedResetTime = new Date(Date.now() + 900000) // 15 minutes from now
      const timeDiff = Math.abs(result.resetTime.getTime() - expectedResetTime.getTime())
      expect(timeDiff).toBeLessThan(1000) // Within 1 second
    })
  })

  describe('Concurrent Rate Limit Handling', () => {
    it('should handle concurrent resend requests gracefully', async () => {
      const email = 'test@example.com'
      const userId = 'user123'
      
      // Mock successful auth resend
      vi.mocked(supabase.auth.resend).mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      } as any)
      
      // Mock database to simulate race condition
      let callCount = 0
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      vi.mocked(mockDb.select).mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return { data: [], error: null } as any
        } else {
          return { 
            data: [
              { created_at: new Date(Date.now() - 1200000).toISOString() },
              { created_at: new Date(Date.now() - 2400000).toISOString() }
            ], 
            error: null 
          } as any
        }
      })
      
      // Simulate concurrent requests
      const results = await Promise.all([
        resendRegistrationVerification(email),
        resendRegistrationVerification(email),
        resendRegistrationVerification(email)
      ])
      
      // At least 2 should succeed (first 2 requests)
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Rate Limit Edge Cases', () => {
    it('should handle empty rate limit history', async () => {
      const email = 'test@example.com'
      const userId = 'user123'
      
      // Mock successful auth resend
      vi.mocked(supabase.auth.resend).mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      } as any)
      
      // Mock database to return no history
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      vi.mocked(mockDb.select).mockReturnValue({ data: [], error: null } as any)
      
      const result = await resendRegistrationVerification(email)
      expect(result.success).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      const email = 'test@example.com'
      
      // Mock database to return error
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      vi.mocked(mockDb.select).mockReturnValue({
        data: null,
        error: { message: 'Database connection failed' }
      } as any)
      
      const result = await checkRateLimit(email)
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })

    it('should handle malformed timestamps in rate limit data', async () => {
      const email = 'test@example.com'
      
      // Mock database to return malformed timestamps
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
          { created_at: 'invalid-timestamp' },
          { created_at: new Date(Date.now() - 1800000).toISOString() }
        ],
        error: null
      } as any)
      
      const result = await checkRateLimit(email)
      expect(result.allowed).toBe(true) // Should allow if can't parse some timestamps
      expect(result.remaining).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Rate Limit Recording', () => {
    it('should record resend attempts successfully', async () => {
      const email = 'test@example.com'
      const userId = 'user123'
      
      // Mock database for recording
      const mockDb = {
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await recordResendAttempt(email, userId)
      expect(result.success).toBe(true)
      
      // Verify insert was called with correct data
      expect(mockDb.insert).toHaveBeenCalledWith({
        email,
        user_id: userId,
        created_at: expect.any(String)
      })
    })

    it('should handle recording errors gracefully', async () => {
      const email = 'test@example.com'
      const userId = 'user123'
      
      // Mock database to return error
      const mockDb = {
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' }
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await recordResendAttempt(email, userId)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Insert failed')
    })
  })

  describe('Rate Limit Precision', () => {
    it('should accurately track attempts within rolling 1-hour window', async () => {
      const email = 'test@example.com'
      
      // Mock database with precise timing
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      // 3 attempts: 59 minutes ago, 30 minutes ago, 1 minute ago
      const now = Date.now()
      vi.mocked(mockDb.select).mockReturnValue({
        data: [
          { created_at: new Date(now - 3540000).toISOString() }, // 59 min ago
          { created_at: new Date(now - 1800000).toISOString() },  // 30 min ago
          { created_at: new Date(now - 60000).toISOString() }    // 1 min ago
        ],
        error: null
      } as any)
      
      const result = await checkRateLimit(email)
      expect(result.allowed).toBe(false) // Should be at limit
      expect(result.remaining).toBe(0)
      
      // After 2 more minutes, the oldest attempt should expire
      vi.mocked(mockDb.select).mockReturnValue({
        data: [
          { created_at: new Date(now - 1800000).toISOString() },  // 30 min ago
          { created_at: new Date(now - 60000).toISOString() }    // 1 min ago
        ],
        error: null
      } as any)
      
      const result2 = await checkRateLimit(email)
      expect(result2.allowed).toBe(true) // Should have 1 remaining
      expect(result2.remaining).toBe(1)
    })
  })
})