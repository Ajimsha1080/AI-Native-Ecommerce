import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { logInfo, logWarn, logError } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (secret && signature) {
    const expectedSig = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      logWarn('Razorpay webhook signature mismatch');
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }
  }

  try {
    const payload = JSON.parse(bodyText);
    logInfo(`Processing Razorpay Event: ${payload.event}`);

    if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
      const notes = payload.payload?.payment?.entity?.notes || {};
      const workspaceId = notes.workspace_id;
      if (workspaceId) {
        const ws = db.workspaces.find(w => w.id === workspaceId);
        if (ws) {
          ws.plan = 'ENTERPRISE';
          db.scheduleSave();
          logInfo(`Workspace tier upgraded to ENTERPRISE for ${workspaceId}`);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    logError('Error parsing Razorpay webhook', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 400 });
  }
}
