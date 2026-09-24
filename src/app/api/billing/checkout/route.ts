import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { logInfo, logError } from '@/lib/utils/logger';

const VALID_PLANS = ['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'] as const;

function isAllowedReturnUrl(urlStr: string, requestHost: string): boolean {
  if (urlStr.startsWith('/') && !urlStr.startsWith('//')) {
    return true;
  }
  try {
    const parsed = new URL(urlStr);
    const host = parsed.host.toLowerCase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host.toLowerCase() : '';
    if (host === requestHost.toLowerCase() || (appUrl && host === appUrl) || host === 'localhost:3000' || host === '127.0.0.1:3000') {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Restrict billing checkout to OWNER or ADMIN roles
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions to manage billing for this workspace' },
      { status: 403 }
    );
  }

  try {
    const { plan, provider = 'STRIPE', returnUrl } = await req.json().catch(() => ({}));
    const cleanPlan = (plan || 'GROWTH').toUpperCase();
    const cleanProvider = provider.toUpperCase();

    if (!VALID_PLANS.includes(cleanPlan as any)) {
      return NextResponse.json(
        { error: `Invalid plan specified. Allowed plans: ${VALID_PLANS.join(', ')}` },
        { status: 400 }
      );
    }

    const host = req.headers.get('host') || 'localhost:3000';
    let safeReturnUrl = `${req.nextUrl.protocol}//${host}/billing`;
    if (returnUrl) {
      if (!isAllowedReturnUrl(returnUrl, host)) {
        return NextResponse.json({ error: 'Invalid returnUrl: Open redirect prevented' }, { status: 400 });
      }
      safeReturnUrl = returnUrl.startsWith('/') ? `${req.nextUrl.protocol}//${host}${returnUrl}` : returnUrl;
    }

    if (cleanProvider === 'STRIPE') {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey || stripeSecretKey.includes('PLACEHOLDER') || stripeSecretKey.includes('change_in_production')) {
        return NextResponse.json(
          { error: 'Stripe billing is not configured on this server' },
          { status: 503 }
        );
      }

      const planPricesCents: Record<string, number> = {
        'STARTER': 2900,
        'GROWTH': 7900,
        'BUSINESS': 19900,
        'ENTERPRISE': 49900
      };

      const envPriceKey = `STRIPE_PRICE_ID_${cleanPlan}`;
      const configuredPriceId = process.env[envPriceKey];

      const params = new URLSearchParams();
      params.append('payment_method_types[0]', 'card');
      params.append('mode', 'subscription');
      params.append('client_reference_id', session.workspaceId);
      params.append('customer_email', session.user.email);
      params.append('metadata[workspace_id]', session.workspaceId);
      params.append('metadata[target_plan]', cleanPlan);
      params.append('subscription_data[metadata][workspace_id]', session.workspaceId);
      params.append('subscription_data[metadata][target_plan]', cleanPlan);

      if (configuredPriceId && !configuredPriceId.includes('PLACEHOLDER')) {
        params.append('line_items[0][price]', configuredPriceId);
        params.append('line_items[0][quantity]', '1');
      } else {
        const amount = planPricesCents[cleanPlan] || 7900;
        params.append('line_items[0][price_data][currency]', 'usd');
        params.append('line_items[0][price_data][product_data][name]', `ShopMate ${cleanPlan} Plan`);
        params.append('line_items[0][price_data][unit_amount]', String(amount));
        params.append('line_items[0][price_data][recurring][interval]', 'month');
        params.append('line_items[0][quantity]', '1');
      }

      params.append('success_url', `${safeReturnUrl}?status=success&session_id={CHECKOUT_SESSION_ID}`);
      params.append('cancel_url', `${safeReturnUrl}?status=cancelled`);

      const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const sessionData = await stripeResp.json();
      if (!stripeResp.ok) {
        logError('Stripe API checkout error', sessionData, { workspaceId: session.workspaceId });
        return NextResponse.json(
          { error: sessionData.error?.message || 'Failed to initialize Stripe checkout session' },
          { status: 502 }
        );
      }

      return NextResponse.json({
        checkoutUrl: sessionData.url,
        sessionId: sessionData.id,
        provider: 'STRIPE'
      });
    } else if (cleanProvider === 'RAZORPAY') {
      const rzpKeyId = process.env.RAZORPAY_KEY_ID;
      const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!rzpKeyId || !rzpKeySecret || rzpKeyId.includes('PLACEHOLDER')) {
        return NextResponse.json(
          { error: 'Razorpay billing is not configured on this server' },
          { status: 503 }
        );
      }

      const planPricesInr: Record<string, number> = {
        'STARTER': 249900,
        'GROWTH': 649900,
        'BUSINESS': 1599900,
        'ENTERPRISE': 3999900
      };

      const amount = planPricesInr[cleanPlan] || 649900;

      return NextResponse.json({
        orderId: `order_rzp_${Date.now()}`,
        amount,
        currency: 'INR',
        provider: 'RAZORPAY',
        keyId: rzpKeyId
      });
    }

    return NextResponse.json({ error: 'Unsupported billing provider' }, { status: 400 });
  } catch (err: any) {
    logError('Billing checkout error', err, { workspaceId: session.workspaceId });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
