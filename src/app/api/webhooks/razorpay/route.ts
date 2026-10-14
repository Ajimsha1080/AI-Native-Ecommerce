import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { logInfo, logWarn, logError } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Fail closed: Reject immediately if secret is unset
  if (!secret) {
    logError('Razorpay webhook rejected: RAZORPAY_WEBHOOK_SECRET is not configured on server');
    return NextResponse.json(
      { error: 'Webhook endpoint misconfigured: RAZORPAY_WEBHOOK_SECRET is required' },
      { status: 500 }
    );
  }

  // Fail closed: Reject if signature header is missing
  if (!signature) {
    return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
  }

  // Timing-safe HMAC SHA256 verification
  try {
    const expectedSig = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      logWarn('Razorpay webhook signature mismatch');
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }
  } catch (err: any) {
    logError('Razorpay webhook signature verification error', err);
    return NextResponse.json({ error: 'Signature verification error' }, { status: 400 });
  }

  try {
    const payload = JSON.parse(bodyText);
    const eventId = payload.event_id || payload.payload?.payment?.entity?.id;

    if (!eventId) {
      return NextResponse.json({ error: 'Missing required webhook event identifier' }, { status: 400 });
    }

    // Strict Webhook Idempotency Check in DB
    const alreadyProcessed = await db.processedWebhookEvents.hasProcessed(eventId);
    if (alreadyProcessed) {
      logInfo(`Razorpay event ${eventId} already processed in DB, skipping duplicate`);
      return NextResponse.json({ status: 'ok', deduplicated: true });
    }

    logInfo(`Processing verified Razorpay Event: ${payload.event} (${eventId})`);

    let targetWorkspaceId = 'system';
    if (payload.event === 'payment.captured' || payload.event === 'order.paid' || payload.event === 'subscription.charged') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const notes = paymentEntity.notes || payload.payload?.subscription?.entity?.notes || {};
      const workspaceId = notes.workspace_id;
      const targetPlan = (notes.target_plan || notes.plan || 'GROWTH').toUpperCase();

      if (workspaceId) {
        targetWorkspaceId = workspaceId;
        const ws = await db.workspaces.findById(workspaceId);
        if (ws) {
          await db.workspaces.update(workspaceId, {
            tier: targetPlan as any,
          });
          logInfo(`Workspace tier upgraded to ${targetPlan} for ${workspaceId}`);
        }
      }
    }

    // Persist event in DB for strict idempotency
    await db.processedWebhookEvents.record(targetWorkspaceId, eventId, 'RAZORPAY');

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    logError('Error parsing Razorpay webhook', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 400 });
  }
}
