// End-to-end verification flow test
// Requires backend running on http://localhost:3003 and DEV_AUTH_BYPASS=true for local testing

const base = process.env.API_BASE || 'http://localhost:3003/api'

async function run() {
  try {
    console.log('🧪 Starting verification flow test...')

    // 1) Send verification email (dev mode returns token inline)
    const email = 'dev@localhost'
    console.log('\n➡ POST /send-verification')
    const sendRes = await fetch(`${base}/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const sendJson = await sendRes.json().catch(() => ({}))
    console.log('Status:', sendRes.status)
    console.log('Body:', JSON.stringify(sendJson, null, 2))

    if (!sendRes.ok) throw new Error(`send-verification failed: ${sendRes.status}`)
    const token = sendJson.token
    if (!token) {
      console.warn('⚠️ No token returned (expected in DEV mode). Continuing but verify may fail.')
    } else {
      console.log('✅ Received token')
    }

    // 2) Verify token
    if (token) {
      console.log('\n➡ GET /verify')
      const verifyUrl = `${base}/verify?token=${encodeURIComponent(token)}`
      const verifyRes = await fetch(verifyUrl)
      const verifyJson = await verifyRes.json().catch(() => ({}))
      console.log('Status:', verifyRes.status)
      console.log('Body:', JSON.stringify(verifyJson, null, 2))
      if (!verifyRes.ok) throw new Error(`verify failed: ${verifyRes.status}`)
    }

    // 3) Get verification status
    console.log('\n➡ GET /verification-status')
    const statusRes = await fetch(`${base}/verification-status`)
    const statusJson = await statusRes.json().catch(() => ({}))
    console.log('Status:', statusRes.status)
    console.log('Body:', JSON.stringify(statusJson, null, 2))
    if (!statusRes.ok) throw new Error(`verification-status failed: ${statusRes.status}`)

    // 4) Get /me (includes verification status via service)
    console.log('\n➡ GET /me')
    const meRes = await fetch(`${base}/me`)
    const meJson = await meRes.json().catch(() => ({}))
    console.log('Status:', meRes.status)
    console.log('Body:', JSON.stringify(meJson, null, 2))
    if (!meRes.ok) throw new Error(`/me failed: ${meRes.status}`)

    console.log('\n🎉 Verification flow test completed successfully')
  } catch (err) {
    console.error('❌ Verification flow test failed:', err?.message || err)
    process.exit(1)
  }
}

run()