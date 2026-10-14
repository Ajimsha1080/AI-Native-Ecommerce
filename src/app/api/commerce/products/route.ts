import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { CommerceProduct } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const products = await db.commerceProducts.findMany(session.workspaceId);
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions. Requires EDITOR, ADMIN, or OWNER role.' } }, { status: 403 });
  }

  try {
    const body = await req.json();
    const inventoryQty = parseInt(body.inventory || body.total_inventory || '50', 10);
    const priceVal = parseFloat(body.price || '999');

    const newProduct: CommerceProduct = {
      id: generateId('prod_bt'),
      workspace_id: session.workspaceId,
      title: body.title || 'New Performance Apparel',
      description: body.description || 'High-performance active techwear engineered for breathability and endurance.',
      category: body.category || 'Performance Apparel',
      tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map((t: string) => t.trim()) : ['techwear', 'bluetyga']),
      price: priceVal,
      compare_at_price: body.compare_at_price ? parseFloat(body.compare_at_price) : priceVal * 1.25,
      currency: 'INR',
      images: Array.isArray(body.images) && body.images.length > 0 
        ? body.images 
        : [body.imageUrl || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80'],
      in_stock: inventoryQty > 0,
      total_inventory: inventoryQty,
      variants: Array.isArray(body.variants) && body.variants.length > 0 ? body.variants : [
        {
          id: generateId('var'),
          sku: `BT-${(body.title || 'ITEM').replace(/\s+/g, '-').toUpperCase().slice(0, 8)}-M`,
          title: 'Standard / Free Size',
          inventory_quantity: inventoryQty,
          price: priceVal,
          attributes: { size: 'M' }
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const created = await db.commerceProducts.create(session.workspaceId, newProduct);
    return NextResponse.json({ success: true, product: created });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Product creation failed' } }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions. Requires EDITOR, ADMIN, or OWNER role.' } }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, inventory, total_inventory, price, in_stock, title, category, description } = body;
    if (!id) return NextResponse.json({ error: { message: 'Product ID is required' } }, { status: 400 });

    const updates: Partial<CommerceProduct> = {};
    if (total_inventory !== undefined || inventory !== undefined) {
      const newInv = Math.max(0, parseInt((total_inventory ?? inventory) || '0', 10));
      updates.total_inventory = newInv;
      updates.in_stock = newInv > 0;
    }
    if (price !== undefined) updates.price = parseFloat(price);
    if (in_stock !== undefined) updates.in_stock = Boolean(in_stock);
    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;

    const updated = await db.commerceProducts.update(session.workspaceId, id, updates);
    if (!updated) return NextResponse.json({ error: { message: 'Product not found' } }, { status: 404 });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Update failed' } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return PUT(req);
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN', 'EDITOR'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Insufficient permissions. Requires EDITOR, ADMIN, or OWNER role.' } }, { status: 403 });
  }

  const url = new URL(req.url);
  const isAll = url.searchParams.get('all') === 'true';
  if (isAll) {
    const products = await db.commerceProducts.findMany(session.workspaceId);
    for (const p of products) {
      await db.commerceProducts.delete(session.workspaceId, p.id);
    }
    return NextResponse.json({ success: true, message: 'All products removed' });
  }

  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: { message: 'Product ID is required' } }, { status: 400 });

  const deleted = await db.commerceProducts.delete(session.workspaceId, id);
  if (deleted) {
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: { message: 'Product not found' } }, { status: 404 });
}
