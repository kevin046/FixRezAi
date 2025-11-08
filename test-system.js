import fs from 'fs';

// Read the sample resume
const resumeText = fs.readFileSync('sample_resume.txt', 'utf8');

// Test the API endpoint
console.log('🧪 Testing Resume Optimization System...');
console.log('📄 Sample resume length:', resumeText.length, 'characters');

// Make the API call
fetch('http://localhost:3003/api/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    resumeText: resumeText,
    jobTitle: 'Financial Advisor',
    jobDescription: 'Financial advisor position requiring strong sales performance and client relationship management'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ API Response received!');
  console.log('📊 Response structure:');
  console.log('- Success:', data.success);
  console.log('- Fallback used:', data.fallback_used);
  console.log('- Has warning:', !!data.warning);
  
  if (data.success && data.data) {
    console.log('\n📋 Optimized Resume Structure:');
    console.log('- Header name:', data.data.header?.name);
    console.log('- Contact info:', data.data.header?.contact);
    console.log('- Summary length:', data.data.summary?.length || 0, 'characters');
    console.log('- Experience entries:', data.data.experience?.length || 0);
    console.log('- Education entries:', data.data.education?.length || 0);
    console.log('- Additional sections:', Object.keys(data.data.additional || {}));
    
    if (data.data.experience && data.data.experience.length > 0) {
      console.log('\n💼 Experience Details:');
      data.data.experience.forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.title} at ${job.company}`);
        console.log(`     Location: ${job.location}, Dates: ${job.dates}`);
        console.log(`     Bullets: ${job.bullets?.length || 0}`);
        if (job.bullets && job.bullets.length > 0) {
          job.bullets.forEach((bullet, bulletIndex) => {
            console.log(`       • ${bullet}`);
          });
        }
      });
    }
    
    if (data.data.additional) {
      console.log('\n📚 Additional Information:');
      Object.entries(data.data.additional).forEach(([key, value]) => {
        if (value) {
          console.log(`- ${key}: ${typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : value}`);
        }
      });
    }
  } else {
    console.log('❌ API returned error:');
    console.log('Error message:', data.error);
    console.log('Full response:', JSON.stringify(data, null, 2));
  }
  
  if (data.debug_info) {
    console.log('\n🔍 Debug Information:');
    console.log(JSON.stringify(data.debug_info, null, 2));
  }
})
.catch(error => {
  console.error('❌ Test failed:', error.message);
  console.error('Full error:', error);
});