// Test script to verify the verification fix
const fetch = require('node-fetch');

async function testVerificationStatus() {
  console.log('🧪 Testing verification status endpoints...');
  
  try {
    // Test the main verification status endpoint
    const response = await fetch('http://localhost:3003/api/verification/status', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('✅ Verification status response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.status) {
      console.log(`📝 is_verified: ${data.status.is_verified}`);
      console.log(`📅 verification_timestamp: ${data.status.verification_timestamp}`);
      console.log(`🔍 verification_method: ${data.status.verification_method}`);
      
      if (data.status.is_verified) {
        console.log('✅ SUCCESS: User is properly verified using Supabase email confirmation!');
      } else {
        console.log('⚠️  User is not verified - this may be expected for test token');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing verification:', error.message);
  }
}

testVerificationStatus();