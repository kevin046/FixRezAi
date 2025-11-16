/**
 * Simple Test Endpoint
 * Tests if API routing is working
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    message: 'API routing is working',
    timestamp: new Date().toISOString(),
    endpoint: '/api/test',
    method: req.method,
    headers: req.headers
  });
}