import { createClient } from '@supabase/supabase-js'
import VerificationService from '../services/verificationService.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const verificationService = new VerificationService()

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(body))
}

function getPath(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    return url.pathname.replace(/^\/api\/verification\/?/, '')
  } catch {
    return ''
  }
}

async function requireAuth(req, res) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^[Bb]earer\s+/, '')
  if (!token) {
    json(res, 401, { success: false, error: 'No authorization token provided' })
    return null
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    json(res, 401, { success: false, error: 'Invalid or expired token' })
    return null
  }
  return user
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const subpath = getPath(req)

  try {
    if (subpath === 'status' && req.method === 'GET') {
      const user = await requireAuth(req, res)
      if (!user) return
      const statusResult = await verificationService.getUserVerificationStatus(user.id)
      if (!statusResult.success) {
        const isVerified = Boolean(user.email_confirmed_at)
        return json(res, 200, { success: true, status: {
          is_verified: isVerified,
          verification_timestamp: user.email_confirmed_at || null,
          verification_method: isVerified ? 'supabase_email' : null,
          has_valid_token: false,
          token_expires_at: null,
        } })
      }
      return json(res, 200, { success: true, status: statusResult.status })
    }

    if (subpath === 'create-token' && req.method === 'POST') {
      const user = await requireAuth(req, res)
      if (!user) return
      const { email, type = 'email' } = req.body || {}
      const finalEmail = email || user.email
      if (!finalEmail) return json(res, 400, { success: false, error: 'Email is required' })
      const result = await verificationService.generateVerificationToken(
        user.id,
        finalEmail,
        req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        req.headers['user-agent'] || 'unknown'
      )
      if (!result.success) return json(res, 400, { success: false, error: result.error })
      return json(res, 200, { success: true, token: result.token, expiresAt: result.expiresAt, tokenId: result.tokenId })
    }

    if (subpath === 'verify-token' && req.method === 'POST') {
      const user = await requireAuth(req, res)
      if (!user) return
      const { verificationToken, type = 'email' } = req.body || {}
      if (!verificationToken) return json(res, 400, { success: false, error: 'Verification token is required' })
      const result = await verificationService.verifyToken(
        verificationToken,
        req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        req.headers['user-agent'] || 'unknown'
      )
      if (!result.success) return json(res, 400, { success: false, error: result.error })
      return json(res, 200, { success: true, userId: result.userId, email: result.email, verifiedAt: result.verifiedAt })
    }

    if (subpath.startsWith('errors') && req.method === 'GET') {
      const user = await requireAuth(req, res)
      if (!user) return
      const targetUserId = subpath.split('/')[1] || user.id
      if (targetUserId !== user.id && !user.user_metadata?.is_admin) {
        return json(res, 403, { success: false, error: 'Access denied' })
      }
      if (!SUPABASE_SERVICE_ROLE_KEY) return json(res, 200, { success: true, errors: [] })
      const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data: errors, error } = await adminSupabase
        .from('verification_errors')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) return json(res, 200, { success: true, errors: [] })
      return json(res, 200, { success: true, errors: errors || [] })
    }

    if (subpath === 'metrics' && req.method === 'GET') {
      const user = await requireAuth(req, res)
      if (!user) return
      const isAdmin = user.user_metadata?.is_admin || false
      if (!isAdmin) return json(res, 403, { success: false, error: 'Admin access required' })
      const stats = await verificationService.getVerificationStats()
      return json(res, 200, { success: true, metrics: stats })
    }

    return json(res, 404, { success: false, error: 'Not found' })
  } catch (error) {
    return json(res, 500, { success: false, error: 'Internal server error' })
  }
}

