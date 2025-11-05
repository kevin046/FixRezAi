import fetch from 'node-fetch';

const testData = {
  jobDescription: "Software Engineer position requiring JavaScript and React skills.",
  resumeText: "John Doe\nSoftware Developer\nExperience with JavaScript and React."
};

console.log('🧪 Testing backend directly...');

async function testBackend() {
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
    console.log('Response body:', responseText);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testBackend();