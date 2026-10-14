import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { AgentVersion } from '@/types';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  return NextResponse.json({ versions: [] });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const agent = await db.agents.findById(session.workspaceId, id);
  if (!agent) return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });

  const { action, change_summary, version_id } = await req.json();

  if (action === 'PUBLISH') {
    const versionId = generateId('ver');
    const newVersion: AgentVersion = {
      id: versionId,
      agent_id: id,
      version_number: 'v1.1',
      status: 'PUBLISHED',
      config_snapshot: { id: 'cfg_default', agent_id: id, updated_at: new Date().toISOString() } as any,
      tools_snapshot: [],
      policies_snapshot: [],
      change_summary: change_summary || 'Production Release v1.1',
      published_by_user_id: session.user.id,
      created_at: new Date().toISOString()
    };

    await db.agents.update(session.workspaceId, id, {
      status: 'PUBLISHED',
      current_version_id: versionId
    });

    await db.audit_logs.create(session.workspaceId, {
      id: generateId('aud'),
      workspace_id: session.workspaceId,
      user_id: session.user.id,
      action: 'AGENT_PUBLISHED',
      resource_type: 'AgentVersion',
      resource_id: versionId,
      metadata: { version: 'v1.1' },
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, version: newVersion });
  }

  if (action === 'ROLLBACK' && version_id) {
    await db.agents.update(session.workspaceId, id, {
      current_version_id: version_id
    });
    return NextResponse.json({ success: true, current_version_id: version_id });
  }

  return NextResponse.json({ error: { message: 'Invalid action' } }, { status: 400 });
}
