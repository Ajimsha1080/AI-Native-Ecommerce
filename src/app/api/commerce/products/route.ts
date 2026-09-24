import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { CommerceProduct } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const products = db.commerce_products.filter(p => p.workspace_id === session.workspaceId);
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const newProduct: CommerceProduct = {
      id: generateId('prod'),
      workspace_id: session.workspaceId,
      title: body.title || 'New Product',
      description: body.description || '',
      category: body.category || 'General',
      tags: body.tags || [],
      price: parseFloat(body.price || '0'),
      currency: 'USD',
      images: body.images || ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'],
      in_stock: true,
      total_inventory: parseInt(body.inventory || '50', 10),
      variants: body.variants || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.commerce_products.push(newProduct);
    db.saveImmediate();
    return NextResponse.json({ success: true, product: newProduct });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Product creation failed' } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const idx = db.commerce_products.findIndex(p => p.id === id && p.workspace_id === session.workspaceId);
  if (idx >= 0) {
    db.commerce_products.splice(idx, 1);
    db.saveImmediate();
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: { message: 'Product not found' } }, { status: 404 });
}
