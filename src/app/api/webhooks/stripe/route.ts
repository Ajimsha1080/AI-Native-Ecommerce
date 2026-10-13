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
  const alreadyProcessed = db.processed_webhook_events.some(
    e => e.event_id === eventId && e.provider === 'STRIPE'
  );
  if (alreadyProcessed) {
    logInfo(`Stripe event ${eventId} already processed in DB, skipping duplicate`);
    return NextResponse.json({ received: true, deduplicated: true });
  }

  logInfo(`Processing verified Stripe Event: ${event.type} (${eventId})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionObj = event.data.object as Stripe.Checkout.Session;
        const workspaceId = sessionObj.client_reference_id || sessionObj.metadata?.workspace_id;
        const targetPlan = (sessionObj.metadata?.target_plan || 'GROWTH').toUpperCase();
        const customerId = typeof sessionObj.customer === 'string' ? sessionObj.customer : sessionObj.customer?.id;
        const subscriptionId = typeof sessionObj.subscription === 'string' ? sessionObj.subscription : sessionObj.subscription?.id;

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
        const sub = event.data.object as Stripe.Subscription;
        const subId = sub.id;
        const status = sub.status;

        const ws = db.workspaces.find(w => w.stripe_subscription_id === subId);
        if (ws) {
          ws.subscription_status = status;
          ws.updated_at = new Date().toISOString();
          logInfo(`Workspace ${ws.id} subscription status updated to ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subId = sub.id;

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
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const rawSub = (invoice as any).subscription;
        const subId = typeof rawSub === 'string' ? rawSub : rawSub?.id;

        const ws = db.workspaces.find(w => w.stripe_customer_id === customerId || w.stripe_subscription_id === subId);
        if (ws) {
          ws.subscription_status = 'past_due';
          ws.updated_at = new Date().toISOString();
          logWarn(`Invoice payment failed for workspace ${ws.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const rawSub = (invoice as any).subscription;
        const subId = typeof rawSub === 'string' ? rawSub : rawSub?.id;

        const ws = db.workspaces.find(w => w.stripe_customer_id === customerId || w.stripe_subscription_id === subId);
        if (ws) {
          ws.subscription_status = 'active';
          ws.updated_at = new Date().toISOString();
        }
        break;
      }

      default:
        logInfo(`Unhandled verified Stripe event type: ${event.type}`);
    }

    // Persist processed event ID in DB for strict idempotency
    db.processed_webhook_events.push({
      id: generateId('pwe'),
      event_id: eventId,
      provider: 'STRIPE',
      processed_at: new Date().toISOString()
    });

    db.saveImmediate();

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logError('Error processing verified Stripe webhook', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
