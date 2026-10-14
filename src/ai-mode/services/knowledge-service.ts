import { AIModeKnowledgeSource } from '../types';
import { aiModeStorage } from './storage';
import { AIModeCrawlerAdapter } from '../adapters/crawler-adapter';
import { db } from '@/lib/db';
import { generateId, sanitizeProductUrl } from '@/lib/utils';

export class AIModeKnowledgeService {
  public static async getSources(workspaceId: string): Promise<AIModeKnowledgeSource[]> {
    return await aiModeStorage.getKnowledgeSources(workspaceId);
  }

  public static async addWebsiteSource(params: {
    workspaceId: string;
    url: string;
    name?: string;
  }): Promise<AIModeKnowledgeSource> {
    const sourceId = `aim_ks_${generateId('web')}`;
    const newSource: AIModeKnowledgeSource = {
      id: sourceId,
      workspace_id: params.workspaceId,
      name: params.name || params.url,
      type: 'WEBSITE',
      source_url: params.url,
      status: 'INDEXING',
      document_count: 0,
      product_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await aiModeStorage.addKnowledgeSource(newSource);

    // Run deep multi-page crawl
    const crawlResult = await AIModeCrawlerAdapter.crawlWebsite(params.url);
    if (crawlResult.status === 'SUCCESS') {
      // Sync crawled products into catalog database
      if (crawlResult.extractedProducts && crawlResult.extractedProducts.length > 0) {
        const existingProducts = await db.commerceProducts.findMany(params.workspaceId);
        for (const cp of crawlResult.extractedProducts) {
          const existing = existingProducts.find(
            p => p.title.toLowerCase().trim() === cp.title.toLowerCase().trim() || (p.source_url && p.source_url === cp.url)
          );
          if (!existing) {
            await db.commerceProducts.create(params.workspaceId, {
              id: cp.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              workspace_id: params.workspaceId,
              title: cp.title,
              description: cp.description || '',
              category: cp.category || 'General',
              tags: cp.tags || [],
              price: cp.price,
              compare_at_price: cp.sale_price,
              currency: 'INR',
              images: cp.images || [],
              in_stock: cp.in_stock ?? true,
              total_inventory: 50,
              variants: (cp.variants || []).map((v, i) => ({
                id: v.id || `var_${i}`,
                title: v.title || 'Standard',
                sku: `SKU-${v.id}`,
                price: v.price || cp.price,
                inventory_quantity: 20,
                attributes: v.attributes || {}
              })),
              source_url: sanitizeProductUrl(cp.url) || undefined,
              searchable_text: `${cp.title} ${cp.description} ${cp.category} ${(cp.tags || []).join(' ')}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }

      await aiModeStorage.updateKnowledgeSource(sourceId, {
        status: 'INDEXED',
        name: params.name || crawlResult.title || params.url,
        document_count: crawlResult.policyChunks.length,
        product_count: crawlResult.extractedProducts.length,
        last_synced_at: new Date().toISOString(),
        raw_content: crawlResult.textContent,
        metadata: {
          policy_count: crawlResult.policyChunks.length,
          extracted_products_count: crawlResult.extractedProducts.length,
          pages_crawled_count: crawlResult.pagesCrawledCount
        }
      });
    } else {
      await aiModeStorage.updateKnowledgeSource(sourceId, {
        status: 'ERROR',
        error_message: crawlResult.errorMessage || 'Failed to crawl website'
      });
    }

    const allSources = await aiModeStorage.getKnowledgeSources(params.workspaceId);
    return allSources.find(s => s.id === sourceId) || newSource;
  }

  public static async addDocumentSource(params: {
    workspaceId: string;
    name: string;
    content: string;
    type?: 'DOCUMENT' | 'FAQ' | 'CSV';
  }): Promise<AIModeKnowledgeSource> {
    const sourceId = `aim_ks_${generateId('doc')}`;
    const newSource: AIModeKnowledgeSource = {
      id: sourceId,
      workspace_id: params.workspaceId,
      name: params.name,
      type: params.type || 'DOCUMENT',
      status: 'INDEXED',
      document_count: 1,
      product_count: 0,
      raw_content: params.content,
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await aiModeStorage.addKnowledgeSource(newSource);
    return newSource;
  }

  public static async syncSource(id: string): Promise<AIModeKnowledgeSource | null> {
    const source = await aiModeStorage.getKnowledgeSourceById(id);
    if (!source) return null;

    if (source.type === 'WEBSITE' && source.source_url) {
      await aiModeStorage.updateKnowledgeSource(id, { status: 'INDEXING' });
      const crawl = await AIModeCrawlerAdapter.crawlWebsite(source.source_url);
      if (crawl.status === 'SUCCESS') {
        if (crawl.extractedProducts && crawl.extractedProducts.length > 0) {
          const existingProducts = await db.commerceProducts.findMany(source.workspace_id);
          for (const cp of crawl.extractedProducts) {
            const existing = existingProducts.find(
              p => p.title.toLowerCase().trim() === cp.title.toLowerCase().trim() || (p.source_url && p.source_url === cp.url)
            );
            if (!existing) {
              await db.commerceProducts.create(source.workspace_id, {
                id: cp.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                workspace_id: source.workspace_id,
                title: cp.title,
                description: cp.description || '',
                category: cp.category || 'General',
                tags: cp.tags || [],
                price: cp.price,
                compare_at_price: cp.sale_price,
                currency: 'INR',
                images: cp.images || [],
                in_stock: cp.in_stock ?? true,
                total_inventory: 50,
                variants: (cp.variants || []).map((v, i) => ({
                  id: v.id || `var_${i}`,
                  title: v.title || 'Standard',
                  sku: `SKU-${v.id}`,
                  price: v.price || cp.price,
                  inventory_quantity: 20,
                  attributes: v.attributes || {}
                })),
                source_url: sanitizeProductUrl(cp.url) || undefined,
                searchable_text: `${cp.title} ${cp.description} ${cp.category} ${(cp.tags || []).join(' ')}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        }

        return await aiModeStorage.updateKnowledgeSource(id, {
          status: 'INDEXED',
          name: crawl.title || source.name,
          document_count: crawl.policyChunks.length,
          product_count: crawl.extractedProducts.length,
          last_synced_at: new Date().toISOString(),
          raw_content: crawl.textContent,
          metadata: {
            policy_count: crawl.policyChunks.length,
            extracted_products_count: crawl.extractedProducts.length,
            pages_crawled_count: crawl.pagesCrawledCount
          }
        });
      } else {
        return await aiModeStorage.updateKnowledgeSource(id, {
          status: 'ERROR',
          error_message: crawl.errorMessage || 'Re-sync failed'
        });
      }
    }

    return await aiModeStorage.updateKnowledgeSource(id, {
      status: 'INDEXED',
      last_synced_at: new Date().toISOString()
    });
  }

  public static async deleteSource(id: string, workspaceId?: string): Promise<boolean> {
    const source = await aiModeStorage.getKnowledgeSourceById(id, workspaceId);
    if (source && source.source_url) {
      try {
        const domainKey = source.source_url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
        if (domainKey) {
          const prods = await db.commerceProducts.findMany(source.workspace_id);
          for (const p of prods) {
            if (p.source_url && p.source_url.toLowerCase().includes(domainKey)) {
              await db.commerceProducts.delete(source.workspace_id, p.id);
            }
          }
        }
      } catch {}
    }
    return await aiModeStorage.deleteKnowledgeSource(id, workspaceId);
  }
}
