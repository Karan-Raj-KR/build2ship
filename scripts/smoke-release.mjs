// Public HTTP checks only. Does not sign in, send mail, or create payments.
// Usage: RELEASE_APP_URL=https://your-preview.example node scripts/smoke-release.mjs
import assert from 'node:assert/strict';

const base = process.env.RELEASE_APP_URL || 'http://localhost:3002';
const checks = [
  ...['/', '/login', '/signup', '/forgot-password', '/privacy', '/terms', '/refund', '/support'].map(path => ({ path, status: 200 })),
  { path: '/profile', status: 307 },
  ...['/api/profile', '/api/account', '/api/admin/users', '/api/notifications', '/api/payments/entitlement', '/api/cron/deadlines', '/api/cron/digest', '/api/cron/scout', '/api/cron/refresh-sources'].map(path => ({ path, status: 401 })),
  // Auth middleware rejects this before the checkout feature gate runs.
  { path: '/api/payments/create-order', status: 401, method: 'POST' },
];
let failures = 0;
for (const { path, status, method = 'GET' } of checks) {
  try {
    const response = await fetch(new URL(path, base), {
      method, redirect: 'manual', signal: AbortSignal.timeout(15000),
      ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json', Origin: new URL(base).origin }, body: '{}' } : {}),
    });
    assert.equal(response.status, status, `Expected ${status}; received ${response.status}`);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', 'Missing nosniff header');
    assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN', 'Missing frame protection');
    if (path === '/profile') {
      assert.equal(new URL(response.headers.get('location'), base).pathname, '/login', 'Missing login redirect');
    }
    console.log(`PASS: ${method} ${path} (${status})`);
  } catch (error) {
    failures++;
    console.log(`FAIL: ${method} ${path}: ${error instanceof assert.AssertionError ? error.message : 'Request failed'}`);
  }
}
console.log('Authenticated persistence, disabled checkout, email delivery and browser interactions require separate checks.');
process.exitCode = failures ? 1 : 0;
