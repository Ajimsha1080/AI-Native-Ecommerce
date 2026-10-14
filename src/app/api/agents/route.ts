import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { AgentConfig } from '@/types';
import { STANDARD_TOOLS } from '@/lib/db/seed';
import { enforceQuota } from '@/lib/billing/limits';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  let agents = await db.agents.findMany(session.workspaceId);
  if (agents.length === 0) {
    const newAgent = {
      id: generateId('agent'),
      workspace_id: session.workspaceId,
      name: 'ShopMate AI',
      description: 'Autonomous commerce concierge specialized in product discovery, live inventory queries, order status, and customer assistance.',
      industry: 'Omnichannel Retail & E-Commerce',
      primary_objective: 'Boost product conversions and handle order inquiries autonomously with verified tool executions.',
      language: 'English',
      status: 'PUBLISHED' as const,
      current_version_id: 'ver_shopmate_v1_0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.agents.create(session.workspaceId, newAgent);

    await db.agent_configs.create(session.workspaceId, {
      id: generateId('cfg'),
      agent_id: newAgent.id,
      model: 'sarvam-105b-conversations',
      temperature: 0.7,
      max_tokens: 2048,
      system_prompt: 'You are ShopMate AI, the official AI commerce assistant.',
      tools: STANDARD_TOOLS.map(t => t.id),
      guardrails: {},
      rag_enabled: true,
      updated_at: new Date().toISOString()
    });

    agents = [newAgent];
  }
  return NextResponse.json({ agents });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions to create agent' } }, { status: 403 });
  }

  // Quota enforcement
  const quota = await enforceQuota(session.workspaceId, 'agents', 1);
  if (!quota.allowed && quota.response) {
    return quota.response;
  }

  try {
    const body = await req.json();
    const agentId = generateId('agent');

    const newAgent = {
      id: agentId,
      workspace_id: session.workspaceId,
      name: body.name || 'New Commerce Assistant',
      description: body.description || 'AI shopping assistant for e-commerce store.',
      industry: body.industry || 'E-Commerce & Retail',
      primary_objective: body.primary_objective || 'Product discovery and order support.',
      language: body.language || 'English',
      status: 'DRAFT' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.agents.create(session.workspaceId, newAgent);

    const config: AgentConfig = {
      id: generateId('cfg'),
      agent_id: agentId,
      model: 'sarvam-105b-conversations',
      temperature: 0.7,
      max_tokens: 2048,
      system_prompt: 'You are ' + newAgent.name + ', the official AI commerce assistant.',
      tools: STANDARD_TOOLS.map(t => t.id),
      guardrails: {},
      rag_enabled: true,
      updated_at: new Date().toISOString()
    };
    await db.agent_configs.create(session.workspaceId, config);

    await db.audit_logs.create(session.workspaceId, {
      id: generateId('aud'),
      workspace_id: session.workspaceId,
      user_id: session.user.id,
      action: 'AGENT_CREATED',
      resource_type: 'Agent',
      resource_id: agentId,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, agent: newAgent, config });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Creation failed' } }, { status: 500 });
  }
}
