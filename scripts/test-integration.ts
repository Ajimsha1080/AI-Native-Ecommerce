import assert from 'assert';
import { seedDatabaseIfEmpty } from '../src/lib/db/seed';
import { db, getDatabase } from '../src/lib/db';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/auth';
import { generateEmbedding, cosineSimilarity, searchKnowledge } from '../src/lib/rag';
import { commerceEngine } from '../src/lib/commerce';
import { executeTool } from '../src/lib/tools';
import { runAgentCycle } from '../src/lib/agent-runtime';
import { runAgentEvaluations } from '../src/lib/evaluations';

async function runAllTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING SHOPMATE AAAS PLATFORM VERIFICATION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      process.stdout.write(`[TEST] ${name} ... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err: any) {
      console.log('❌ FAILED');
      console.error('       ', err.message);
      failed++;
    }
  }

  // 1. Database & Seeder
  await test('1. Database Engine & Seed Integrity', async () => {
    await seedDatabaseIfEmpty(true);
    const database = getDatabase();
    
    assert(database.users.length >= 2, 'Must have at least 2 demo users');
    assert(database.workspaces.length >= 1, 'Must have at least 1 workspace');
    assert(database.agents.length >= 1, 'Must have at least 1 agent');
    assert(database.commerce_products.length >= 10, 'Must have at least 10 products');
    assert(database.commerce_orders.length >= 3, 'Must have at least 3 orders');
    assert(database.knowledge_chunks.length >= 5, 'Must have indexed knowledge chunks');
  });

  // 2. Authentication & JWT Tokens
  await test('2. Authentication, Hashing & JWT RBAC', async () => {
    const plain = 'superSecurePass2026!';
    const hash = await hashPassword(plain);
    const valid = await verifyPassword(plain, hash);
    const invalid = await verifyPassword('wrongPass', hash);
    
    assert.strictEqual(valid, true, 'Password verification should succeed');
    assert.strictEqual(invalid, false, 'Invalid password should fail');

    const token = await createSessionToken({
      userId: 'usr_merchant_01',
      email: 'merchant@shopmate.com',
      workspaceId: 'ws_acme_corp',
      isSuperAdmin: false
    });

    const payload = await verifySessionToken(token);
    assert(payload, 'JWT payload must be decoded');
    assert.strictEqual(payload?.email, 'merchant@shopmate.com');
  });

  // 3. RAG Semantic Embedding & Vector Search
  await test('3. 128-dim RAG Semantic Chunking & Cosine Retrieval', async () => {
    const vec1 = generateEmbedding('return and refund policy within 30 days');
    const vec2 = generateEmbedding('how do I return a package for refund');
    const vec3 = generateEmbedding('electronics high definition sound amplifier');
    
    assert.strictEqual(vec1.length, 128, 'Vector dimension must be 128');
    
    const simHigh = cosineSimilarity(vec1, vec2);
    const simLow = cosineSimilarity(vec1, vec3);
    
    assert(simHigh > simLow, 'Similar semantic queries must score higher cosine similarity');

    const searchResults = await searchKnowledge('ws_acme_corp', 'returns warranty 30 days', 2);
    assert(searchResults.length > 0, 'Should retrieve matching knowledge chunks');
    assert(searchResults[0].chunk_text.length > 0, 'Chunk text must not be empty');
  });

  // 4. Commerce Engine & Tool Dispatcher
  await test('4. Commerce Engine & Tool Execution Engine', async () => {
    // Product search with budget constraint
    const prods = await commerceEngine.searchProducts('ws_acme_corp', { query: 'running', maxPrice: 160 });
    assert(prods.length > 0, 'Must find running shoes');
    assert(prods.every(p => p.price <= 160), 'All products must satisfy maxPrice <= 160');

    // Order lookup
    const orderRes = await executeTool({
      tool_id: 'order_lookup',
      parameters: { order_number: '#10482' },
      workspace_id: 'ws_acme_corp',
      agent_id: 'agent_shopmate_01',
      conversation_id: 'conv_test_1'
    });
    assert.strictEqual(orderRes.status, 'SUCCESS');
    assert(orderRes.data.order_number, 'Order details must be returned');

    // 30-Day Return Eligibility
    const returnRes = await executeTool({
      tool_id: 'return_eligibility',
      parameters: { order_number: '#10482' },
      workspace_id: 'ws_acme_corp',
      agent_id: 'agent_shopmate_01',
      conversation_id: 'conv_test_1'
    });
    assert.strictEqual(returnRes.status, 'SUCCESS');
    assert.strictEqual(returnRes.data.eligible, true, 'Order #10482 within 30 days must be return eligible');

    // Coupon validation
    const couponRes = await executeTool({
      tool_id: 'coupon_validation',
      parameters: { coupon_code: 'WELCOME10', order_total: 100 },
      workspace_id: 'ws_acme_corp',
      agent_id: 'agent_shopmate_01',
      conversation_id: 'conv_test_1'
    });
    assert.strictEqual(couponRes.status, 'SUCCESS');
    assert.strictEqual(couponRes.data.discount_amount, 10);
  });

  // 5. Multi-Step Autonomous Agent Runtime
  await test('5. Multi-Step Agent Runtime with Trace Logging', async () => {
    const result = await runAgentCycle({
      agent_id: 'agent_shopmate_01',
      workspace_id: 'ws_acme_corp',
      user_message: 'Show me running shoes under $160 in size 9',
      channel: 'PLAYGROUND'
    });

    assert(result.response_text.length > 0, 'Agent must produce a text response');
    assert(result.trace, 'Agent must produce an execution trace');
    assert(result.trace.planning_steps.length >= 2, 'Must execute multi-step pipeline (intent, tools, inventory verification)');
    assert(result.interactive_payload, 'Must attach interactive product payload cards');
  });

  // 6. Automated Evaluations Runner
  await test('6. Automated Evaluations Runner Suite', async () => {
    const evalRun = await runAgentEvaluations('ws_acme_corp', 'agent_shopmate_01');
    assert(evalRun.metrics, 'Metrics object must be calculated');
    assert(evalRun.metrics.task_success_rate_pct >= 80, 'Task success rate must be high');
    assert(evalRun.metrics.tool_selection_accuracy_pct >= 80, 'Tool accuracy must be high');
    assert(evalRun.results.length >= 2, 'Must execute all test cases');
  });

  console.log('\n========================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner fatal crash:', err);
  process.exit(1);
});
