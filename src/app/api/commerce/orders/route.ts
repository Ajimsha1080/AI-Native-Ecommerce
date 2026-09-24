import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { commerceEngine } from '@/lib/commerce';

const orderRateLimitMap = new Map<string, number[]>();

function checkOrderRateLimit(key: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = (orderRateLimitMap.get(key) || []).filter(ts => now - ts < windowMs);
  if (timestamps.length >= limit) {
    return false;
  }
  timestamps.push(now);
  orderRateLimitMap.set(key, timestamps);
  return true;
}

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local_ip';
  const rateLimitKey = `${clientIp}:${session.workspaceId}`;
  if (!checkOrderRateLimit(rateLimitKey, 10, 60000)) {
    return NextResponse.json(
      { error: { message: 'Too many order lookup requests. Please retry in a few moments.' } },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get('order_number');
  const customerEmail = searchParams.get('customer_email');

  if (orderNumber) {
    if (!customerEmail) {
      return NextResponse.json(
        { error: { message: 'Both order_number and customer_email are required.' } },
        { status: 400 }
      );
    }
    const order = await commerceEngine.getOrder(session.workspaceId, orderNumber, customerEmail);
    if (!order) {
      return NextResponse.json(
        { error: { message: 'Order not found with the provided email address.' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ order });
  }

  const orders = db.commerce_orders.filter(o => o.workspace_id === session.workspaceId);
  return NextResponse.json({ orders });
}


