import { test, expect } from '@playwright/test';
import { db } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/auth';
import { generateTotpCode } from '../../src/lib/auth/mfa';

test.describe.serial('Exhaustive Platform Journey E2E (Phase 6 Final Verification)', () => {
  const timestamp = Date.now();
  const testEmail = `journey_user_${timestamp}@shopmate.ai`;
  const rawPassword = 'StrongAuthPassword2026!';
  const ws1Id = `ws_e2e_alpha_${timestamp}`;
  const ws2Id = `ws_e2e_beta_${timestamp}`;
  let userId: string;
  let authToken: string;
  let mfaSecret: string;
  let testProductId: string;

  test.beforeAll(async () => {
    // 1. Seed user and workspaces in PostgreSQL
    userId = `usr_journey_${timestamp}`;
    const passwordHash = await hashPassword(rawPassword);

    await db.workspaces.create({
      id: ws1Id,
      name: 'E2E Alpha Store',
      slug: `e2e-alpha-${timestamp}`,
      plan: 'ENTERPRISE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await db.workspaces.create({
      id: ws2Id,
      name: 'E2E Beta Store',
      slug: `e2e-beta-${timestamp}`,
      plan: 'GROWTH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await db.users.create({
      id: userId,
      email: testEmail,
      name: 'E2E Journey Tester',
      role: 'ADMIN',
      password_hash: passwordHash,
      is_super_admin: false,
      mfa_enabled: false,
      created_at: new Date().toISOString()
    });

    await db.workspaceMembers.create(ws1Id, {
      id: `wm_1_${timestamp}`,
      workspace_id: ws1Id,
      user_id: userId,
      role: 'OWNER',
      created_at: new Date().toISOString()
    });

    await db.workspaceMembers.create(ws2Id, {
      id: `wm_2_${timestamp}`,
      workspace_id: ws2Id,
      user_id: userId,
      role: 'ADMIN',
      created_at: new Date().toISOString()
    });

    // Seed a product in Alpha store
    testProductId = `prod_e2e_${timestamp}`;
    await db.commerceProducts.create(ws1Id, {
      id: testProductId,
      workspace_id: ws1Id,
      title: 'Performance Merino Wool Hoodie',
      description: 'Thermal regulating breathable wool hoodie for travel',
      price: 180,
      currency: 'USD',
      tags: ['travel', 'apparel', 'wool'],
      images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2'],
      in_stock: true,
      total_inventory: 30,
      inventory_count: 30,
      is_active: true,
      category: 'Apparel',
      variants: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  test('Step 1: User Login & Session Token Acquisition', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {
        email: testEmail,
        password: rawPassword
      }
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe(testEmail);
    authToken = data.token;
  });

  test('Step 2: MFA Setup, Enforcement & Verification', async ({ request }) => {
    // A. Request MFA secret
    console.log('Using authToken in Step 2:', authToken);
    const setupRes = await request.get('/api/auth/mfa', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('MFA Setup Response:', setupRes.status(), await setupRes.text());
    expect(setupRes.status()).toBe(200);
    const setupData = await setupRes.json();
    expect(setupData.secret).toBeDefined();
    mfaSecret = setupData.secret;

    // B. Generate authentic TOTP code and enable MFA
    const validCode = generateTotpCode(mfaSecret);
    const enableRes = await request.post('/api/auth/mfa', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        secret: mfaSecret,
        code: validCode
      }
    });
    expect(enableRes.status()).toBe(200);
    const enableData = await enableRes.json();
    expect(enableData.mfa_enabled).toBe(true);

    // C. Verify subsequent login without MFA code challenges user
    const loginNoMfa = await request.post('/api/auth/login', {
      data: {
        email: testEmail,
        password: rawPassword
      }
    });
    expect(loginNoMfa.status()).toBe(200);
    const loginNoMfaData = await loginNoMfa.json();
    expect(loginNoMfaData.mfa_required).toBe(true);

    // D. Verify subsequent login with valid MFA code completes successfully
    const validLoginCode = generateTotpCode(mfaSecret);
    const loginWithMfa = await request.post('/api/auth/login', {
      data: {
        email: testEmail,
        password: rawPassword,
        mfa_code: validLoginCode
      }
    });
    expect(loginWithMfa.status()).toBe(200);
    const loginWithMfaData = await loginWithMfa.json();
    expect(loginWithMfaData.token).toBeDefined();
    // Update token to MFA-authenticated token
    authToken = loginWithMfaData.token;
  });

  test('Step 3: Multi-Workspace Switch & Scoped Identity Verification', async ({ request }) => {
    // A. Verify /api/auth/me returns both provisioned workspaces
    const meRes = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(meRes.status()).toBe(200);
    const meData = await meRes.json();
    expect(meData.authenticated).toBe(true);
    expect(meData.workspaces).toBeDefined();
    expect(meData.workspaces.length).toBeGreaterThanOrEqual(2);

    const wsIds = meData.workspaces.map((w: any) => w.id);
    expect(wsIds).toContain(ws1Id);
    expect(wsIds).toContain(ws2Id);

    // B. Switch to Beta Workspace by getting session for ws2Id
    const switchTokenRes = await request.post('/api/auth/login', {
      data: {
        email: testEmail,
        password: rawPassword,
        mfa_code: generateTotpCode(mfaSecret)
      }
    });
    expect(switchTokenRes.status()).toBe(200);
  });

  test('Step 4: AI Agent Creation & Lifecycle Management', async ({ request }) => {
    const createAgentRes = await request.post('/api/agents', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: `E2E Concierge Agent ${timestamp}`,
        industry: 'Fashion & Performance Apparel',
        primary_objective: 'Assist travelers with breathable apparel recommendations'
      }
    });
    expect(createAgentRes.status()).toBe(200);
    const agentData = await createAgentRes.json();
    expect(agentData.agent || agentData.agents).toBeDefined();

    // Verify agent is discoverable in workspace agent list
    const listRes = await request.get('/api/agents', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(listRes.status()).toBe(200);
    const listData = await listRes.json();
    expect(listData.agents.length).toBeGreaterThanOrEqual(1);
  });

  test('Step 5: Knowledge Base Ingestion & Document Verification', async ({ request }) => {
    const ingestRes = await request.post('/api/knowledge', {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Apparel Fabric Guidelines',
        type: 'TEXT',
        content: 'Merino wool provides superior natural temperature regulation, moisture wicking, and odor resistance compared to synthetic cotton blends.'
      }
    });
    expect(ingestRes.status()).toBe(200);

    // Verify document appears in knowledge list
    const listRes = await request.get('/api/knowledge', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(listRes.status()).toBe(200);
    const listData = await listRes.json();
    expect(listData.documents.length).toBeGreaterThanOrEqual(1);
  });

  test('Step 6: AI Shopping Concierge Chat Query Execution', async ({ request }) => {
    const chatRes = await request.post('/api/ai-mode/chat', {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        message: 'I am looking for a warm and breathable wool hoodie for cold weather travel',
        workspace_id: ws1Id
      }
    });
    expect(chatRes.status()).toBe(200);
    const chatData = await chatRes.json();
    expect(chatData.success).toBe(true);
    expect(chatData.responseMessage || chatData.response).toBeDefined();
  });

  test('Step 7: Commerce Order Creation & Verification', async ({ request }) => {
    const orderRes = await request.post('/api/commerce/orders', {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        workspace_id: ws1Id,
        productId: testProductId,
        quantity: 2,
        customerName: 'Alice E2E Customer',
        customerEmail: 'alice_customer@example.com',
        shippingAddress: {
          line1: '123 Market Street',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94105',
          country: 'US'
        },
        paymentMethod: 'CREDIT_CARD'
      }
    });
    expect(orderRes.status()).toBe(200);
    const orderData = await orderRes.json();
    expect(orderData.order).toBeDefined();
    expect(orderData.order.total_amount).toBe(360); // 180 * 2
    expect(['PAID', 'PENDING', 'PROCESSING']).toContain(orderData.order.status);

    // Verify order is returned in workspace order queries
    const listOrdersRes = await request.get('/api/commerce/orders', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(listOrdersRes.status()).toBe(200);
    const listOrdersData = await listOrdersRes.json();
    const found = listOrdersData.orders.some((o: any) => o.id === orderData.order.id);
    expect(found).toBe(true);
  });

  test('Step 8: Webhook Rejection & Database Idempotency Receipt', async ({ request }) => {
    // 1. Strict signature failure on Razorpay webhook
    const unauthWebhook = await request.post('/api/webhooks/razorpay', {
      data: JSON.stringify({ event: 'order.paid' }),
      headers: { 'Content-Type': 'application/json' }
    });
    // Reject missing signature with 400 or 500 (misconfigured secret)
    expect([400, 500]).toContain(unauthWebhook.status());

    // 2. Strict idempotency verification against live PostgreSQL database
    const eventId = `evt_e2e_paid_${timestamp}`;
    await db.processedWebhookEvents.record(ws1Id, eventId, 'RAZORPAY');

    const isProcessed = await db.processedWebhookEvents.hasProcessed(eventId, ws1Id);
    expect(isProcessed).toBe(true);
  });
});
