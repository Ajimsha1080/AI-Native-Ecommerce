import { safeFetch } from '../src/lib/utils/safe-fetch';
import { checkRateLimit } from '../src/lib/utils/rate-limiter';
import { validatePasswordPolicy, hashPassword, verifyPassword, requireRole } from '../src/lib/auth';

async function runSecuritySuite() {
  console.log('========================================================');
  console.log('🛡️  RUNNING PRE-LAUNCH SECURITY & RESIDUAL RISK SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assertTest(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${total}. ${name}`);
    } else {
      console.error(`[FAIL] ${total}. ${name} - ${detail || 'Failed'}`);
    }
  }

  async function checkSafeFetch(url: string) {
    try {
      const res = await safeFetch(url);
      return { ok: res.ok, error: null };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  // 1. SSRF Protection: Loopback & Private IP Blocking
  console.log('--- 1. SSRF PROTECTION ENGINE ---');
  const loopbackTest = await checkSafeFetch('http://127.0.0.1:8000/health');
  assertTest('Block IPv4 loopback (127.0.0.1)', !loopbackTest.ok && (loopbackTest.error?.includes('forbidden') || loopbackTest.error?.includes('private')));

  const privateTest = await checkSafeFetch('http://192.168.1.1/admin');
  assertTest('Block RFC 1918 private range (192.168.x.x)', !privateTest.ok && (privateTest.error?.includes('forbidden') || privateTest.error?.includes('private')));

  const metadataTest = await checkSafeFetch('http://169.254.169.254/latest/meta-data/');
  assertTest('Block AWS/Cloud metadata IP (169.254.169.254)', !metadataTest.ok && (metadataTest.error?.includes('forbidden') || metadataTest.error?.includes('private')));

  const badProtoTest = await checkSafeFetch('file:///etc/passwd');
  assertTest('Block non-HTTP protocols (file://)', !badProtoTest.ok && (badProtoTest.error?.includes('protocol') || badProtoTest.error?.includes('forbidden')));

  // 2. Rate Limiting Engine
  console.log('\n--- 2. SLIDING WINDOW RATE LIMITER ---');
  const limitKey = 'test_ip_192_0_2_1';
  let blockedAt = -1;
  for (let i = 0; i < 15; i++) {
    const res = checkRateLimit(limitKey, { limit: 10, intervalMs: 60000 });
    if (!res.allowed && blockedAt === -1) {
      blockedAt = i;
    }
  }
  assertTest('Rate limiter blocks bursts exceeding burst threshold', blockedAt === 10);

  // 3. Password Security & Policy
  console.log('\n--- 3. PASSWORD POLICY & HASHING ---');
  const weakPw = validatePasswordPolicy('weak');
  assertTest('Reject short passwords (<8 chars)', !weakPw.valid);

  const strongPw = validatePasswordPolicy('Enterprise#Secure2026!');
  assertTest('Accept compliant strong password with mixed case, number, symbol', strongPw.valid);

  const hashed = await hashPassword('Enterprise#Secure2026!');
  const verified = await verifyPassword('Enterprise#Secure2026!', hashed);
  const wrongVerified = await verifyPassword('WrongPassword123!', hashed);
  assertTest('Argon2/PBKDF2 Password hashing verifies correctly', verified && !wrongVerified);

  // 4. RBAC Authorization Rules
  console.log('\n--- 4. ROLE-BASED ACCESS CONTROL (RBAC) ---');
  const viewerSession: any = { role: 'VIEWER', workspace_id: 'ws_acme_corp', email: 'v@acme.com' };
  const adminSession: any = { role: 'ADMIN', workspace_id: 'ws_acme_corp', email: 'a@acme.com' };
  const ownerSession: any = { role: 'OWNER', workspace_id: 'ws_acme_corp', email: 'o@acme.com' };

  const viewerMutation = requireRole(viewerSession, ['ADMIN', 'OWNER']);
  assertTest('Block VIEWER from performing ADMIN mutations', !viewerMutation);

  const adminMutation = requireRole(adminSession, ['ADMIN', 'OWNER']);
  assertTest('Allow ADMIN to perform workspace configuration changes', adminMutation);

  const adminDelete = requireRole(adminSession, ['OWNER']);
  assertTest('Block ADMIN from tenant deletion (Requires OWNER role)', !adminDelete);

  const ownerDelete = requireRole(ownerSession, ['OWNER']);
  assertTest('Allow OWNER to execute workspace deletion', ownerDelete);

  console.log('\n========================================================');
  console.log(`📊 SECURITY SUITE SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================');

  if (passed < total) {
    process.exit(1);
  }
}

runSecuritySuite().catch(err => {
  console.error(err);
  process.exit(1);
});
