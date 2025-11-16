import fetch from 'node-fetch'

async function run() {
  const base = process.env.API_BASE || 'http://localhost:3001/api'

  console.log('Test: POST /optimize without Authorization header should 401')
  const res1 = await fetch(`${base}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobTitle: 'Engineer', jobDescription: 'Build stuff', resumeText: 'My resume with experience and education...' })
  })
  console.log('Status:', res1.status)
  const body1 = await res1.text()
  console.log('Body:', body1)

  console.log('Test: POST /optimize with fake token should 401')
  const res2 = await fetch(`${base}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer faketoken' },
    body: JSON.stringify({ jobTitle: 'Engineer', jobDescription: 'Build stuff', resumeText: 'My resume with experience and education...' })
  })
  console.log('Status:', res2.status)