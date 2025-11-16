// Test script to verify Resend API integration
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const testEmail = 'linkevin046@gmail.com'; // Using your verified email address

async function testResendAPI() {
  console.log('🧪 Testing Resend API integration...');
  console.log('🔍 RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
  console.log('🔍 RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'Not set');
  console.log('🔍 RESEND_REPLY_TO:', process.env.RESEND_REPLY_TO || 'Not set');

  if (!process.env.RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY is not configured');
    return;
  }

  try {
    console.log('📬 Testing direct Resend API call...');
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'FixRez <onboarding@resend.dev>',
        to: testEmail,
        subject: 'FixRez API Test',
        html: '<p>This is a test email from FixRez Resend integration.</p>'
      })
    });

    const data = await resp.json();
    console.log('📊 Response status:', resp.status);
    console.log('📊 Response data:', data);

    if (resp.ok) {
      console.log('✅ Resend API test successful!');
    } else {
      console.log('❌ Resend API test failed:', data);
    }
  } catch (error) {
    console.log('❌ Resend API error:', error.message);
  }
}

async function testServerEndpoint() {
  console.log('\n🧪 Testing server verification resend endpoint...');
  
  try {
    const resp = await fetch('http://localhost:3003/api/send-verification-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const data = await resp.json();
    console.log('📊 Server response status:', resp.status);
    console.log('📊 Server response data:', data);

    if (resp.ok && data.success) {
      console.log('✅ Server endpoint test successful!');
    } else {
      console.log('❌ Server endpoint test failed:', data.error || data.message);
    }
  } catch (error) {
    console.log('❌ Server endpoint error:', error.message);
  }
}

// Run tests
async function runTests() {
  await testResendAPI();
  await testServerEndpoint();
  console.log('\n🏁 Test completed!');
}

runTests().catch(console.error);