const base = process.env.API_BASE || 'http://localhost:3001/api';

async function testMeNoAuth() {
  console.log('\n🧪 GET /api/me without Authorization → expect 401');
  const res = await fetch(`${base}/me`, { method: 'GET' });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

async function testMeFakeToken() {
  console.log('\n🧪 GET /api/me with fake token → expect 401');
  const res = await fetch(`${base}/me`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer faketoken' }
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

async function run() {
  try {
    await testMeNoAuth();
    await testMeFakeToken();
    console.log('\n✅ /api/me verification gating tests completed.');
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
}

run();