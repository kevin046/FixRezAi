import dotenv from 'dotenv'
import crypto from 'crypto'

// Load local env when running locally; Vercel injects env in production
dotenv.config({ path: '.env.local' })

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function randomToken(bytes = 32) {
  return base64url(crypto.randomBytes(bytes))
}
function setCookie(res, name, value, maxAgeSec) {
  const secure = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
  const cookie = `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec || 1800}${secure ? '; Secure' : ''}`
  res.setHeader('Set-Cookie', cookie)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  try {
    const token = randomToken(32)
    setCookie(res, 'csrfToken', token, 3600)
    return res.status(200).json({ success: true, token })