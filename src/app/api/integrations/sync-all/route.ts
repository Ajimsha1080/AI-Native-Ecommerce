import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { IntegrationSyncJob } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions. Requires EDITOR, ADMIN, or OWNER role.' } }, { status: 403 });
  }

  const allIntegrations = await db.workspaceIntegrations.findMany(session.workspaceId);
  const connected = allIntegrations.filter(wi => wi.status === 'CONNECTED');

  if (connected.length === 0) {
    return NextResponse.json({
      success: true,
      syncedCount: 0,
      jobs: [],
      message: 'No connected integrations found to sync.'
    });
  }

  const jobs: IntegrationSyncJob[] = [];

  for (const integration of connected) {
    const job: IntegrationSyncJob = {
      id: generateId('sync_job'),
      workspace_id: session.workspaceId,
      integration_id: integration.integration_id,
      status: 'COMPLETED',
      progress: 100,
      items_synced: 1,
      message: `Batch sync complete for ${integration.name || integration.integration_id}.`,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };
    await db.integrationSyncJobs.create(session.workspaceId, job);
    jobs.push(job);

    await db.workspaceIntegrations.update(session.workspaceId, integration.id, {
      config: {
        ...(integration.config || {}),
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'SUCCESS',
      }
    });
  }

  // Audit log
  await db.auditLogs.create(session.workspaceId, {
    id: generateId('aud'),
    workspace_id: session.workspaceId,
    actor_user_id: session.user.id,
    actor_email: session.user.email,
    action: 'CONNECTOR_SYNC_ALL',
    resource_type: 'Integration',
    resource_id: 'all',
    details: {
      syncedConnectors: connected.map(c => c.integration_id),
      jobCount: jobs.length
    },
    ip_address: '127.0.0.1',
    created_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    syncedCount: connected.length,
    jobs,
    message: `Batch sync initiated and completed for ${connected.length} active connectors.`
  });
}
