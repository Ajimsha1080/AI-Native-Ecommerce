import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

const updateAgentSchema = z.object({
  agent: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    industry: z.string().max(100).optional(),
    primary_objective: z.string().max(500).optional(),
    language: z.string().max(50).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional()
  }).strict().optional(),
  config: z.object({
    instructions: z.object({
      system_prompt: z.string().optional()
    }).optional(),
    personality: z.object({
      tone: z.string().optional()
    }).optional()
  }).optional()
}).strict();

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  let agent = await db.agents.findById(session.workspaceId, id);
  if (!agent) {
    const agents = await db.agents.findMany(session.workspaceId);
    agent = agents[0] || null;
  }
  if (!agent) {
    return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });
  }

  const config = await db.agent_configs.findByAgentId(session.workspaceId, agent.id);

  return NextResponse.json({
    agent,
    config,
    tools: [],
    policies: [],
    versions: [],
    deployments: []
  });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to update agent' } }, { status: 403 });
  }

  const agent = await db.agents.findById(session.workspaceId, id);
  if (!agent) return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });

  try {
    const rawBody = await req.json();
    let payload = rawBody;
    if (rawBody && !rawBody.agent && !rawBody.config) {
      payload = {
        agent: {
          name: rawBody.name,
          description: rawBody.description,
          industry: rawBody.industry,
          primary_objective: rawBody.primary_objective,
          language: rawBody.language,
          status: rawBody.status
        },
        config: {
          instructions: rawBody.system_prompt ? { system_prompt: rawBody.system_prompt } : undefined
        }
      };
    }

    const { agent: agentData, config: configData } = payload;

    if (agentData) {
      await db.agents.update(session.workspaceId, id, agentData);
    }

    if (configData && configData.instructions?.system_prompt) {
      await db.agent_configs.update(session.workspaceId, id, {
        system_prompt: configData.instructions.system_prompt
      });
    }

    const updated = await db.agents.findById(session.workspaceId, id);
    return NextResponse.json({ success: true, agent: updated });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Update failed' } }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  return PUT(req, context);
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to delete agent' } }, { status: 403 });
  }

  const deleted = await db.agents.delete(session.workspaceId, id);
  if (deleted) {
    return NextResponse.json({ success: true, message: `Agent ${id} and all cascaded resources deleted successfully.` });
  }
  return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });
}
