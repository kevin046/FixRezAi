const base = process.env.API_BASE || 'http://localhost:3003/api';
const testData = {
  jobTitle: 'Software Engineer',
  jobDescription: 'Software Engineer position requiring JavaScript and React skills.',
  resumeText: 'John Doe\nSoftware Developer\nExperience with JavaScript and React.'
};

async function testNoAuth() {
  console.log('\n🧪 Test 1: No Authorization header → expect 401');
  const res = await fetch(`${base}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

async function testFakeToken() {
  console.log('\n🧪 Test 2: Fake token → expect 401');
  const res = await fetch(`${base}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer faketoken' },
    body: JSON.stringify(testData)
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

async function testRun() {
  try {
    await testNoAuth();
    await testFakeToken();
    console.log('\n✅ Tests completed. Ensure 401 responses are returned for unauthenticated/invalid tokens.');
  } catch (e) {
    console.error('Test run failed:', e);
    process.exit(1);
  }
}

testRun();