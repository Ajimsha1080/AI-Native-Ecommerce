import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { commerceEngine } from '@/lib/commerce';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

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
        { error: { message: 'Order not found or customer email does not match.' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ order });
  }

  const orders = db.commerce_orders.filter(o => o.workspace_id === session.workspaceId);
  return NextResponse.json({ orders });
}

