import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load local env for dev
dotenv.config({ path: '.env.local' });

// Import serverless-style handlers and adapt to Express
import optimizeHandler from './optimize.js';
import contactHandler from './contact.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Simple health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

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

// Middleware: require verified Supabase user
function requireVerified(req, res, next) {
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
});

