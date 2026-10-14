import { db } from '@/lib/db';
import { sanitizeProductUrl } from '@/lib/utils';
import { AIModeProduct } from '../types';

export class AIModeCatalogAdapter {
  public static async getProducts(workspaceId?: string): Promise<AIModeProduct[]> {
    const ws = workspaceId || 'ws_acme_corp';
    const rawProducts = await db.commerceProducts.findMany(ws);
    
    // Convert to normalized AIModeProduct schema
    return rawProducts.map(p => ({
      id: p.id,
      title: p.title,
      handle: p.id,
      description: p.description || '',
      price: p.price,
      sale_price: typeof p.compare_at_price === 'number' && p.compare_at_price > 0 ? p.compare_at_price : undefined,
      currency: p.currency || 'INR',
      category: p.category || 'General',
      subcategories: p.tags || [],
      brand: (p.attributes as any)?.brand || 'Merchant',
      images: p.images || [],
      in_stock: p.in_stock ?? true,
      variants: (p.variants || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        in_stock: (v.inventory_quantity ?? 1) > 0,
        attributes: v.attributes || {}
      })),
      attributes: {
        ...(p.attributes || {}),
        category: p.category || '',
      },
      source_url: sanitizeProductUrl(p.source_url) || undefined
    }));
  }

  public static async getProductById(id: string, workspaceId?: string): Promise<AIModeProduct | null> {
    const products = await this.getProducts(workspaceId);
    return products.find(p => p.id === id) || null;
  }
}
