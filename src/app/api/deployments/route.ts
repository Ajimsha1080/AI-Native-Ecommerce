import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Deployment } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const deployments = await db.deployments.findMany(session.workspaceId);
  return NextResponse.json({ deployments });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions. Requires EDITOR, ADMIN, or OWNER role.' } }, { status: 403 });
  }

  try {
    const { agent_id, channel, environment, allowed_domains } = await req.json();
    const agent = await db.agents.findById(session.workspaceId, agent_id);
    if (!agent) return NextResponse.json({ error: { message: 'Agent not found' } }, { status: 404 });

    const newDep: Deployment = {
      id: generateId('dep'),
      workspace_id: session.workspaceId,
      agent_id: agent.id,
      agent_version_id: agent.current_version_id || 'v1.0',
      channel: channel || 'WEBSITE',
      environment: environment || 'PRODUCTION',
      public_key: 'pk_live_' + generateId('key'),
      status: 'ACTIVE',
      allowed_domains: allowed_domains || ['*'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const created = await db.deployments.create(session.workspaceId, newDep);
    return NextResponse.json({ success: true, deployment: created });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Deployment creation failed' } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions. Requires EDITOR, ADMIN, or OWNER role.' } }, { status: 403 });
  }

  try {
    const { id, status, channel, environment, allowed_domains } = await req.json();
    const updated = await db.deployments.update(session.workspaceId, id, {
      status,
      channel,
      environment,
      allowed_domains
    });
    if (!updated) return NextResponse.json({ error: { message: 'Deployment not found' } }, { status: 404 });

    return NextResponse.json({ success: true, deployment: updated });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Deployment update failed' } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions. Requires EDITOR, ADMIN, or OWNER role.' } }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: { message: 'Deployment ID is required' } }, { status: 400 });

  const deleted = await db.deployments.delete(session.workspaceId, id);
  if (deleted) {
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: { message: 'Deployment not found' } }, { status: 404 });
}

