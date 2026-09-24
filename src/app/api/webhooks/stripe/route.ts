import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { logInfo, logWarn, logError } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const sigHeader = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret && !webhookSecret.includes('PLACEHOLDER')) {
    if (!sigHeader) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    try {
      const items = sigHeader.split(',').reduce((acc: any, cur) => {
        const [k, v] = cur.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      }, {});

      const timestamp = items['t'];
      const signature = items['v1'];

      if (!timestamp || !signature) {
        return NextResponse.json({ error: 'Invalid signature header structure' }, { status: 400 });
      }

      // Check replay attack clock drift (5 minutes maximum tolerance)
      const parsedTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parsedTime) > 300) {
        logWarn('Stripe webhook rejected: timestamp drift exceeds 300 seconds');
        return NextResponse.json({ error: 'Webhook timestamp expired or out of sync' }, { status: 400 });
      }

      const payload = `${timestamp}.${bodyText}`;
      const expectedSig = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'))) {
        logWarn('Stripe webhook signature verification failed');
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
      }
    } catch (err: any) {
      logError('Stripe signature verification error', err);
      return NextResponse.json({ error: 'Invalid signature verification' }, { status: 400 });
    }
  }

  try {
    const event = JSON.parse(bodyText);
    const eventId = event.id;

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 });
    }

    // Webhook Idempotency Check
    const alreadyProcessed = db.processed_webhook_events.some(
      e => e.event_id === eventId && e.provider === 'STRIPE'
    );
    if (alreadyProcessed) {
      logInfo(`Stripe event ${eventId} already processed, skipping duplicate`);
      return NextResponse.json({ received: true, deduplicated: true });
    }

    logInfo(`Processing Stripe Event: ${event.type} (${eventId})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionObj = event.data?.object;
        const workspaceId = sessionObj?.client_reference_id || sessionObj?.metadata?.workspace_id;
        const targetPlan = (sessionObj?.metadata?.target_plan || 'GROWTH').toUpperCase();
        const customerId = sessionObj?.customer;
        const subscriptionId = sessionObj?.subscription;

        if (workspaceId) {
          const ws = db.workspaces.find(w => w.id === workspaceId);
          if (ws) {
            ws.plan = targetPlan as any;
            if (customerId) ws.stripe_customer_id = customerId;
            if (subscriptionId) ws.stripe_subscription_id = subscriptionId;
            ws.subscription_status = 'active';
            ws.updated_at = new Date().toISOString();
            logInfo(`Workspace tier upgraded to ${targetPlan} for ${workspaceId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data?.object;
        const subId = sub?.id;
        const status = sub?.status; // 'active', 'past_due', 'canceled', etc.

        const ws = db.workspaces.find(w => w.stripe_subscription_id === subId);
        if (ws) {
          ws.subscription_status = status;
          ws.updated_at = new Date().toISOString();
          logInfo(`Workspace ${ws.id} subscription status updated to ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data?.object;
        const subId = sub?.id;

        const ws = db.workspaces.find(w => w.stripe_subscription_id === subId);
        if (ws) {
          ws.plan = 'FREE';
          ws.subscription_status = 'canceled';
          ws.updated_at = new Date().toISOString();
          logInfo(`Workspace ${ws.id} subscription cancelled, downgraded to FREE`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data?.object;
        const customerId = invoice?.customer;
        const subId = invoice?.subscription;

        const ws = db.workspaces.find(w => w.stripe_customer_id === customerId || w.stripe_subscription_id === subId);
        if (ws) {
          ws.subscription_status = 'past_due';
          ws.updated_at = new Date().toISOString();
          logWarn(`Invoice payment failed for workspace ${ws.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data?.object;
        const customerId = invoice?.customer;
        const subId = invoice?.subscription;

        const ws = db.workspaces.find(w => w.stripe_customer_id === customerId || w.stripe_subscription_id === subId);
        if (ws) {
          ws.subscription_status = 'active';
          ws.updated_at = new Date().toISOString();
        }
        break;
      }

      default:
        logInfo(`Unhandled Stripe event type: ${event.type}`);
    }

    // Record processed event ID
    db.processed_webhook_events.push({
      id: generateId('pwe'),
      event_id: eventId,
      provider: 'STRIPE',
      processed_at: new Date().toISOString()
    });

    db.saveImmediate();

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logError('Error parsing Stripe webhook', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 400 });
  }
}
