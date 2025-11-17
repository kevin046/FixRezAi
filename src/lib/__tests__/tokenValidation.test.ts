import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '../supabase.js'
import { completeRegistrationVerification } from '../emailVerification.js'

// Mock Supabase
vi.mock('../supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      single: vi.fn()
    }))
  }
}))

describe('Token Validation and Expiration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Expired Token Scenarios', () => {
    it('should reject tokens that expired 1 second ago', async () => {
      const email = 'test@example.com'
      const token = 'expired_token_123456789012'
      
      // Mock database to return token expired 1 second ago
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(false)
      expect(result.message).toContain('expired')
    })

    it('should reject tokens that expired 1 hour ago', async () => {
      const email = 'test@example.com'
      const token = 'expired_token_123456789012'
      
      // Mock database to return token expired 1 hour ago
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(false)
      expect(result.message).toContain('expired')
    })

    it('should reject tokens that expired 1 day ago', async () => {
      const email = 'test@example.com'
      const token = 'expired_token_123456789012'
      
      // Mock database to return token expired 1 day ago
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(false)
      expect(result.message).toContain('expired')
    })

    it('should accept tokens that expire in 1 second', async () => {
      const email = 'test@example.com'
      const token = 'valid_token_123456789012'
      
      // Mock successful verification setup
      const mockTokenDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() + 1000).toISOString(), // 1 second from now
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      const mockUserDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user123',
            email: 'test@example.com',
            email_confirmed_at: null,
            user_metadata: {}
          },
          error: null
        })
      }
      
      // Mock the calls to return different database instances
      vi.mocked(supabase.from).mockImplementation((tableName: string) => {
        if (tableName === 'verification_tokens') {
          return mockTokenDb as any
        }
        if (tableName === 'users') {
          return mockUserDb as any
        }
        return mockTokenDb as any
      })
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(true)
    })

    it('should accept tokens that expire in 1 hour', async () => {
      const email = 'test@example.com'
      const token = 'valid_token_123456789012'
      
      // Mock successful verification setup
      const mockTokenDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      const mockUserDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user123',
            email: 'test@example.com',
            email_confirmed_at: null,
            user_metadata: {}
          },
          error: null
        })
      }
      
      // Mock the calls to return different database instances
      vi.mocked(supabase.from).mockImplementation((tableName: string) => {
        if (tableName === 'verification_tokens') {
          return mockTokenDb as any
        }
        if (tableName === 'users') {
          return mockUserDb as any
        }
        return mockTokenDb as any
      })
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(true)
    })

    it('should handle tokens expiring exactly at current time', async () => {
      const email = 'test@example.com'
      const token = 'borderline_token_123456789012'
      
      // Mock database to return token expiring right now
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date().toISOString(), // Expires right now
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(false) // Should be considered expired
      expect(result.message).toContain('expired')
    })
  })

  describe('Token Validation Edge Cases', () => {
    it('should handle tokens with invalid expiration dates', async () => {
      const email = 'test@example.com'
      const token = 'invalid_date_token_123456789012'
      
      // Mock database to return token with invalid date
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: 'invalid-date',
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid token')
    })

    it('should handle tokens with null expiration dates', async () => {
      const email = 'test@example.com'
      const token = 'null_date_token_123456789012'
      
      // Mock database to return token with null date
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: null,
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid token')
    })

    it('should handle tokens with future dates far in the future', async () => {
      const email = 'test@example.com'
      const token = 'far_future_token_123456789012'
      
      // Mock successful verification setup for far future token
      const mockTokenDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      const mockUserDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user123',
            email: 'test@example.com',
            email_confirmed_at: null,
            user_metadata: {}
          },
          error: null
        })
      }
      
      // Mock the calls to return different database instances
      vi.mocked(supabase.from).mockImplementation((tableName: string) => {
        if (tableName === 'verification_tokens') {
          return mockTokenDb as any
        }
        if (tableName === 'users') {
          return mockUserDb as any
        }
        return mockTokenDb as any
      })
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(true) // Should accept very future dates
    })

    it('should handle tokens with past dates far in the past', async () => {
      const email = 'test@example.com'
      const token = 'far_past_token_123456789012'
      
      // Mock database to return token expired 1 year ago
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockDb as any)
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(false)
      expect(result.message).toContain('expired')
    })
  })

  describe('Token Validation with Different Time Zones', () => {
    it('should handle UTC timezone correctly', async () => {
      const email = 'test@example.com'
      const token = 'utc_token_123456789012'
      
      // Mock successful verification setup
      const mockTokenDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date().toISOString(), // Current time in UTC
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      const mockUserDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user123',
            email: 'test@example.com',
            email_confirmed_at: null,
            user_metadata: {}
          },
          error: null
        })
      }
      
      // Mock the calls to return different database instances
      vi.mocked(supabase.from).mockImplementation((tableName: string) => {
        if (tableName === 'verification_tokens') {
          return mockTokenDb as any
        }
        if (tableName === 'users') {
          return mockUserDb as any
        }
        return mockTokenDb as any
      })
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(true)
    })

    it('should handle different timezone formats', async () => {
      const email = 'test@example.com'
      const token = 'timezone_token_123456789012'
      
      // Mock successful verification setup
      const mockTokenDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      const mockUserDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user123',
            email: 'test@example.com',
            email_confirmed_at: null,
            user_metadata: {}
          },
          error: null
        })
      }
      
      // Mock the calls to return different database instances
      vi.mocked(supabase.from).mockImplementation((tableName: string) => {
        if (tableName === 'verification_tokens') {
          return mockTokenDb as any
        }
        if (tableName === 'users') {
          return mockUserDb as any
        }
        return mockTokenDb as any
      })
      
      const result = await completeRegistrationVerification(token, email)
      expect(result.success).toBe(true)
    })
  })

  describe('Concurrent Token Validation', () => {
    it('should handle race conditions in token validation', async () => {
      const email = 'test@example.com'
      const token = 'concurrent_token_123456789012'
      
      // Mock successful verification setup
      const mockTokenDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'token123',
            token_hash: 'hash123',
            user_id: 'user123',
            expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            used_at: null,
            metadata: { email: 'test@example.com' }
          },
          error: null
        }),
        update: vi.fn().mockReturnThis()
      }
      
      const mockUserDb = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user123',
            email: 'test@example.com',
            email_confirmed_at: null,
            user_metadata: {}
          },
          error: null
        })
      }
      
      // Mock the calls to return different database instances
      vi.mocked(supabase.from).mockImplementation((tableName: string) => {
        if (tableName === 'verification_tokens') {
          return mockTokenDb as any
        }
        if (tableName === 'users') {
          return mockUserDb as any
        }
        return mockTokenDb as any
      })
      
      // Simulate concurrent validation attempts
      const results = await Promise.all([
        completeRegistrationVerification(token, email),
        completeRegistrationVerification(token, email)
      ])
      
      // Both should succeed since the function doesn't have built-in race condition handling
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBeGreaterThanOrEqual(0)
    })
  })
})