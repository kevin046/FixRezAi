import dotenv from 'dotenv';
// Load local env for dev - MUST be first
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import VerificationService from './services/verificationService.js';
import VerificationServiceEnhanced from './services/verificationServiceEnhanced.js';
import verificationMiddleware from './middleware/verification.js';

// Import serverless-style handlers and adapt to Express
import optimizeHandler, { AI_STATUS } from './optimize.js';
import contactHandler from './contact.js';

const app = express();
// Strengthen CORS: allow localhost dev and deployed domains
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,https://fixrez-han4cbj05-kevin046s-projects.vercel.app,https://fixrez.com,https://www.fixrez.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

// Dev bypass flag
const DEV_AUTH_BYPASS = (String(process.env.DEV_AUTH_BYPASS || '').toLowerCase() === 'true') && (process.env.NODE_ENV !== 'production');
console.log('🔧 DEV_AUTH_BYPASS:', DEV_AUTH_BYPASS ? 'enabled' : 'disabled')

const corsOptions = {
  origin: function(origin, callback) {
    // Allow same-origin or server-to-server
    if (!origin) return callback(null, true)
    // Allow any localhost/127.0.0.1 port for dev
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    if (isLocalhost) return callback(null, true)
    // Explicit allowlist for production domains
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
  optionsSuccessStatus: 204,
}
app.use(cors(corsOptions))
// Express v5 path-to-regexp doesn't accept '*' route; use regex
app.options(/.*/, cors(corsOptions))
app.use(express.json({ limit: '1mb' }));

// Initialize verification service
const verificationService = new VerificationService();
const verificationServiceEnhanced = new VerificationServiceEnhanced();

// Simple health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Status endpoint: show AI rate limit and model state
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    ai: {
      model: AI_STATUS.model,
      last429: AI_STATUS.last429 ? new Date(AI_STATUS.last429).toISOString() : null,
      lastOk: AI_STATUS.lastOk ? new Date(AI_STATUS.lastOk).toISOString() : null,
      lastCall: AI_STATUS.lastCall ? new Date(AI_STATUS.lastCall).toISOString() : null,
      cooldownUntil: AI_STATUS.cooldownUntil ? new Date(AI_STATUS.cooldownUntil).toISOString() : null,
      active: AI_STATUS.active,
      queue: AI_STATUS.queue
    }
  })
})
// Wrap the Vercel-style handler(req, res) for Express
function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('API route error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
}

// Audit logging to file
const LOG_DIR = path.resolve(process.cwd(), 'logs')
const VERIFY_LOG = path.join(LOG_DIR, 'verify.log')
function ensureLogDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }) } catch {}
}
function auditLog(entry) {
  try {
    ensureLogDir()
    fs.appendFileSync(VERIFY_LOG, JSON.stringify(entry) + '\n')
  } catch (e) {
    console.warn('Audit log write failed:', e?.message || e)
  }
}

// IP allowlist (optional)
function ipAllowlist(req, res, next) {
  const list = (process.env.ALLOWED_IPS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (list.length === 0) return next()
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  if (list.includes(ip)) return next()
  auditLog({ type: 'ip_block', ip, path: req.path, ts: new Date().toISOString() })
  return res.status(403).json({ success: false, error: 'IP not allowed' })
}

// Simple rate limiting per IP
const RATE_BUCKET = new Map()
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000)
const RATE_MAX = Number(process.env.RATE_MAX || 10)
function rateLimiter(req, res, next) {
  const now = Date.now()
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  const bucket = RATE_BUCKET.get(ip) || []
  const recent = bucket.filter(ts => now - ts < RATE_WINDOW_MS)
  recent.push(now)
  RATE_BUCKET.set(ip, recent)
  if (recent.length > RATE_MAX) {
    auditLog({ type: 'rate_limit', ip, path: req.path, ts: new Date().toISOString(), count: recent.length })
    return res.status(429).json({ success: false, error: 'Too many requests' })
  }
  next()
}

