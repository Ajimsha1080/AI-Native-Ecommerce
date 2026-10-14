import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: integrationId } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions. Requires EDITOR, ADMIN, or OWNER role.' } }, { status: 403 });
  }

  const existing = await db.workspaceIntegrations.findByProvider(session.workspaceId, integrationId.toUpperCase());

  if (existing) {
    await db.workspaceIntegrations.update(session.workspaceId, existing.id, {
      status: 'NOT_CONNECTED',
      config: {}
    });
  }

  // Add audit trail log
  await db.auditLogs.create(session.workspaceId, {
    id: generateId('aud'),
    workspace_id: session.workspaceId,
    actor_user_id: session.user.id,
    actor_email: session.user.email,
    action: 'INTEGRATION_DISCONNECTED',
    resource_type: 'Integration',
    resource_id: integrationId,
    details: {
      integrationId,
      disconnectedAt: new Date().toISOString()
    },
    ip_address: '127.0.0.1',
    created_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    status: 'NOT_CONNECTED',
    message: `Successfully disconnected and revoked credentials for ${integrationId}.`
  });
}
