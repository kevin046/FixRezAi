import fetch from 'node-fetch';

async function testOptimizeAPI() {
  console.log('🧪 Testing /api/optimize endpoint...');
  
  const testData = {
    jobTitle: "Investment Advisor",
    jobDescription: "Software Engineer position requiring JavaScript, React, and Node.js experience. Looking for someone with 3+ years of experience in web development.",
    resumeText: `John Doe
Software Developer
Email: john@example.com
Phone: (555) 123-4567

Experience:
- Software Developer at TechCorp (2020-2023)
  - Developed web applications using React and Node.js
  - Improved application performance by 30%
  - Led team of 3 developers

Education:
- Bachelor of Computer Science, University of Technology (2016-2020)

Skills: JavaScript, React, Node.js, Python, SQL`
  };

  try {
    const response = await fetch('http://localhost:3001/api/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body length:', responseText.length);
    console.log('Response body preview:', responseText.substring(0, 500));

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ API call successful!');
        console.log('Response data keys:', Object.keys(data));
        if (data.success && data.data) {
          console.log('Optimized resume keys:', Object.keys(data.data));
        }
      } catch (parseError) {
        console.log('❌ Failed to parse response JSON:', parseError.message);
      }
    } else {
      console.log('❌ API call failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Raw error response:', responseText);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOptimizeAPI();