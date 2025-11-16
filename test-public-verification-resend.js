// Test script to verify the new public verification resend endpoint
async function testPublicVerificationResend() {
  console.log('🧪 Testing public verification resend endpoint...')
  
  const testEmail = 'test@example.com'
  const apiBase = 'http://localhost:3003'
  
  try {
    console.log(`📧 Testing resend for: ${testEmail}`)
    const resp = await fetch(`${apiBase}/api/send-verification-public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail })
    })

    const result = await resp.json()
    console.log('Response status:', resp.status)
    console.log('Response result:', result)
    
    if (resp.ok && result.success) {
      console.log('✅ Public verification resend endpoint is working!')
    } else {
      console.log('❌ Endpoint returned error:', result.error || result.message)
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
  
  console.log('\n✅ Test completed')
}

// Run the test
testPublicVerificationResend()