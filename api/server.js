import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// Load local env for dev
dotenv.config({ path: '.env.local' });

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
const DEV_AUTH_BYPASS = (String(process.env.DEV_AUTH_BYPASS || '').toLowerCase() === 'true') || !process.env.SUPABASE_SERVICE_ROLE_KEY
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

// Middleware: require verified Supabase user
function requireVerified(req, res, next) {
  // Dev bypass: allow requests without verification when enabled
  if (DEV_AUTH_BYPASS) {
    console.log('🔓 DEV bypass active: skipping user verification for', req.path)
    req.user = { id: 'dev-user', email: 'dev@localhost', email_confirmed_at: new Date().toISOString(), user_metadata: { verified: true } }
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
  admin.auth.getUser(token).then(({ data, error }) => {
    if (error || !data?.user) {
      const msg = (error?.message || '').toLowerCase()
      const reason = msg.includes('expired') ? 'token_expired' : 'invalid_token'
      const entry = { type: 'verify', result: reason, path: req.path, ip: req.ip, ts: new Date().toISOString(), error: error?.message }
      console.log('AUDIT verify:', entry)
      auditLog(entry)
      return res.status(401).json({ success: false, error: reason === 'token_expired' ? 'Token expired' : 'Invalid token' })
    }
    const user = data.user
    const metaVerified = !!(user?.user_metadata && (user.user_metadata.verified === true || String(user.user_metadata.verified).toLowerCase() === 'true'))

    let profileVerified = false
    // Best-effort fallback: check the public profiles table if present
    Promise.resolve()
      .then(async () => {
        try {
          const { data: prof, error: pErr } = await admin.from('profiles').select('verified').eq('id', user.id).limit(1).maybeSingle()
          if (!pErr && prof && typeof prof.verified !== 'undefined') {
            profileVerified = !!prof.verified
          }
        } catch (e) {
          // Table may not exist or RLS may block; ignore
        }
      })
      .finally(() => {
        const verified = !!user.email_confirmed_at || metaVerified || profileVerified
        const entry = { type: 'verify', result: verified ? 'verified' : 'unverified', path: req.path, ip: req.ip, ts: new Date().toISOString(), userId: user.id, email: user.email, metaVerified, profileVerified, email_confirmed_at: user.email_confirmed_at }
        console.log('AUDIT verify:', entry)
        auditLog(entry)
        if (!verified) {
          return res.status(403).json({ success: false, error: 'Email verification required' })
        }
        // Attach user to request for downstream handlers if needed
        req.user = user
        next()
      })
  }).catch((e) => {
    const entry = { type: 'verify', result: 'exception', path: req.path, ip: req.ip, ts: new Date().toISOString(), error: e?.message }
    console.error('AUDIT verify:', entry)
    auditLog(entry)
    return res.status(500).json({ success: false, error: 'Verification check failed' })
  })
}

// Verified-only endpoint for user info
app.get('/api/me', ipAllowlist, rateLimiter, requireVerified, (req, res) => {
  const u = req.user || null
  res.json({ success: true, user: u ? { id: u.id, email: u.email, email_confirmed_at: u.email_confirmed_at } : null })
})

// JWT email verification workflow
const VERIFY_SECRET = process.env.VERIFICATION_JWT_SECRET || (process.env.SUPABASE_SERVICE_ROLE_KEY ? crypto.createHash('sha256').update(String(process.env.SUPABASE_SERVICE_ROLE_KEY)).digest('hex') : crypto.randomBytes(32).toString('hex'))
const TOKEN_TTL_SECONDS = Number(process.env.VERIFICATION_TOKEN_TTL_SECONDS || 24 * 60 * 60)
const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:5173'
const SUCCESS_REDIRECT_URL = process.env.SUCCESS_REDIRECT_URL || `${WEBSITE_URL}/?verify=success`
const FAILURE_REDIRECT_URL = process.env.FAILURE_REDIRECT_URL || `${WEBSITE_URL}/verify?error=invalid`

// Issue CSRF token
app.get('/api/csrf', ipAllowlist, rateLimiter, (req, res) => csrfIssue(req, res))

// Send verification email with JWT link
app.post('/api/send-verification', ipAllowlist, rateLimiter, csrfCheck, async (req, res) => {
  try {
    const { email, userId } = req.body || {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Valid email required' })
    }
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'userId required' })
    }
    const nowSec = Math.floor(Date.now() / 1000)
    const jti = randomToken(16)
    const token = signJwtHS256({ sub: userId, email, type: 'email_verify', iat: nowSec, exp: nowSec + TOKEN_TTL_SECONDS, jti }, VERIFY_SECRET)
    const link = `${WEBSITE_URL}/api/verify?token=${encodeURIComponent(token)}`
    
    // Attempt email via Resend if configured
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'FixRez <onboarding@resend.dev>',
            to: email,
            subject: 'Verify your email',
            text: `Please verify your email address by clicking the link below. This link expires in 24 hours.\n\n${link}`,
          })
        })
        const ok = resp.ok
        let data
        try { data = await resp.json() } catch { data = null }
        if (!ok) {
          const details = data && (data.error || data.message) ? (data.error || data.message) : `Status ${resp.status}`
          console.error('Send verification failed:', details)
          auditLog({ type: 'send_verification_fail', email, userId, ts: new Date().toISOString(), details })
          return res.status(502).json({ success: false, error: 'Failed to send email', details })
        }
        auditLog({ type: 'send_verification', email, userId, ts: new Date().toISOString(), provider: 'resend', id: data?.id || null })
        return res.status(200).json({ success: true, queued: true })
      } catch (err) {
        console.error('Email provider error:', err?.message || err)
        auditLog({ type: 'send_verification_error', email, userId, ts: new Date().toISOString(), error: err?.message || 'Unknown' })
        return res.status(502).json({ success: false, error: 'Email provider error' })
      }
    }

    // No provider configured; return link for manual testing
    auditLog({ type: 'send_verification_no_provider', email, userId, ts: new Date().toISOString() })
    return res.status(200).json({ success: true, queued: false, link })
  } catch (e) {
    console.error('send-verification error:', e?.message || e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// Verify token → mark profile verified and redirect
app.get('/api/verify', ipAllowlist, rateLimiter, async (req, res) => {
  try {
    const token = String(req.query.token || '')
    if (!token) return res.redirect(FAILURE_REDIRECT_URL)
    let payload
    try {
      payload = verifyJwtHS256(token, VERIFY_SECRET)
    } catch (e) {
      auditLog({ type: 'verify_attempt_fail', reason: e?.message || 'invalid', ip: req.ip, ts: new Date().toISOString() })
      return res.redirect(FAILURE_REDIRECT_URL)
    }
    const { sub: userId, email } = payload || {}
    if (!userId || !email) return res.redirect(FAILURE_REDIRECT_URL)

    const supabaseUrl = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const admin = createClient(supabaseUrl, serviceKey)

    // Ensure profile exists; then set verified=true
    try {
      await admin.from('profiles').upsert({ id: userId, email, verified: true }, { onConflict: 'id' })
    } catch (e) {
      console.error('Profile upsert error:', e?.message || e)
    }

    auditLog({ type: 'verify_success', userId, email, ts: new Date().toISOString() })
    return res.redirect(SUCCESS_REDIRECT_URL)
  } catch (e) {
    console.error('verify endpoint error:', e?.message || e)
    return res.redirect(FAILURE_REDIRECT_URL)
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
});

