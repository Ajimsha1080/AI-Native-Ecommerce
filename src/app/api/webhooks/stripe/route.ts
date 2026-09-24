import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { logInfo, logWarn, logError } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const sigHeader = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret && sigHeader) {
    // Verify Stripe HMAC-SHA256 signature
    try {
      const items = sigHeader.split(',').reduce((acc: any, cur) => {
        const [k, v] = cur.split('=');
        acc[k.trim()] = v.trim();
        return acc;
      }, {});

      const timestamp = items['t'];
      const signature = items['v1'];
      const payload = `${timestamp}.${bodyText}`;
      const expectedSig = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature || '', 'hex'), Buffer.from(expectedSig, 'hex'))) {
        logWarn('Stripe webhook signature mismatch');
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
      }
    } catch (err: any) {
      logError('Stripe signature verification error', err);
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 400 });
    }
  }

  try {
    const event = JSON.parse(bodyText);
    logInfo(`Processing Stripe Event: ${event.type}`);

    if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.created') {
      const sessionObj = event.data?.object;
      const workspaceId = sessionObj?.client_reference_id;
      if (workspaceId) {
        const ws = db.workspaces.find(w => w.id === workspaceId);
        if (ws) {
          ws.plan = 'ENTERPRISE';
          db.scheduleSave();
          logInfo(`Workspace tier upgraded to ENTERPRISE for ${workspaceId}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logError('Error parsing Stripe webhook', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 400 });
  }
}
