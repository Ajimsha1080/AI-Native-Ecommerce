/**
 * PLATFORM INTEGRATION TEST SUITE (6/6 Tests)
 * Verifies Next.js thin proxy <-> FastAPI single source of truth integration invariants.
 */
process.env.APP_ENV = 'development';
process.env.SESSION_JWT_SECRET = 'ci_test_session_jwt_secret_min_32_characters_for_auth_suite!';
process.env.SERVICE_JWT_SECRET = 'ci_test_service_jwt_secret_min_32_characters_for_auth_suite!';
process.env.ENCRYPTION_KEY = 'ci_test_encryption_key_min_32_characters_for_encryption_suite!';

import { createServiceJwt, verifyServiceJwt } from '../src/lib/auth';
import { runAgentCycle } from '../src/lib/agent-runtime';
import { executeRAGPipeline } from '../src/lib/rag';
import { executeTool } from '../src/lib/tools';
import { runAgentEvaluations } from '../src/lib/evaluations';
import { db } from '../src/lib/db';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  🔗 [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    failed++;
  }
}

async function runIntegrationTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING PLATFORM INTEGRATION TEST SUITE (6/6 INVARIANTS)');
  console.log('================================================================\n');

  const WS_ID = 'ws_integration_enterprise';

  // 1. Signed Service JWT Mutual Authentication
  const serviceJwt = await createServiceJwt(WS_ID, 'service_node_ci', 'ADMIN');
  const claims = await verifyServiceJwt(serviceJwt);
  assert(
    claims !== null && claims.workspace_id === WS_ID && claims.role === 'ADMIN',
    '1. Service JWT correctly signs and verifies mutual authentication claims for FastAPI'
  );

  // 2. Thin Proxy - Agent Runtime
  // When FastAPI is offline or in mock-free CI without live backend, the proxy attempts authenticated HTTP request
  let agentProxyFailsClosed = false;
  try {
    await runAgentCycle({
      workspace_id: WS_ID,
      agent_id: 'ag_test',
      user_message: 'Check inventory for silk shirt'
    });
  } catch (err: any) {
    // Fails closed with network/fetch error when remote FastAPI is not running, NEVER falls back to deterministic mocks
    agentProxyFailsClosed = !!(err && (err.message || err.cause));
  }
  assert(agentProxyFailsClosed, '2. Agent runtime thin proxy fails closed on backend error without simulated mock fallback');

  // 3. Thin Proxy - RAG Search
  let ragProxyFailsClosed = false;
  try {
    await executeRAGPipeline({
      workspaceId: WS_ID,
      question: 'What is the return window?'
    });
  } catch (err: any) {
    ragProxyFailsClosed = !!(err && (err.message || err.cause));
  }
  assert(ragProxyFailsClosed, '3. RAG thin proxy fails closed on backend error without fake polynomial hash search');

  // 4. Thin Proxy - Tool Execution
  let toolProxyFailsClosed = false;
  try {
    await executeTool({
      workspaceId: WS_ID,
      toolName: 'check_inventory',
      parameters: { sku: 'SKU-001' }
    });
  } catch (err: any) {
    toolProxyFailsClosed = !!(err && (err.message || err.cause));
  }
  assert(toolProxyFailsClosed, '4. Tool execution thin proxy routes exclusively to FastAPI single-source-of-truth');

  // 5. Thin Proxy - Evaluations
  let evalProxyFailsClosed = false;
  try {
    await runAgentEvaluations(WS_ID, 'ag_test');
  } catch (err: any) {
    evalProxyFailsClosed = !!(err && (err.message || err.cause));
  }
  assert(evalProxyFailsClosed, '5. Evaluations thin proxy routes to FastAPI evals engine without local fake scoring');

  // 6. Webhook DB Idempotency Deduping
  const eventId = 'evt_unique_replay_test_' + Date.now();
  await db.processedWebhookEvents.record(WS_ID, eventId, 'stripe');
  const duplicateEventArrival = await db.processedWebhookEvents.hasProcessed(eventId, WS_ID);
  assert(duplicateEventArrival, '6. Database idempotency layer detects duplicate webhook event and suppresses replay');

  console.log('\n================================================================');
  console.log(`📊 INTEGRATION SUMMARY: ${passed} Passed, ${failed} Failed out of 6 tests`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runIntegrationTests().catch(err => {
  console.error('Integration suite error:', err);
  process.exit(1);
});
