import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { CommerceProduct } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  let products = db.commerce_products.filter(p => p.workspace_id === session.workspaceId);

  if (products.length === 0) {
    const defaultCatalog: CommerceProduct[] = [
      {
        id: generateId('prod'),
        workspace_id: session.workspaceId,
        title: 'AeroPulse Pro Carbon Running Shoes',
        description: 'Engineered lightweight breathable mesh with carbon-fiber propulsion plate and ultra-responsive foam.',
        category: 'Footwear',
        tags: ['running', 'marathon', 'cushioned', 'carbon'],
        price: 149.99,
        compare_at_price: 179.99,
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'],
        in_stock: true,
        total_inventory: 48,
        variants: [
          { id: generateId('var'), sku: 'AP-PRO-BLK-09', title: 'Size 9 / Midnight Black', inventory_quantity: 14, price: 149.99, attributes: { size: '9', color: 'Midnight Black' } },
          { id: generateId('var'), sku: 'AP-PRO-BLK-10', title: 'Size 10 / Midnight Black', inventory_quantity: 18, price: 149.99, attributes: { size: '10', color: 'Midnight Black' } },
          { id: generateId('var'), sku: 'AP-PRO-BLK-11', title: 'Size 11 / Midnight Black', inventory_quantity: 16, price: 149.99, attributes: { size: '11', color: 'Midnight Black' } }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId('prod'),
        workspace_id: session.workspaceId,
        title: 'Apex All-Weather Trail Runner',
        description: 'Vibram Megagrip high-traction outsole with Gore-Tex waterproof breathable membrane for all terrains.',
        category: 'Footwear',
        tags: ['trail', 'waterproof', 'outdoor', 'hiking'],
        price: 165.00,
        compare_at_price: 195.00,
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80'],
        in_stock: true,
        total_inventory: 36,
        variants: [
          { id: generateId('var'), sku: 'APX-TRL-OLV-09', title: 'Size 9 / Forest Olive', inventory_quantity: 10, price: 165.00, attributes: { size: '9', color: 'Forest Olive' } },
          { id: generateId('var'), sku: 'APX-TRL-OLV-10', title: 'Size 10 / Forest Olive', inventory_quantity: 15, price: 165.00, attributes: { size: '10', color: 'Forest Olive' } },
          { id: generateId('var'), sku: 'APX-TRL-OLV-11', title: 'Size 11 / Forest Olive', inventory_quantity: 11, price: 165.00, attributes: { size: '11', color: 'Forest Olive' } }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId('prod'),
        workspace_id: session.workspaceId,
        title: 'ThermaShield Insulated Winter Parka',
        description: '700-fill responsible down insulation with storm-proof taped seams, fleece-lined pockets and detachable hood.',
        category: 'Apparel',
        tags: ['winter', 'parka', 'outerwear', 'jacket'],
        price: 249.50,
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1539533018447-63fcce667883?w=600&auto=format&fit=crop&q=80'],
        in_stock: true,
        total_inventory: 25,
        variants: [
          { id: generateId('var'), sku: 'TS-PRK-BLK-M', title: 'Size M / Jet Black', inventory_quantity: 8, price: 249.50, attributes: { size: 'M', color: 'Jet Black' } },
          { id: generateId('var'), sku: 'TS-PRK-BLK-L', title: 'Size L / Jet Black', inventory_quantity: 12, price: 249.50, attributes: { size: 'L', color: 'Jet Black' } },
          { id: generateId('var'), sku: 'TS-PRK-BLK-XL', title: 'Size XL / Jet Black', inventory_quantity: 5, price: 249.50, attributes: { size: 'XL', color: 'Jet Black' } }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: generateId('prod'),
        workspace_id: session.workspaceId,
        title: 'SonicWave ANC Wireless Headphones',
        description: 'Active hybrid noise cancellation with 40mm titanium dynamic drivers and 45-hour quick-charge battery life.',
        category: 'Electronics',
        tags: ['audio', 'wireless', 'anc', 'headphones'],
        price: 199.99,
        compare_at_price: 229.99,
        currency: 'USD',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'],
        in_stock: true,
        total_inventory: 40,
        variants: [
          { id: generateId('var'), sku: 'SW-ANC-BLK', title: 'Midnight Matte Black', inventory_quantity: 24, price: 199.99, attributes: { color: 'Matte Black' } },
          { id: generateId('var'), sku: 'SW-ANC-SLV', title: 'Silver Mist', inventory_quantity: 16, price: 199.99, attributes: { color: 'Silver Mist' } }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    db.commerce_products.push(...defaultCatalog);
    db.scheduleSave();
    products = db.commerce_products.filter(p => p.workspace_id === session.workspaceId);
  }

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
