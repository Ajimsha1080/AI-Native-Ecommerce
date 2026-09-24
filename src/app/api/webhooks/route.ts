import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { Webhook } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const webhooks = db.webhooks.filter(w => w.workspace_id === session.workspaceId);
  const deliveries = db.webhook_deliveries.filter(d => d.workspace_id === session.workspaceId);
  return NextResponse.json({ webhooks, deliveries });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

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

    const newHook: Webhook = {
      id: generateId('whk'),
      workspace_id: session.workspaceId,
      url,
      secret: 'whsec_' + generateId('sec'),
      events: events || ['conversation.created', 'conversation.resolved', 'action.completed'],
      is_active: true,
      created_at: new Date().toISOString()
    };

    db.webhooks.push(newHook);
    db.saveImmediate();
    return NextResponse.json({ success: true, webhook: newHook });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Webhook operation failed' } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const idx = db.webhooks.findIndex(w => w.id === id && w.workspace_id === session.workspaceId);
  if (idx >= 0) {
    db.webhooks.splice(idx, 1);
    db.saveImmediate();
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: { message: 'Webhook not found' } }, { status: 404 });
}
