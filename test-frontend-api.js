// Test script to verify frontend-backend API communication via Vite proxy
const testData = {
  jobTitle: "Software Engineer",
  jobDescription: "We are looking for a Software Engineer with experience in React, Node.js, and TypeScript.",
  resumeText: "John Doe\nSoftware Developer\n\nExperience:\n- Worked on React applications\n- Built Node.js APIs\n- Used TypeScript for type safety",
};

console.log('🧪 Testing frontend-backend API communication...');
console.log('📡 Making request to http://localhost:5173/api/optimize (via Vite proxy → 3001)');

fetch('http://localhost:5173/api/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('📨 Response status:', response.status);
  console.log('📨 Response ok:', response.ok);
  return response.text();
})
.then(text => {
  try {
    const data = JSON.parse(text);
    console.log('✅ Response received:', {
      success: data.success,
      hasData: !!data.data,
      dataKeys: data.data ? Object.keys(data.data) : [],
      error: data.error
    });
    if (data.success) {
      console.log('🎉 Frontend-backend communication via proxy is working!');
    } else {
      console.log('❌ API returned error:', data.error);
    }
  } catch (e) {
    console.log('⚠️ Non-JSON response body preview:', text.substring(0, 300));
  }
})
.catch(error => {
  console.error('❌ Request failed:', error);
});