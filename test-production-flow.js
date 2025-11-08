// Production-like verification flow test (requires real Supabase JWT and Resend configured)
// Set env: NODE_ENV=production, DEV_AUTH_BYPASS=false, RESEND_API_KEY + RESEND_FROM_EMAIL
// Usage: node test-production-flow.js <bearer_token> <email>

const base = process.env.API_BASE || 'http://localhost:3003/api'

async function run() {
  const token = process.argv[2]
  const email = process.argv[3]
  if (!token || !email) {
    console.error('Usage: node test-production-flow.js <bearer_token> <email>')
    process.exit(2)
  }
  const auth = { 'Authorization': `Bearer ${token}` }

  try {
    console.log('🧪 Starting production verification flow test...')

    // 1) Send verification email via Resend
    console.log('\n➡ POST /send-verification')
    const sendRes = await fetch(`${base}/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ email })
    })
    const sendJson = await sendRes.json().catch(() => ({}))
    console.log('Status:', sendRes.status)
    console.log('Body:', JSON.stringify(sendJson, null, 2))
    if (!sendRes.ok) throw new Error(`send-verification failed: ${sendRes.status}`)

    // 2) Check verification status (should have valid token)
    console.log('\n➡ GET /verification-status')
    const statusRes = await fetch(`${base}/verification-status`, { headers: auth })
    const statusJson = await statusRes.json().catch(() => ({}))
    console.log('Status:', statusRes.status)
    console.log('Body:', JSON.stringify(statusJson, null, 2))
    if (!statusRes.ok) throw new Error(`verification-status failed: ${statusRes.status}`)

    // 3) Metrics endpoint (auth protected)
    console.log('\n➡ GET /verification-metrics')
    const metricsRes = await fetch(`${base}/verification-metrics`, { headers: auth })
    const metricsJson = await metricsRes.json().catch(() => ({}))
    console.log('Status:', metricsRes.status)
    console.log('Body:', JSON.stringify(metricsJson, null, 2))
    if (!metricsRes.ok) throw new Error(`verification-metrics failed: ${metricsRes.status}`)

    console.log('\n📧 Check your inbox for the verification email and click the link.')
    console.log('   Then re-run this script with the bearer token to confirm verified status.')
    console.log('\n🎉 Production verification flow test steps executed. Awaiting user action to complete verification.')
  } catch (err) {
    console.error('❌ Production flow test failed:', err?.message || err)
    process.exit(1)
  }
}

run()