// Minimal JWT HS256 without external deps
function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function base64urlJson(obj) {
  return base64url(JSON.stringify(obj))
}
function signJwtHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const part1 = base64urlJson(header)
  const part2 = base64urlJson(payload)
  const data = `${part1}.${part2}`
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${data}.${sig}`
}
function verifyJwtHS256(token, secret) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed token')
  const [p1, p2, sig] = parts
  const data = `${p1}.${p2}`
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  if (sig !== expected) throw new Error('Invalid signature')
  const payload = JSON.parse(Buffer.from(p2.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  const nowSec = Math.floor(Date.now() / 1000)
  if (typeof payload.exp === 'number' && nowSec > payload.exp) throw new Error('Token expired')
  return payload
}

// CSRF tokens via HttpOnly cookie
function randomToken(bytes = 32) {
  return base64url(crypto.randomBytes(bytes))
}
function setCookie(res, name, value, maxAgeSec) {
  const secure = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
  const cookie = `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec || 1800}${secure ? '; Secure' : ''}`
  res.setHeader('Set-Cookie', cookie)
}
function getCookie(req, name) {
  const raw = req.headers['cookie'] || ''
  const parts = raw.split(';').map(s => s.trim())
  for (const p of parts) {
    const [k, v] = p.split('=')
    if (k === name) return v
  }
  return null
}
function csrfIssue(req, res) {
  const token = randomToken(32)
  setCookie(res, 'csrfToken', token, 3600)
  res.json({ success: true, token })
}
function csrfCheck(req, res, next) {
  const cookie = getCookie(req, 'csrfToken')
  const header = req.headers['x-csrf-token']
  if (!cookie || !header || cookie !== header) {
    auditLog({ type: 'csrf_block', path: req.path, ts: new Date().toISOString() })
    return res.status(403).json({ success: false, error: 'Invalid CSRF token' })
  }
  next()
}

// Simple middleware: require authenticated Supabase user (no verification check)
async function requireAuth(req, res, next) {
  // Dev bypass: allow requests without authentication when enabled
  if (DEV_AUTH_BYPASS) {
    console.log('🔓 DEV bypass active: skipping authentication for', req.path)
    req.user = { id: '00000000-0000-0000-0000-000000000000', email: 'dev@localhost', email_confirmed_at: new Date().toISOString(), user_metadata: { verified: true } }
    return next()
  }

  const auth = req.headers['authorization'] || ''
  const m = auth.match(/^Bearer\s+(.*)$/i)
  const token = m ? m[1] : null
  const supabaseUrl = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!token) {
    const entry = { type: 'auth', result: 'missing_token', path: req.path, ip: req.ip, ts: new Date().toISOString() }
    console.log('AUDIT auth:', entry)
    auditLog(entry)
    return res.status(401).json({ success: false, error: 'Missing Authorization token' })
  }
  if (!serviceKey) {
    const entry = { type: 'auth', result: 'server_misconfig', path: req.path, ip: req.ip, ts: new Date().toISOString() }
    console.error('AUDIT auth:', entry)
    auditLog(entry)
    return res.status(500).json({ success: false, error: 'Server not configured' })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  
  try {
    const { data, error } = await admin.auth.getUser(token)
    
    if (error || !data?.user) {
      const msg = (error?.message || '').toLowerCase()
      const reason = msg.includes('expired') ? 'token_expired' : 'invalid_token'
      const entry = { type: 'auth', result: reason, path: req.path, ip: req.ip, ts: new Date().toISOString(), error: error?.message }
      console.log('AUDIT auth:', entry)
      auditLog(entry)
      return res.status(401).json({ success: false, error: reason === 'token_expired' ? 'Token expired' : 'Invalid token' })
    }
    
    req.user = data.user
    next()
  } catch (e) {
    const entry = { type: 'auth', result: 'exception', path: req.path, ip: req.ip, ts: new Date().toISOString(), error: e?.message }
    console.error('AUDIT auth:', entry)
    auditLog(entry)
    return res.status(500).json({ success: false, error: 'Authentication check failed' })
  }
}

// Enhanced middleware: require verified Supabase user with proper verification status checking
async function requireVerified(req, res, next) {
  // Dev bypass: allow requests without verification when enabled
  if (DEV_AUTH_BYPASS) {
    console.log('🔓 DEV bypass active: skipping user verification for', req.path)
    req.user = { id: '00000000-0000-0000-0000-000000000000', email: 'dev@localhost', email_confirmed_at: new Date().toISOString(), user_metadata: { verified: true } }
    return next()
  }

  const auth = req.headers['authorization'] || ''
  const m = auth.match(/^Bearer\s+(.*)$/i)
  const token = m ? m[1] : null
  const supabaseUrl = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!token) {
    const entry = { type: 'verify', result: 'missing_token', path: req.path, ip: req.ip, ts: new Date().toISOString() }
    console.log('AUDIT verify:', entry)
    auditLog(entry)
    return res.status(401).json({ success: false, error: 'Missing Authorization token' })
  }
  if (!serviceKey) {
    const entry = { type: 'verify', result: 'server_misconfig', path: req.path, ip: req.ip, ts: new Date().toISOString() }
    console.error('AUDIT verify:', entry)
    auditLog(entry)
    return res.status(500).json({ success: false, error: 'Server not configured' })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  
  try {
    const { data, error } = await admin.auth.getUser(token)
    
    if (error || !data?.user) {
      const msg = (error?.message || '').toLowerCase()
      const reason = msg.includes('expired') ? 'token_expired' : 'invalid_token'
      const entry = { type: 'verify', result: reason, path: req.path, ip: req.ip, ts: new Date().toISOString(), error: error?.message }
      console.log('AUDIT verify:', entry)
      auditLog(entry)
      return res.status(401).json({ success: false, error: reason === 'token_expired' ? 'Token expired' : 'Invalid token' })
    }
    
    const user = data.user
    
    // Use the enhanced verification service to get accurate verification status
    const verificationResult = await verificationService.getUserVerificationStatus(user.id)
    
    if (!verificationResult.success) {
      const entry = { type: 'verify', result: 'verification_check_failed', path: req.path, ip: req.ip, ts: new Date().toISOString(), error: verificationResult.error }
      console.error('AUDIT verify:', entry)
      auditLog(entry)
      return res.status(500).json({ success: false, error: 'Verification check failed' })
    }
    
    const isVerified = verificationResult.status.is_verified
    
    const entry = { 
      type: 'verify', 
      result: isVerified ? 'verified' : 'unverified', 
      path: req.path, 
      ip: req.ip, 
      ts: new Date().toISOString(), 
      userId: user.id, 
      email: user.email, 
      verificationStatus: verificationResult.status 
    }
    console.log('AUDIT verify:', entry)
    auditLog(entry)
    
    if (!isVerified) {
      return res.status(403).json({ 
        success: false, 
        error: 'Email verification required',
        verification_required: true,
        has_valid_token: verificationResult.status.has_valid_token,
        token_expires_at: verificationResult.status.token_expires_at
      })
    }
    
    // Attach user to request for downstream handlers if needed
    req.user = user
    next()
  } catch (e) {
    const entry = { type: 'verify', result: 'exception', path: req.path, ip: req.ip, ts: new Date().toISOString(), error: e?.message }
    console.error('AUDIT verify:', entry)
    auditLog(entry)
    return res.status(500).json({ success: false, error: 'Verification check failed' })
  }
}

// Enhanced endpoint to get current user with verification status
app.get('/api/me', ipAllowlist, rateLimiter, requireVerified, async (req, res) => {
  const u = req.user || null
  
  if (u) {
    // Get enhanced verification status
    const verificationResult = await verificationService.getUserVerificationStatus(u.id)
    
    res.json({ 
      success: true, 
      user: {
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        verification_status: verificationResult.success ? verificationResult.status : null
      }
    })
  } else {
    res.json({ success: true, user: null })
  }
})

// JWT email verification workflow
const VERIFY_SECRET = process.env.VERIFICATION_JWT_SECRET || (process.env.SUPABASE_SERVICE_ROLE_KEY ? crypto.createHash('sha256').update(String(process.env.SUPABASE_SERVICE_ROLE_KEY)).digest('hex') : crypto.randomBytes(32).toString('hex'))
const TOKEN_TTL_SECONDS = Number(process.env.VERIFICATION_TOKEN_TTL_SECONDS || 24 * 60 * 60)
const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:5173'
const SUCCESS_REDIRECT_URL = process.env.SUCCESS_REDIRECT_URL || `${WEBSITE_URL}/?verify=success`
const FAILURE_REDIRECT_URL = process.env.FAILURE_REDIRECT_URL || `${WEBSITE_URL}/verify?error=invalid`

// Issue CSRF token
app.get('/api/csrf', ipAllowlist, rateLimiter, (req, res) => csrfIssue(req, res))

// Enhanced send verification email endpoint
app.post('/api/send-verification', ipAllowlist, rateLimiter, requireAuth, verificationMiddleware.logVerificationAttempt(), async (req, res) => {
  const { email } = req.body
  const user = req.user

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' })
  }

  try {
    // Generate verification token using enhanced service
    const tokenResult = await verificationService.generateVerificationToken(
      user.id,
      email,
      req.ip,
      req.get('User-Agent')
    )

    if (!tokenResult.success) {
      return res.status(400).json({ success: false, error: tokenResult.error })
    }

    // Send verification email using Resend
    const verificationUrl = `${WEBSITE_URL}/verify?token=${tokenResult.token}`
    
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'FixRez <onboarding@resend.dev>',
          reply_to: process.env.RESEND_REPLY_TO || undefined,
          to: email,
          subject: 'Verify your FixRez AI account',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Verify your FixRez AI account</h2>
              <p>Please click the button below to verify your email address and activate your account:</p>
              <div style="margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                This verification link will expire in 24 hours. If you didn't request this verification, please ignore this email.
              </p>
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <code style="background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px;">${verificationUrl}</code>
              </p>
            </div>
          `
        })
      })
      const ok = resp.ok
      let data
      try { data = await resp.json() } catch { data = null }
      if (!ok) {
        const details = data && (data.error || data.message) ? (data.error || data.message) : `Status ${resp.status}`
        console.error('Send verification failed:', details)
        auditLog({ type: 'send_verification_fail', email, userId: user.id, ts: new Date().toISOString(), details })
        // For development, still return success with the token even if email fails
        if (DEV_AUTH_BYPASS) {
          console.log('DEV mode: returning token despite email failure')
        } else {
          return res.status(502).json({ success: false, error: 'Failed to send email', details })
        }
      }
      auditLog({ type: 'send_verification', email, userId: user.id, ts: new Date().toISOString(), provider: 'resend', id: data?.id || null })
    } catch (err) {
      console.error('Email provider error:', err?.message || err)
      auditLog({ type: 'send_verification_error', email, userId: user.id, ts: new Date().toISOString(), error: err?.message || 'Unknown' })
      // For development, still return success with the token even if email fails
      if (DEV_AUTH_BYPASS) {
        console.log('DEV mode: returning token despite email provider error')
      } else {
        return res.status(502).json({ success: false, error: 'Email provider error' })
      }
    }

    res.json({ 
      success: true, 
      message: 'Verification email sent successfully',
      token: DEV_AUTH_BYPASS ? tokenResult.token : undefined, // Include token in dev mode for testing
      expires_at: tokenResult.expires_at
    })
  } catch (error) {
    console.error('Error in send-verification:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Enhanced verify email endpoint
app.get('/api/verify', ipAllowlist, rateLimiter, verificationMiddleware.logVerificationAttempt(), async (req, res) => {
  const { token } = req.query

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' })
  }

  try {
    // Verify token using enhanced service
    const verifyResult = await verificationService.verifyToken(
      token,
      req.ip,
      req.get('User-Agent')
    )

    if (!verifyResult.success) {
      return res.status(400).json({ success: false, error: verifyResult.error })
    }

    res.json({ 
      success: true, 
      message: 'Email verified successfully',
      user_id: verifyResult.user_id
    })
  } catch (error) {
    console.error('Error in verify:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get user verification status
app.get('/api/verification-status', ipAllowlist, rateLimiter, requireAuth, verificationMiddleware.logVerificationAttempt(), async (req, res) => {
  try {
    const user = req.user
    const verificationResult = await verificationService.getUserVerificationStatus(user.id)
    
    res.json({
      success: true,
      verification_status: verificationResult.success ? verificationResult.status : null
    })
  } catch (error) {
    console.error('Error getting verification status:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get verification statistics (admin only)
app.get('/api/verification-stats', ipAllowlist, rateLimiter, requireAuth, async (req, res) => {
  try {
    // Check if user is admin (you may want to add proper admin role checking)
    const stats = await verificationService.getVerificationStats()
    
    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error getting verification stats:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Enhanced verification endpoints using database functions
app.post('/api/verification/create-token', ipAllowlist, rateLimiter, requireAuth, verificationMiddleware.logVerificationAttempt(), async (req, res) => {
  const { email, type = 'email' } = req.body
  const user = req.user

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' })
  }

  try {
    // Use the enhanced service to create verification token via database function
    const tokenResult = await verificationServiceEnhanced.createVerificationToken({
      userId: user.id,
      email,
      type,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    if (!tokenResult.success) {
      return res.status(400).json({ success: false, error: tokenResult.error })
    }

    res.json({
      success: true,
      message: 'Verification token created successfully',
      token: tokenResult.token,
      expires_at: tokenResult.expires_at,
      token_id: tokenResult.token_id
    })
  } catch (error) {
    console.error('Error creating verification token:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Enhanced verify endpoint using database function
app.post('/api/verification/verify-token', ipAllowlist, rateLimiter, verificationMiddleware.logVerificationAttempt(), async (req, res) => {
  const { token, type = 'email' } = req.body

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' })
  }

  try {
    // Use the enhanced service to verify token via database function
    const verifyResult = await verificationServiceEnhanced.verifyUserToken({
      token,
      type,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    if (!verifyResult.success) {
      return res.status(400).json({ success: false, error: verifyResult.error })
    }

    res.json({
      success: true,
      message: 'Verification successful',
      user_id: verifyResult.user_id,
      email: verifyResult.email,
      verified_at: verifyResult.verified_at
    })
  } catch (error) {
    console.error('Error verifying token:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get enhanced verification status
app.get('/api/verification/status/:userId?', ipAllowlist, rateLimiter, requireAuth, verificationMiddleware.logVerificationAttempt(), async (req, res) => {
  try {
    const user = req.user
    const targetUserId = req.params.userId || user.id

    // Only allow users to check their own status unless they're admin
    if (targetUserId !== user.id && !user.is_admin) {
      return res.status(403).json({ success: false, error: 'Access denied' })
    }

    // Use the enhanced service to get verification status via database function
    const statusResult = await verificationServiceEnhanced.getUserVerificationStatus(targetUserId)

    if (!statusResult.success) {
      return res.status(400).json({ success: false, error: statusResult.error })
    }

    res.json({
      success: true,
      status: statusResult.status
    })
  } catch (error) {
    console.error('Error getting verification status:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get verification errors for a user
app.get('/api/verification/errors/:userId?', ipAllowlist, rateLimiter, requireAuth, verificationMiddleware.logVerificationAttempt(), async (req, res) => {
  try {
    const user = req.user
    const targetUserId = req.params.userId || user.id

    // Only allow users to check their own errors unless they're admin
    if (targetUserId !== user.id && !user.is_admin) {
      return res.status(403).json({ success: false, error: 'Access denied' })
    }

    const { data, error } = await supabase
      .from('verification_error_messages')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching verification errors:', error)
      return res.status(500).json({ success: false, error: 'Database error' })
    }

    res.json({
      success: true,
      errors: data
    })
  } catch (error) {
    console.error('Error fetching verification errors:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Cleanup expired tokens
app.post('/api/verification/cleanup', ipAllowlist, rateLimiter, requireAuth, async (req, res) => {
  try {
    const user = req.user

    // Only allow admin users to cleanup tokens
    if (!user.is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' })
    }

    const { data, error } = await supabase
      .rpc('cleanup_expired_tokens')

    if (error) {
      console.error('Error cleaning up tokens:', error)
      return res.status(500).json({ success: false, error: 'Database error' })
    }

    res.json({
      success: true,
      message: 'Expired tokens cleaned up successfully',
      cleaned_count: data
    })
  } catch (error) {
    console.error('Error cleaning up tokens:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// API routes
app.post('/api/optimize', ipAllowlist, rateLimiter, requireVerified, wrap(optimizeHandler));
app.post('/api/contact', ipAllowlist, rateLimiter, wrap(contactHandler));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔌 Dev API server running at http://localhost:${PORT}`);
  console.log('➡ Routes:');
  console.log('   GET  /api/me');
  console.log('   POST /api/optimize');
  console.log('   POST /api/contact');
  console.log('   GET  /api/csrf');
  console.log('   POST /api/send-verification');
  console.log('   GET  /api/verify');
  console.log('   POST /api/verification/create-token');
  console.log('   POST /api/verification/verify-token');
  console.log('   GET  /api/verification/status/:userId?');
  console.log('   GET  /api/verification/errors/:userId?');
  console.log('   POST /api/verification/cleanup');
});


app.get('/api/verification-metrics', ipAllowlist, rateLimiter, requireAuth, async (req, res) => {
  try {
    const stats = await verificationService.getVerificationStats();
    const emailConfigured = Boolean(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'FixRez <onboarding@resend.dev>';
    const rateInfo = { window_ms: RATE_WINDOW_MS, max: RATE_MAX, active_buckets: RATE_BUCKET.size };
    const health = {
      supabaseConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      emailServiceConfigured: emailConfigured,
      devBypass: DEV_AUTH_BYPASS
    };

    res.json({
      success: true,
      metrics: {
        stats,
        email: { provider: 'resend', configured: emailConfigured, from: fromEmail },
        rateLimiter: rateInfo,
        health
      }
    });
  } catch (error) {
    console.error('Error getting verification metrics:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

