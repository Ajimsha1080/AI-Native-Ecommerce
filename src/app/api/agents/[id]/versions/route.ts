import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { AgentVersion } from '@/types';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const versions = db.agent_versions.filter(v => v.agent_id === id);
  return NextResponse.json({ versions });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const agent = db.agents.find(a => a.id === id && a.workspace_id === session.workspaceId);
  if (!agent) return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });

  const { action, change_summary, version_id } = await req.json();

  if (action === 'PUBLISH') {
    const config = db.agent_configs.find(c => c.agent_id === id);
    const tools = db.tool_permissions.filter(p => p.agent_id === id);
    const policies = db.agent_policies.filter(p => p.agent_id === id);

    const existingCount = db.agent_versions.filter(v => v.agent_id === id).length;
    const nextVer = 'v' + (1 + existingCount * 0.1).toFixed(1);
    const versionId = generateId('ver');

    const newVersion: AgentVersion = {
      id: versionId,
      agent_id: id,
      version_number: nextVer,
      status: 'PUBLISHED',
      config_snapshot: JSON.parse(JSON.stringify(config)),
      tools_snapshot: JSON.parse(JSON.stringify(tools)),
      policies_snapshot: JSON.parse(JSON.stringify(policies)),
      change_summary: change_summary || ('Production Release ' + nextVer),
      published_by_user_id: session.user.id,
      created_at: new Date().toISOString()
    };

    db.agent_versions.push(newVersion);
    agent.status = 'PUBLISHED';
    agent.current_version_id = versionId;
    agent.updated_at = new Date().toISOString();

    db.audit_logs.push({
      id: generateId('aud'),
      workspace_id: session.workspaceId,
      actor_user_id: session.user.id,
      actor_email: session.user.email,
      action: 'AGENT_PUBLISHED',
      resource_type: 'AgentVersion',
      resource_id: versionId,
      metadata: { version: nextVer },
      created_at: new Date().toISOString()
    });

    db.saveImmediate();
    return NextResponse.json({ success: true, version: newVersion });
  }

  if (action === 'ROLLBACK' && version_id) {
    const targetVer = db.agent_versions.find(v => v.id === version_id && v.agent_id === id);
    if (!targetVer) return NextResponse.json({ error: { message: 'Version not found' } }, { status: 404 });

    agent.current_version_id = targetVer.id;
    agent.updated_at = new Date().toISOString();
    db.saveImmediate();
    return NextResponse.json({ success: true, current_version_id: targetVer.id });
  }

  return NextResponse.json({ error: { message: 'Invalid action' } }, { status: 400 });
}
