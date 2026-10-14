import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { commerceEngine } from '@/lib/commerce';
import { CommerceOrder } from '@/types';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local_ip';
  const rateLimitKey = `orders:${clientIp}:${session.workspaceId}`;
  const rateCheck = await checkRateLimit(rateLimitKey, 10, 60);
  if (!rateCheck.allowed) {
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

  const orders = await db.commerceOrders.findMany(session.workspaceId);
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession(req);
    const body = await req.json();
    const workspaceId = body.workspace_id || session?.workspaceId || 'ws_acme_corp';

    if (body.action === 'seed_sample_orders') {
      const sampleOrders: CommerceOrder[] = [
        {
          id: `ord_${Date.now()}_1`,
          workspace_id: workspaceId,
          order_number: '#ORD-84920',
          customer_id: 'cus_84920',
          customer_email: 'priya.sharma@example.com',
          customer_name: 'Priya Sharma',
          customer_phone: '+91 98765 43210',
          total_amount: 4999.00,
          currency: 'INR',
          status: 'PAID',
          payment_status: 'PAID',
          fulfillment_status: 'IN_TRANSIT',
          shipping_address: 'Flat 402, Green Glen Heights, Bellandur, Bengaluru, KA 560103',
          tracking_number: 'TRK-BLUEDART-84920',
          carrier: 'Blue Dart Express',
          items: [
            {
              product_id: 'prod_cyberpunk_01',
              title: 'Cyberpunk Waterproof Tactical Shell Jacket',
              quantity: 1,
              price: 4999.00
            }
          ],
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: `ord_${Date.now()}_2`,
          workspace_id: workspaceId,
          order_number: '#ORD-72109',
          customer_id: 'cus_72109',
          customer_email: 'rohit.verma@example.com',
          customer_name: 'Rohit Verma',
          customer_phone: '+91 98111 22334',
          total_amount: 2499.00,
          currency: 'INR',
          status: 'PROCESSING',
          payment_status: 'PAID',
          fulfillment_status: 'UNFULFILLED',
          shipping_address: 'B-14 Sector 62, Noida, Uttar Pradesh 201301',
          tracking_number: 'TRK-DELHIVERY-72109',
          carrier: 'Delhivery Surface',
          items: [
            {
              product_id: 'prod_stealth_pants',
              title: 'Stealth Cargo Reflex Joggers',
              quantity: 1,
              price: 2499.00
            }
          ],
          created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
        },
        {
          id: `ord_${Date.now()}_3`,
          workspace_id: workspaceId,
          order_number: '#ORD-61045',
          customer_id: 'cus_61045',
          customer_email: 'ananya.iyer@example.com',
          customer_name: 'Ananya Iyer',
          customer_phone: '+91 97400 99887',
          total_amount: 8998.00,
          currency: 'INR',
          status: 'PAID',
          payment_status: 'PAID',
          fulfillment_status: 'DELIVERED',
          shipping_address: '12th Cross, Indiranagar Stage 2, Bengaluru, KA 560038',
          tracking_number: 'TRK-EKART-61045',
          carrier: 'Ekart Logistics',
          items: [
            {
              product_id: 'prod_modular_pack',
              title: 'Modular Fidlock Urban Sling Bag',
              quantity: 2,
              price: 4499.00
            }
          ],
          created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ];

      for (const ord of sampleOrders) {
        await db.commerceOrders.create(workspaceId, ord);
      }

      return NextResponse.json({ success: true, count: sampleOrders.length, orders: sampleOrders });
    }

    const { productId, variantId, quantity = 1, customerName, customerEmail, shippingAddress, paymentMethod = 'UPI' } = body;

    const product = await db.commerceProducts.findById(workspaceId, productId);
    if (!product) {
      return NextResponse.json({ error: { message: 'Product not found' } }, { status: 404 });
    }

    const variant = product.variants?.find(v => v.id === variantId || v.attributes?.size === variantId) || product.variants?.[0];
    const unitPrice = variant?.price || product.price;
    const qty = Math.max(1, Number(quantity) || 1);

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `#ORD-${randomSuffix}`;

    const newOrder: CommerceOrder = {
      id: `ord_${Date.now()}`,
      workspace_id: workspaceId,
      order_number: orderNumber,
      customer_id: `cus_${Date.now().toString(36)}`,
      customer_email: (customerEmail || 'customer@gmail.com').toLowerCase().trim(),
      customer_name: customerName || 'Valued Customer',
      total_amount: unitPrice * qty,
      currency: product.currency || 'INR',
      status: paymentMethod === 'COD' ? 'PROCESSING' : 'PAID',
      payment_status: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
      fulfillment_status: 'UNFULFILLED',
      shipping_address: shippingAddress || 'Address on file',
      tracking_number: `TRK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-IN`,
      carrier: 'Bluedart Express',
      items: [
        {
          product_id: product.id,
          variant_id: variant?.id,
          title: product.title + (variant ? ` (${variant.title || 'Standard'})` : ''),
          quantity: qty,
          price: unitPrice
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.commerceOrders.create(workspaceId, newOrder);

    return NextResponse.json({ success: true, order: newOrder });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message || 'Failed to create order' } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

    const body = await req.json();
    const { id, status, fulfillment_status, tracking_number, carrier } = body;

    if (!id) {
      return NextResponse.json({ error: { message: 'Order ID is required.' } }, { status: 400 });
    }

    const updated = await db.commerceOrders.update(session.workspaceId, id, {
      status,
      payment_status: status,
      fulfillment_status,
      tracking_number,
      carrier
    });

    if (!updated) {
      return NextResponse.json({ error: { message: 'Order not found or update failed.' } }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message || 'Failed to update order' } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: { message: 'Order ID is required.' } }, { status: 400 });
    }

    await db.commerceOrders.delete(session.workspaceId, id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message || 'Failed to delete order' } }, { status: 500 });
  }
}



