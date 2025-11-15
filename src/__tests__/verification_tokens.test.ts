import { describe, it, expect } from 'vitest'

// Use dev bypass user id to avoid DB writes
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000'

describe('verification tokens', () => {
  it('generates and verifies a token for dev user', async () => {
    const svc = await import('../../api/services/verificationService.js')
    const VerificationService = svc.default
    const service = new VerificationService()
    const gen = await service.generateVerificationToken(DEV_USER_ID, 'test@example.com', '127.0.0.1', 'test-agent')
    expect(gen.success).toBe(true)
    const ver = await service.verifyToken(gen.token, '127.0.0.1', 'test-agent')
    expect(ver.success).toBe(true)
  })

  it('fails on tampered token signature', async () => {
    const svc = await import('../../api/services/verificationService.js')
    const VerificationService = svc.default
    const service = new VerificationService()
    const gen = await service.generateVerificationToken(DEV_USER_ID, 'test@example.com', '127.0.0.1', 'test-agent')
    expect(gen.success).toBe(true)
    const tampered = gen.token.replace(/.$/, gen.token.slice(-1) === 'a' ? 'b' : 'a')
    const ver = await service.verifyToken(tampered, '127.0.0.1', 'test-agent')
    expect(ver.success).toBe(false)
  })
})
