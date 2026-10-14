import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { validateSafeUrl } from '@/lib/utils/safe-fetch';
import { Webhook } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const [webhooks, deliveries] = await Promise.all([
    db.webhooks.findMany(session.workspaceId),
    db.webhookDeliveries.findMany(session.workspaceId),
  ]);
  return NextResponse.json({ webhooks, deliveries });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to manage webhooks' } }, { status: 403 });
  }

  try {
    const { action, url, events } = await req.json();

    if (action === 'TEST') {
      await dispatchWebhookEvent(session.workspaceId, 'conversation.created', {
        test: true,
        message: 'Ping event test from AaaS platform',
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ success: true, message: 'Test webhook event dispatched.' });
    }

    if (!url) return NextResponse.json({ error: { message: 'Endpoint URL is required' } }, { status: 400 });

    // Enforce SSRF validation on destination webhook URL
    await validateSafeUrl(url);

    const secureSecret = 'whsec_' + crypto.randomBytes(24).toString('hex');

    const newHook: Webhook = {
      id: generateId('whk'),
      workspace_id: session.workspaceId,
      url,
      secret: secureSecret,
      events: events || ['conversation.created', 'conversation.resolved', 'action.completed'],
      is_active: true,
      created_at: new Date().toISOString()
    };

    const created = await db.webhooks.create(session.workspaceId, newHook);
    return NextResponse.json({ success: true, webhook: created });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Webhook operation failed' } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to remove webhooks' } }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (id) {
    const deleted = await db.webhooks.delete(session.workspaceId, id);
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Webhook deleted successfully.' });
    }
  }
  return NextResponse.json({ error: { message: 'Webhook not found' } }, { status: 404 });
}
