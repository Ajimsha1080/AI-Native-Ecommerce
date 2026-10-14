import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { logInfo, logError } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden: Admin or Owner role required to export tenant data' }, { status: 403 });
  }

  try {
    const wsId = session.workspaceId;
    const [workspace, agents, knowledgeSources, conversations, orders, products, apiKeysRaw] = await Promise.all([
      db.workspaces.findById(wsId),
      db.agents.findMany(wsId),
      db.knowledge_sources.findMany(wsId),
      db.conversations.findMany(wsId),
      db.commerce_orders.findMany(wsId),
      db.commerce_products.findMany(wsId),
      db.api_keys.findMany(wsId)
    ]);

    const apiKeys = apiKeysRaw.map(k => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      role: k.role,
      created_at: k.created_at
    }));

    const exportBundle = {
      export_version: '2.0.0',
      exported_at: new Date().toISOString(),
      requested_by: session.user.email,
      workspace,
      agents,
      knowledge_sources: knowledgeSources,
      conversations,
      orders,
      products,
      api_keys: apiKeys
    };

    logInfo(`GDPR Data Export generated for workspace ${wsId} by ${session.user.email}`);

    return new NextResponse(JSON.stringify(exportBundle, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="shopmate_export_${wsId}_${Date.now()}.json"`
      }
    });
  } catch (err: any) {
    logError('Error exporting tenant data', err, { workspaceId: session.workspaceId });
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
