import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const agent = db.agents.find(a => a.id === id && a.workspace_id === session.workspaceId);
  if (!agent) return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });

  const config = db.agent_configs.find(c => c.agent_id === id);
  const permissions = db.tool_permissions.filter(p => p.agent_id === id);
  const policies = db.agent_policies.filter(p => p.agent_id === id);
  const versions = db.agent_versions.filter(v => v.agent_id === id);
  const deployments = db.deployments.filter(d => d.agent_id === id);

  return NextResponse.json({
    agent,
    config,
    tools: db.tools.map(t => {
      const perm = permissions.find(p => p.tool_id === t.id);
      return {
        ...t,
        is_enabled: perm ? perm.is_enabled : true,
        permission_mode: perm ? perm.permission_mode : (t.risk_level === 'HIGH' ? 'REQUIRES_CONFIRMATION' : 'ALLOWED')
      };
    }),
    policies,
    versions,
    deployments
  });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const agent = db.agents.find(a => a.id === id && a.workspace_id === session.workspaceId);
  if (!agent) return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });

  try {
    const body = await req.json();

    if (body.agent) {
      if (body.agent.name) agent.name = body.agent.name;
      if (body.agent.description) agent.description = body.agent.description;
      if (body.agent.industry) agent.industry = body.agent.industry;
      if (body.agent.primary_objective) agent.primary_objective = body.agent.primary_objective;
      if (body.agent.language) agent.language = body.agent.language;
      agent.updated_at = new Date().toISOString();
    }

    if (body.config) {
      let config = db.agent_configs.find(c => c.agent_id === id);
      if (config) {
        Object.assign(config, body.config);
        config.updated_at = new Date().toISOString();
      }
    }

    if (body.tool_permissions && Array.isArray(body.tool_permissions)) {
      body.tool_permissions.forEach((tp: any) => {
        let perm = db.tool_permissions.find(p => p.agent_id === id && p.tool_id === tp.tool_id);
        if (perm) {
          perm.is_enabled = tp.is_enabled;
          perm.permission_mode = tp.permission_mode;
        }
      });
    }

    db.scheduleSave();
    return NextResponse.json({ success: true, agent });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Update failed' } }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const index = db.agents.findIndex(a => a.id === id && a.workspace_id === session.workspaceId);
  if (index >= 0) {
    db.agents.splice(index, 1);
    db.saveImmediate();
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });
}
