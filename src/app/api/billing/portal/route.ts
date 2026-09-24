import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { logError } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions to access billing portal' },
      { status: 403 }
    );
  }

  const workspace = db.workspaces.find(w => w.id === session.workspaceId);
  if (!workspace || !workspace.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No active Stripe billing customer linked to this workspace. Please subscribe first.' },
      { status: 400 }
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || stripeSecretKey.includes('PLACEHOLDER')) {
    return NextResponse.json(
      { error: 'Stripe billing portal is not configured on this server' },
      { status: 503 }
    );
  }

  try {
    const host = req.headers.get('host') || 'localhost:3000';
    const returnUrl = `${req.nextUrl.protocol}//${host}/billing`;

    const params = new URLSearchParams();
    params.append('customer', workspace.stripe_customer_id);
    params.append('return_url', returnUrl);

    const stripeResp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const portalData = await stripeResp.json();
    if (!stripeResp.ok) {
      logError('Stripe portal session error', portalData, { workspaceId: session.workspaceId });
      return NextResponse.json(
        { error: portalData.error?.message || 'Failed to generate billing portal session' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      portalUrl: portalData.url
    });
  } catch (err: any) {
    logError('Billing portal error', err, { workspaceId: session.workspaceId });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
