// Test script for the optimize API endpoint
import optimizeHandler from './optimize.js';

// Mock request and response objects
const mockReq = {
  method: 'POST',
  body: {
    resumeText: 'Software Engineer with 5 years of experience in React, Node.js, and TypeScript. Developed scalable web applications and led team projects.',
    jobDescription: 'We are looking for a Senior Software Engineer with expertise in React, Node.js, and cloud technologies. Experience with team leadership preferred.'
  }
};

const mockRes = {
  statusCode: 200,
  headers: {},
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  setHeader: function(name, value) {
    this.headers[name] = value;
    return this;
  },
  json: function(data) {
    console.log('Response Status:', this.statusCode);
    console.log('Response Headers:', this.headers);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    return this;
  }
};

console.log('🧪 Testing optimize API endpoint...');
console.log('Request body:', mockReq.body);

try {
  await optimizeHandler(mockReq, mockRes);
  console.log('✅ API test completed successfully');
} catch (error) {
  console.error('❌ API test failed:', error.message);
  console.error('Stack:', error.stack);
}