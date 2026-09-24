import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logInfo, logError } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { plan, provider, returnUrl } = await req.json();
    const cleanPlan = (plan || 'PRO').toUpperCase();
    const cleanProvider = (provider || 'STRIPE').toUpperCase();

    const planPrices: Record<string, number> = {
      'PRO': 4900,         // $49.00 in cents
      'ENTERPRISE': 29900  // $299.00 in cents
    };

    const amount = planPrices[cleanPlan] || 4900;

    if (cleanProvider === 'STRIPE') {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (stripeSecretKey) {
        // Real Stripe REST API checkout session creation
        const params = new URLSearchParams();
        params.append('payment_method_types[0]', 'card');
        params.append('mode', 'subscription');
        params.append('client_reference_id', session.workspaceId);
        params.append('customer_email', session.user.email);
        params.append('line_items[0][price_data][currency]', 'usd');
        params.append('line_items[0][price_data][product_data][name]', `ShopMate ${cleanPlan} Subscription`);
        params.append('line_items[0][price_data][unit_amount]', String(amount));
        params.append('line_items[0][price_data][recurring][interval]', 'month');
        params.append('line_items[0][quantity]', '1');
        params.append('success_url', returnUrl || 'http://localhost:3000/billing?status=success');
        params.append('cancel_url', returnUrl || 'http://localhost:3000/billing?status=cancelled');

        const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        if (stripeResp.ok) {
          const sessionData = await stripeResp.json();
          return NextResponse.json({
            checkoutUrl: sessionData.url,
            sessionId: sessionData.id,
            provider: 'STRIPE'
          });
        }
      }

      // If Stripe key not set, return simulated checkout flow for development
      return NextResponse.json({
        checkoutUrl: `/billing?demo_checkout=true&plan=${cleanPlan}&workspace_id=${session.workspaceId}`,
        sessionId: `cs_test_${session.workspaceId}_${Date.now()}`,
        provider: 'STRIPE_SANDBOX',
        message: 'Stripe Sandbox session initialized.'
      });
    } else if (cleanProvider === 'RAZORPAY') {
      return NextResponse.json({
        orderId: `order_rzp_${Date.now()}`,
        amount,
        currency: 'INR',
        provider: 'RAZORPAY',
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
      });
    }

    return NextResponse.json({ error: 'Unsupported billing provider' }, { status: 400 });
  } catch (err: any) {
    logError('Billing checkout error', err, { workspaceId: session.workspaceId });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
