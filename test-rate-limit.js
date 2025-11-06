const base = process.env.API_BASE || 'http://localhost:3001/api';

async function hitContact(times) {
  const payload = {
    name: 'Test User',
    email: 'test@example.com',
    subject: 'Rate limit test',
    message: 'This is a test message with sufficient length.',
    honey: '',
    elapsedMs: 3000,
    challengeA: 2,
    challengeB: 3,
    challengeAnswer: 5,
  };

  const statuses = [];
  for (let i = 0; i < times; i++) {
    const res = await fetch(`${base}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    statuses.push(res.status);
  }
  return statuses;
}

async function run() {
  const over = Number(process.env.RATE_MAX || 10) + 2;
  console.log(`\n🧪 Hitting /api/contact ${over} times to trigger rate limit`);
  const statuses = await hitContact(over);
  console.log('Statuses:', statuses.join(', '));
  const limited = statuses.includes(429);
  if (!limited) {
    console.error('❌ Expected at least one 429 Too Many Requests');
    process.exit(1);
  }
  console.log('✅ Rate limiting triggered as expected.');
}

run();