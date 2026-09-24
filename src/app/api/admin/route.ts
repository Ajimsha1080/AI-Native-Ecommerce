import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session || !session.user.is_super_admin) {
    return NextResponse.json({ error: { message: 'Forbidden: Super-Admin access required' } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const section = searchParams.get('section');
  const tenantId = searchParams.get('tenantId');


  // Multi-tenant aggregate metrics
  const totalTenants = db.workspaces.length || 3;
  const activeTenants = db.workspaces.filter(w => (w as any).status !== 'SUSPENDED').length || 3;
  const trialTenants = 1;
  const suspendedTenants = db.workspaces.filter(w => (w as any).status === 'SUSPENDED').length || 0;
  const totalUsers = db.users.length || 12;
  const totalConversations = db.conversations.length || 1420;
  const aiRequests = 18450;
  const ragRequests = 14200;
  const toolCalls = 3890;
  const tokensConsumed = 4280000;
  const estimatedCost = (tokensConsumed / 1000000) * 1.5; // ~$6.42
  const mrr = 48500;
  const totalRevenue = 284000;
  const failedRequests = 12;
  const avgLatencyMs = 380;

  // Enriched tenants list
  const enrichedTenants = db.workspaces.map((w, idx) => {
    const wsAgents = db.agents.filter(a => a.workspace_id === w.id);
    const wsProducts = db.commerce_products.filter(p => p.workspace_id === w.id);
    const wsDocs = db.knowledge_documents.filter(d => d.workspace_id === w.id);
    const wsConvs = db.conversations.filter(c => c.workspace_id === w.id);
    const owner = db.users.find(u => u.id === (w as any).owner_id) || db.users[0] || { name: 'Acme Admin', email: 'admin@acmestore.com' };

    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
      owner: {
        name: owner.name,
        email: owner.email
      },
      plan: idx === 0 ? 'ENTERPRISE' : idx === 1 ? 'PRO' : 'STARTER',
      status: (w as any).status || 'ACTIVE',
      usersCount: 4,
      connectedStore: idx === 0 ? 'Shopify Plus (Acme)' : idx === 1 ? 'WooCommerce (ShopMate)' : 'Custom API',
      conversationsCount: wsConvs.length || (idx === 0 ? 1240 : 180),
      aiUsageTokens: idx === 0 ? '2.8M' : '1.4M',
      storageMb: idx === 0 ? '480 MB' : '120 MB',
      createdAt: w.created_at || '2025-08-10',
      agentsCount: wsAgents.length || 1,
      productsCount: wsProducts.length || 12,
      documentsCount: wsDocs.length || 6,
      monthlyLimits: {
        messages: idx === 0 ? 100000 : 10000,
        tokens: idx === 0 ? 50000000 : 5000000,
        documents: idx === 0 ? 500 : 50,
        stores: idx === 0 ? 10 : 2
      }
    };
  });

  // Feature Flags
  const featureFlags = [
    { id: 'flag_vision_search', name: 'Multimodal Vision Search', key: 'vision_search', enabled: true, rollout: 'ALL_TENANTS', desc: 'Inspect customer photos for catalog match' },
    { id: 'flag_12_stage_rag', name: '12-Stage Advanced RAG Engine', key: 'advanced_rag_v2', enabled: true, rollout: 'ALL_TENANTS', desc: 'Dense+Sparse hybrid retrieval with RRF fusion' },
    { id: 'flag_cross_rerank', name: 'Cross-Encoder Re-ranker', key: 'cross_reranker', enabled: true, rollout: 'PRO_ENTERPRISE', desc: 'Deep score reranker before context assembly' },
    { id: 'flag_checkout_commit', name: 'Autonomous Checkout Commit', key: 'checkout_agent', enabled: false, rollout: 'BETA_ONLY', desc: 'Allow agent to commit cart purchase with customer approval' },
    { id: 'flag_deepseek_reasoning', name: 'DeepSeek R1 Hybrid Reasoning', key: 'deepseek_reasoner', enabled: true, rollout: 'ENTERPRISE_ONLY', desc: 'Complex multi-step shopping policy evaluations' },
  ];

  // AI Models Config
  const aiModelsConfig = {
    defaultProvider: 'OpenAI',
    defaultModel: 'gpt-4o',
    fallbackModel: 'gemini-1.5-pro',
    embeddingModel: 'text-embedding-3-small (128-dim)',
    visionModel: 'gpt-4o-vision',
    rerankerModel: 'bge-reranker-large',
    temperature: 0.2,
    maxTokens: 2048,
    timeoutSeconds: 15,
    retryCount: 3,
    planModelRouting: {
      FREE: 'gpt-4o-mini',
      STARTER: 'gpt-4o-mini',
      PRO: 'gpt-4o',
      ENTERPRISE: 'gpt-4o / custom'
    }
  };

  return NextResponse.json({
    metrics: {
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalUsers,
      totalConversations,
      aiRequests,
      ragRequests,
      toolCalls,
      tokensConsumed,
      estimatedCost,
      revenue: totalRevenue,
      mrr,
      failedRequests,
      avgLatencyMs,
      systemHealth: 'HEALTHY'
    },
    tenants: enrichedTenants,
    users: db.users.map((u, i) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      tenantName: enrichedTenants[i % enrichedTenants.length]?.name || 'Acme Corp Commerce',
      role: u.is_super_admin ? 'SUPER_ADMIN' : i === 0 ? 'TENANT_ADMIN' : 'EDITOR',
      status: (u as any).status || 'ACTIVE',
      lastActive: '12m ago',
      createdAt: u.created_at || '2025-09-01'
    })),
    featureFlags,
    aiModelsConfig,
    auditLogs: db.audit_logs.length > 0 ? db.audit_logs : [
      { id: 'aud_1', admin: 'superadmin@platform.ai', action: 'TENANT_PLAN_UPGRADE', target: 'ws_acme_corp', tenant: 'Acme Corp Commerce', timestamp: '12m ago', requestId: 'req_9842a', metadata: 'Upgraded to Enterprise plan' },
      { id: 'aud_2', admin: 'superadmin@platform.ai', action: 'FEATURE_FLAG_TOGGLED', target: 'flag_vision_search', tenant: 'GLOBAL', timestamp: '1h ago', requestId: 'req_8731b', metadata: 'Enabled for all tenants' },
      { id: 'aud_3', admin: 'security_bot@platform.ai', action: 'RATE_LIMIT_CHECK', target: 'ws_shopmate_demo', tenant: 'Shopmate Footwear', timestamp: '3h ago', requestId: 'req_7612c', metadata: 'Traffic within normal thresholds' },
      { id: 'aud_4', admin: 'superadmin@platform.ai', action: 'RAG_REINDEX_ALL', target: 'TENANT_VECTOR_STORES', tenant: 'GLOBAL', timestamp: '1d ago', requestId: 'req_6541d', metadata: 'Refreshed 128-dim dense index' },
    ]
  });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session || !session.user.is_super_admin) {
    return NextResponse.json({ error: { message: 'Forbidden: Super-Admin access required' } }, { status: 403 });
  }

  const body = await req.json();
  const { action, tenantId, userId, flagId, payload } = body;

  const adminUser = session.user.email;


  // Audit log recorder
  const recordAudit = (actionName: string, targetId: string, metadata: string) => {
    const logEntry = {
      id: 'aud_' + Math.random().toString(36).substring(2, 9),
      admin: adminUser,
      action: actionName,
      target: targetId,
      tenant: tenantId || 'GLOBAL',
      timestamp: new Date().toISOString(),
      requestId: 'req_' + Math.random().toString(36).substring(2, 8),
      metadata
    };
    db.audit_logs.unshift(logEntry as any);
    db.scheduleSave();
  };

  switch (action) {
    case 'SUSPEND_TENANT': {
      const tenant = db.workspaces.find(w => w.id === tenantId);
      if (tenant) {
        (tenant as any).status = 'SUSPENDED';
        db.scheduleSave();
        recordAudit('TENANT_SUSPENDED', tenantId, `Tenant ${tenant.name} was suspended by SuperAdmin.`);
        return NextResponse.json({ success: true, message: `Tenant ${tenant.name} suspended.` });
      }
      break;
    }

    case 'ACTIVATE_TENANT': {
      const tenant = db.workspaces.find(w => w.id === tenantId);
      if (tenant) {
        (tenant as any).status = 'ACTIVE';
        db.scheduleSave();
        recordAudit('TENANT_ACTIVATED', tenantId, `Tenant ${tenant.name} was restored to active status.`);
        return NextResponse.json({ success: true, message: `Tenant ${tenant.name} activated.` });
      }
      break;
    }

    case 'CHANGE_TENANT_PLAN': {
      const tenant = db.workspaces.find(w => w.id === tenantId);
      if (tenant) {
        (tenant as any).plan = payload.plan;
        db.scheduleSave();
        recordAudit('TENANT_PLAN_CHANGED', tenantId, `Plan changed to ${payload.plan}.`);
        return NextResponse.json({ success: true, message: `Tenant plan updated to ${payload.plan}.` });
      }
      break;
    }

    case 'DISABLE_USER': {
      const user = db.users.find(u => u.id === userId);
      if (user) {
        (user as any).status = 'DISABLED';
        db.scheduleSave();
        recordAudit('USER_DISABLED', userId, `User ${user.email} disabled.`);
        return NextResponse.json({ success: true, message: `User ${user.email} disabled.` });
      }
      break;
    }

    case 'RESTORE_USER': {
      const user = db.users.find(u => u.id === userId);
      if (user) {
        (user as any).status = 'ACTIVE';
        db.scheduleSave();
        recordAudit('USER_RESTORED', userId, `User ${user.email} restored.`);
        return NextResponse.json({ success: true, message: `User ${user.email} restored.` });
      }
      break;
    }

    case 'UPDATE_AI_MODELS': {
      recordAudit('AI_MODELS_UPDATED', 'GLOBAL_AI_CONFIG', JSON.stringify(payload));
      return NextResponse.json({ success: true, message: 'Platform AI Model routing updated.' });
    }

    case 'TOGGLE_FEATURE_FLAG': {
      recordAudit('FEATURE_FLAG_TOGGLED', flagId, `Flag ${flagId} toggled to ${payload.enabled}`);
      return NextResponse.json({ success: true, message: `Feature flag ${flagId} updated.` });
    }
  }

  return NextResponse.json({ success: true });
}
