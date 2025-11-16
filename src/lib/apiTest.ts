/**
 * Test API Connectivity
 * Client-side test to check API connectivity
 */

export async function testApiConnectivity() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  // Test 1: Check if we're in production
  results.tests.push({
    name: 'Environment',
    hostname: window.location.hostname,
    origin: window.location.origin,
    isProduction: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  });

  // Test 2: Try to access health endpoint
  try {
    const healthResponse = await fetch('/api/health');
    results.tests.push({
      name: 'Health Endpoint',
      status: healthResponse.status,
      statusText: healthResponse.statusText,
      headers: Object.fromEntries(healthResponse.headers.entries()),
      contentType: healthResponse.headers.get('content-type'),
      url: healthResponse.url
    });

    if (healthResponse.headers.get('content-type')?.includes('application/json')) {
      const data = await healthResponse.json();
      results.tests.push({
        name: 'Health Data',
        data: data
      });
    } else {
      const text = await healthResponse.text();
      results.tests.push({
        name: 'Health Response (HTML)',
        text: text.substring(0, 500) + '...'
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'Health Endpoint Error',
      error: error.message
    });
  }

  // Test 3: Try to access verification status (without auth)
  try {
    const verifyResponse = await fetch('/api/verification/status');
    results.tests.push({
      name: 'Verification Status (No Auth)',
      status: verifyResponse.status,
      statusText: verifyResponse.statusText,
      contentType: verifyResponse.headers.get('content-type'),
      url: verifyResponse.url
    });
  } catch (error) {
    results.tests.push({
      name: 'Verification Status Error',
      error: error.message
    });
  }

  // Test 4: Check what the auth store is trying to call
  const apiBase = (() => {
    try {
      const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
      const winBase = (window as any).__VITE_API_BASE_URL as string | undefined;
      const selectedBase = envBase || winBase;
      if (selectedBase && selectedBase.length > 0) {
        return selectedBase.replace(/\/$/, '');
      }
      const host = window.location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      if (isLocal) return 'http://localhost:3003/api';
      return `${window.location.origin}/api`.replace(/\/$/, '');
    } catch {
      return '/api';
    }
  })();

  results.tests.push({
    name: 'API Base URL',
    apiBase: apiBase,
    fullUrl: `${apiBase}/verification/status`
  });

  return results;
}

// Run the test and log results
if (typeof window !== 'undefined') {
  testApiConnectivity().then(results => {
    console.log('🔍 API Connectivity Test Results:');
    console.log(JSON.stringify(results, null, 2));
  }).catch(error => {
    console.error('❌ API test failed:', error);
  });
}