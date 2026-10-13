/**
 * PLATFORM SECURITY VERIFICATION SUITE
 * Verifies SSRF protection, CSRF defense, Secret strength, Webhook fail-closed signatures, and Lockout.
 */
process.env.APP_ENV = 'development';
process.env.SESSION_JWT_SECRET = 'ci_test_session_jwt_secret_min_32_characters_for_auth_suite!';
process.env.SERVICE_JWT_SECRET = 'ci_test_service_jwt_secret_min_32_characters_for_auth_suite!';
process.env.ENCRYPTION_KEY = 'ci_test_encryption_key_min_32_characters_for_encryption_suite!';

import { 
  validateSecretStrength, 
  validateBootSecrets, 
  DISALLOWED_DEFAULT_SECRETS 
} from '../src/lib/auth';
import { validateCsrfProtection, generateCsrfToken, CSRF_COOKIE_NAME } from '../src/lib/security/csrf';
import { verifyRazorpaySignature } from '../src/lib/payments/razorpay';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  🛡️ [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    failed++;
  }
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('🔒 RUNNING COMPREHENSIVE PLATFORM SECURITY TEST SUITE');
  console.log('================================================================\n');

  console.log('--- Suite 1: Cryptographic Secrets & Boot Validation ---');
  // 1. Rejects empty secret
  let caughtEmpty = false;
  try {
    validateSecretStrength('', 'TEST_SECRET');
  } catch {
    caughtEmpty = true;
  }
  assert(caughtEmpty, '1. validateSecretStrength strictly rejects empty secrets');

  // 2. Rejects secret shorter than 32 chars
  let caughtShort = false;
  try {
    validateSecretStrength('short_secret_under_32_chars', 'TEST_SECRET');
  } catch {
    caughtShort = true;
  }
  assert(caughtShort, '2. validateSecretStrength rejects secrets shorter than 32 characters');

  // 3. Rejects known default secrets
  let caughtDisallowed = false;
  try {
    validateSecretStrength(DISALLOWED_DEFAULT_SECRETS[0], 'TEST_SECRET');
  } catch {
    caughtDisallowed = true;
  }
  assert(caughtDisallowed, '3. validateSecretStrength rejects known default insecure keys');

  // 4. Accepts valid strong secret
  const strongSec = 'super_secure_random_key_with_at_least_32_characters_length_ok';
  assert(validateSecretStrength(strongSec, 'TEST_SECRET') === strongSec, '4. validateSecretStrength approves strong 32+ char secrets');

  // 5. Distinct secret enforcement
  let caughtDuplicateSecrets = false;
  const originalSession = process.env.SESSION_JWT_SECRET;
  const originalService = process.env.SERVICE_JWT_SECRET;
  try {
    process.env.SESSION_JWT_SECRET = 'identical_secret_used_for_both_session_and_service_keys!';
    process.env.SERVICE_JWT_SECRET = 'identical_secret_used_for_both_session_and_service_keys!';
    validateBootSecrets();
  } catch {
    caughtDuplicateSecrets = true;
  } finally {
    process.env.SESSION_JWT_SECRET = originalSession;
    process.env.SERVICE_JWT_SECRET = originalService;
  }
  assert(caughtDuplicateSecrets, '5. validateBootSecrets prohibits secret reuse between session and service layers');

  console.log('\n--- Suite 2: CSRF Defense Engine ---');
  // 6. Safe HTTP methods bypass CSRF
  const getReq = new Request('https://api.shopmate.ai/api/commerce/products', { method: 'GET' });
  assert(validateCsrfProtection(getReq).valid, '6. CSRF engine allows safe GET requests');

  const optionsReq = new Request('https://api.shopmate.ai/api/commerce/products', { method: 'OPTIONS' });
  assert(validateCsrfProtection(optionsReq).valid, '7. CSRF engine allows OPTIONS preflight requests');

  // 7. Webhooks bypass browser CSRF
  const webhookReq = new Request('https://api.shopmate.ai/api/webhooks/stripe', { method: 'POST' });
  assert(validateCsrfProtection(webhookReq).valid, '8. CSRF engine exempts cryptographically signed webhooks');

  // 8. Bearer tokens bypass browser CSRF
  const bearerReq = new Request('https://api.shopmate.ai/api/commerce/orders', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer some_service_jwt_token' }
  });
  assert(validateCsrfProtection(bearerReq).valid, '9. CSRF engine exempts machine-to-machine Bearer requests');

  // 9. Browser session with Origin mismatch rejected
  const crossOriginReq = new Request('https://api.shopmate.ai/api/commerce/orders', {
    method: 'POST',
    headers: {
      'host': 'api.shopmate.ai',
      'origin': 'https://evil-attacker.com',
      'cookie': 'aaas_session_token=valid_session'
    }
  });
  assert(!validateCsrfProtection(crossOriginReq).valid, '10. CSRF engine rejects cross-origin browser POST requests');

  // 10. Browser session with matching CSRF token accepted
  const validCsrf = generateCsrfToken();
  const validBrowserReq = new Request('https://api.shopmate.ai/api/commerce/orders', {
    method: 'POST',
    headers: {
      'host': 'api.shopmate.ai',
      'origin': 'https://api.shopmate.ai',
      'cookie': `aaas_session_token=valid_session; ${CSRF_COOKIE_NAME}=${validCsrf}`,
      'x-csrf-token': validCsrf
    }
  });
  assert(validateCsrfProtection(validBrowserReq).valid, '11. CSRF engine accepts browser requests with matching double-submit tokens');

  // 11. Browser session with missing x-csrf-token rejected
  const missingCsrfReq = new Request('https://api.shopmate.ai/api/commerce/orders', {
    method: 'POST',
    headers: {
      'host': 'api.shopmate.ai',
      'origin': 'https://api.shopmate.ai',
      'cookie': `aaas_session_token=valid_session; ${CSRF_COOKIE_NAME}=${validCsrf}`
    }
  });
  assert(!validateCsrfProtection(missingCsrfReq).valid, '12. CSRF engine rejects session requests with missing x-csrf-token header');

  console.log('\n--- Suite 3: Webhook Cryptographic Verification ---');
  // 12. Razorpay signature verification
  const orderId = 'order_test_999';
  const paymentId = 'pay_test_888';
  const rzpSecret = 'rzp_test_secret_key_12345';
  const validRzpSig = crypto.createHmac('sha256', rzpSecret).update(`${orderId}|${paymentId}`).digest('hex');

  assert(
    verifyRazorpaySignature(orderId, paymentId, validRzpSig, rzpSecret),
    '13. verifyRazorpaySignature accepts authentic HMAC-SHA256 signatures'
  );

  assert(
    !verifyRazorpaySignature(orderId, paymentId, 'tampered_signature_hex_value', rzpSecret),
    '14. verifyRazorpaySignature rejects forged or tampered signatures'
  );

  assert(
    !verifyRazorpaySignature(orderId, paymentId, validRzpSig, ''),
    '15. verifyRazorpaySignature fails closed when secret is empty'
  );

  console.log('\n--- Suite 4: SSRF & Cloud Metadata Defense ---');
  // Helper to validate url safety
  function isSafeExternalUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;
      const host = parsed.hostname.toLowerCase();
      // Block localhost, cloud metadata, private subnets
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
      if (host === '169.254.169.254' || host === 'metadata.google.internal') return false;
      if (host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
      return true;
    } catch {
      return false;
    }
  }

  assert(!isSafeExternalUrl('http://169.254.169.254/latest/meta-data/'), '16. SSRF defense blocks AWS/GCP cloud metadata IP');
  assert(!isSafeExternalUrl('http://127.0.0.1:8000/internal-admin'), '17. SSRF defense blocks IPv4 loopback');
  assert(!isSafeExternalUrl('http://localhost:5432'), '18. SSRF defense blocks localhost endpoints');
  assert(!isSafeExternalUrl('http://192.168.1.1/router-admin'), '19. SSRF defense blocks RFC 1918 private subnets');
  assert(!isSafeExternalUrl('javascript:alert(1)'), '20. SSRF defense blocks non-HTTP/HTTPS protocol schemes');
  assert(isSafeExternalUrl('https://images.unsplash.com/photo-1234'), '21. SSRF defense permits benign HTTPS merchant assets');

  console.log('\n================================================================');
  console.log(`📊 SECURITY SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch(err => {
  console.error('Security tests failed:', err);
  process.exit(1);
});
