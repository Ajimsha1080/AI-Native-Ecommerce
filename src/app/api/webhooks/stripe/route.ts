import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { logInfo, logWarn, logError } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const sigHeader = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Fail closed: Reject immediately if secret is unset
  if (!webhookSecret) {
    logError('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured on server');
    return NextResponse.json(
      { error: 'Webhook endpoint misconfigured: STRIPE_WEBHOOK_SECRET is required' },
      { status: 500 }
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    logError('STRIPE_SECRET_KEY is not configured. Webhook rejecting all payloads.');
    return NextResponse.json({ error: 'Stripe API key not configured' }, { status: 500 });
  }

  // Fail closed: Reject if signature header is missing
  if (!sigHeader) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24.acacia' as any
    });
    // Official Stripe SDK signature verification
    event = stripe.webhooks.constructEvent(bodyText, sigHeader, webhookSecret);
  } catch (err: any) {
    logWarn(`Stripe SDK signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  const eventId = event.id;
  if (!eventId) {
    return NextResponse.json({ error: 'Missing event id' }, { status: 400 });
  }

  // Webhook Idempotency Check in DB
  const alreadyProcessed = await db.processedWebhookEvents.hasProcessed(eventId);
  if (alreadyProcessed) {
    logInfo(`Stripe event ${eventId} already processed in DB, skipping duplicate`);
    return NextResponse.json({ received: true, deduplicated: true });
  }

  logInfo(`Processing verified Stripe Event: ${event.type} (${eventId})`);

  let targetWsId = 'system';
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionObj = event.data.object as Stripe.Checkout.Session;
        const workspaceId = sessionObj.client_reference_id || sessionObj.metadata?.workspace_id;
        const targetPlan = (sessionObj.metadata?.target_plan || 'GROWTH').toUpperCase();

        if (workspaceId) {
          targetWsId = workspaceId;
          const ws = await db.workspaces.findById(workspaceId);
          if (ws) {
            await db.workspaces.update(workspaceId, {
              tier: targetPlan as any,
            });
            logInfo(`Workspace tier upgraded to ${targetPlan} for ${workspaceId}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subId = sub.id;

        const allWorkspaces = await db.workspaces.findMany();
        const ws = allWorkspaces.find((w: any) => (w as any).stripe_subscription_id === subId);
        if (ws) {
          targetWsId = ws.id;
          await db.workspaces.update(ws.id, {
            tier: 'FREE' as any,
          });
          logInfo(`Workspace ${ws.id} subscription cancelled, downgraded to FREE`);
        }
        break;
      }

      default:
        logInfo(`Unhandled verified Stripe event type: ${event.type}`);
    }

    // Persist processed event ID in DB for strict idempotency
    await db.processedWebhookEvents.record(targetWsId, eventId, 'STRIPE');

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logError('Error processing verified Stripe webhook', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
