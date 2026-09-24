import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { ingestDocument } from '@/lib/rag';
import { enforceQuota } from '@/lib/billing/limits';

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions to ingest knowledge' } }, { status: 403 });
  }

  // Quota enforcement
  const quota = enforceQuota(session.workspaceId, 'chunks', 1);
  if (!quota.allowed && quota.response) {
    return quota.response;
  }

  try {
    const { name, type, rawContent, url, agentId } = await req.json();
    const content = rawContent || `Crawled content from ${url}`;
    if (!name || !content) {
      return NextResponse.json({ error: { message: 'Name and content are required' } }, { status: 400 });
    }

    const workspaceId = session.workspaceId || 'ws_acme_corp';
    const doc = await ingestDocument(workspaceId, {
      name,
      type: type || (url ? 'WEBSITE' : 'DOCUMENT'),
      rawContent: content,
      agentId: agentId
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Ingestion failed' } }, { status: 500 });
  }
}
