import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { logInfo, logWarn, logError } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(session, ['OWNER'])) {
    return NextResponse.json({ error: 'Only workspace OWNER can delete tenant account and data.' }, { status: 403 });
  }

  try {
    const { confirmSlug } = await req.json();
    const wsId = session.workspaceId;
    const workspace = db.workspaces.find(w => w.id === wsId);

    if (!workspace || (confirmSlug && confirmSlug !== workspace.slug)) {
      return NextResponse.json({ error: 'Confirmation slug does not match workspace slug.' }, { status: 400 });
    }

    logWarn(`Tenant deletion requested for workspace ${wsId} (${workspace.name}) by ${session.user.email}`);

    // Mutate arrays in place to maintain references
    const cleanFilter = (arr: any[], predicate: (item: any) => boolean) => {
      const kept = arr.filter(predicate);
      arr.length = 0;
      arr.push(...kept);
    };

    cleanFilter(db.agents, a => a.workspace_id !== wsId);
    cleanFilter(db.knowledge_sources, k => k.workspace_id !== wsId);
    cleanFilter(db.conversations, c => c.workspace_id !== wsId);
    cleanFilter(db.commerce_orders, o => o.workspace_id !== wsId);
    cleanFilter(db.commerce_products, p => p.workspace_id !== wsId);
    cleanFilter(db.api_keys, k => k.workspace_id !== wsId);
    cleanFilter(db.workspaces, w => w.id !== wsId);

    db.scheduleSave();

    return NextResponse.json({
      status: 'DELETED',
      workspace_id: wsId,
      message: 'Workspace and all associated tenant data have been permanently deleted.'
    });
  } catch (err: any) {
    logError('Error deleting tenant workspace', err, { workspaceId: session.workspaceId });
    return NextResponse.json({ error: 'Tenant deletion failed' }, { status: 500 });
  }
}
