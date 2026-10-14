import { AIModeConfig, AIModeKnowledgeSource, AIModeDeployment, AIModeConversation } from '../types';
import { dbClient, withTenantContext } from '@/lib/db/client';
import { 
  aiModeConfigs, 
  aiModeKnowledgeSources, 
  aiModeDeployments, 
  aiModeConversations 
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export class AIModeStorage {
  private static instance: AIModeStorage;

  private constructor() {}

  public static getInstance(): AIModeStorage {
    if (!AIModeStorage.instance) {
      AIModeStorage.instance = new AIModeStorage();
    }
    return AIModeStorage.instance;
  }

  // --- Configs ---
  public async getConfig(workspaceId: string): Promise<AIModeConfig> {
    return await withTenantContext(workspaceId, async (tx) => {
      const rows = await tx.select().from(aiModeConfigs).where(eq(aiModeConfigs.tenantId, workspaceId)).limit(1);
      if (rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          workspace_id: row.tenantId,
          enabled: row.enabled,
          model_provider: row.modelProvider as any,
          model_name: row.modelName,
          api_key: row.apiKey || undefined,
          temperature: row.temperature,
          retrieval_threshold: row.retrievalThreshold,
          max_search_results: row.maxSearchResults,
          enable_recommendations: row.enableRecommendations,
          enable_comparisons: row.enableComparisons,
          enable_cart_actions: row.enableCartActions,
          system_instructions: row.systemInstructions,
          created_at: row.createdAt.toISOString(),
          updated_at: row.updatedAt.toISOString()
        };
      }

      // Default insert
      const newConfigId = `aimode_cfg_${workspaceId}`;
      const [inserted] = await tx.insert(aiModeConfigs).values({
        id: newConfigId,
        tenantId: workspaceId,
        enabled: true,
        modelProvider: 'sarvam',
        modelName: 'sarvam-105b-conversations',
        temperature: 0.3,
        retrievalThreshold: 0.25,
        maxSearchResults: 6,
        enableRecommendations: true,
        enableComparisons: true,
        enableCartActions: true,
        systemInstructions: 'You are an AI Mode shopping assistant specialized in product discovery, recommendations, comparisons, and verified merchant catalog advice.',
      }).returning();

      return {
        id: inserted.id,
        workspace_id: inserted.tenantId,
        enabled: inserted.enabled,
        model_provider: inserted.modelProvider as any,
        model_name: inserted.modelName,
        api_key: inserted.apiKey || undefined,
        temperature: inserted.temperature,
        retrieval_threshold: inserted.retrievalThreshold,
        max_search_results: inserted.maxSearchResults,
        enable_recommendations: inserted.enableRecommendations,
        enable_comparisons: inserted.enableComparisons,
        enable_cart_actions: inserted.enableCartActions,
        system_instructions: inserted.systemInstructions,
        created_at: inserted.createdAt.toISOString(),
        updated_at: inserted.updatedAt.toISOString()
      };
    });
  }

  public async updateConfig(workspaceId: string, updates: Partial<AIModeConfig>): Promise<AIModeConfig> {
    return await withTenantContext(workspaceId, async (tx) => {
      // Ensure exists
      await this.getConfig(workspaceId);

      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.model_provider !== undefined) dbUpdates.modelProvider = updates.model_provider;
      if (updates.model_name !== undefined) dbUpdates.modelName = updates.model_name;
      if (updates.api_key !== undefined) dbUpdates.apiKey = updates.api_key;
      if (updates.temperature !== undefined) dbUpdates.temperature = updates.temperature;
      if (updates.retrieval_threshold !== undefined) dbUpdates.retrievalThreshold = updates.retrieval_threshold;
      if (updates.max_search_results !== undefined) dbUpdates.maxSearchResults = updates.max_search_results;
      if (updates.enable_recommendations !== undefined) dbUpdates.enableRecommendations = updates.enable_recommendations;
      if (updates.enable_comparisons !== undefined) dbUpdates.enableComparisons = updates.enable_comparisons;
      if (updates.enable_cart_actions !== undefined) dbUpdates.enableCartActions = updates.enable_cart_actions;
      if (updates.system_instructions !== undefined) dbUpdates.systemInstructions = updates.system_instructions;

      const [row] = await tx.update(aiModeConfigs)
        .set(dbUpdates)
        .where(eq(aiModeConfigs.tenantId, workspaceId))
        .returning();

      return {
        id: row.id,
        workspace_id: row.tenantId,
        enabled: row.enabled,
        model_provider: row.modelProvider as any,
        model_name: row.modelName,
        api_key: row.apiKey || undefined,
        temperature: row.temperature,
        retrieval_threshold: row.retrievalThreshold,
        max_search_results: row.maxSearchResults,
        enable_recommendations: row.enableRecommendations,
        enable_comparisons: row.enableComparisons,
        enable_cart_actions: row.enableCartActions,
        system_instructions: row.systemInstructions,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString()
      };
    });
  }

  // --- Knowledge Sources ---
  public async getKnowledgeSources(workspaceId?: string): Promise<AIModeKnowledgeSource[]> {
    if (!workspaceId) {
      const rows = await dbClient.select().from(aiModeKnowledgeSources);
      return rows.map(r => this.mapKnowledgeSource(r));
    }
    return await withTenantContext(workspaceId, async (tx) => {
      const rows = await tx.select().from(aiModeKnowledgeSources).where(eq(aiModeKnowledgeSources.tenantId, workspaceId));
      return rows.map(r => this.mapKnowledgeSource(r));
    });
  }

  public async getKnowledgeSourceById(id: string, workspaceId?: string): Promise<AIModeKnowledgeSource | null> {
    if (workspaceId) {
      return await withTenantContext(workspaceId, async (tx) => {
        const rows = await tx.select().from(aiModeKnowledgeSources).where(
          and(eq(aiModeKnowledgeSources.id, id), eq(aiModeKnowledgeSources.tenantId, workspaceId))
        ).limit(1);
        return rows.length > 0 ? this.mapKnowledgeSource(rows[0]) : null;
      });
    }
    const rows = await dbClient.select().from(aiModeKnowledgeSources).where(eq(aiModeKnowledgeSources.id, id)).limit(1);
    return rows.length > 0 ? this.mapKnowledgeSource(rows[0]) : null;
  }

  public async addKnowledgeSource(source: AIModeKnowledgeSource): Promise<void> {
    await withTenantContext(source.workspace_id, async (tx) => {
      await tx.insert(aiModeKnowledgeSources).values({
        id: source.id,
        tenantId: source.workspace_id,
        name: source.name,
        type: source.type,
        sourceUrl: source.source_url || null,
        status: source.status,
        documentCount: source.document_count || 0,
        productCount: source.product_count || 0,
        lastSyncedAt: source.last_synced_at ? new Date(source.last_synced_at) : null,
        errorMessage: source.error_message || null,
        rawContent: source.raw_content || null,
        metadataJson: source.metadata || {},
      }).onConflictDoNothing();
    });
  }

  public async updateKnowledgeSource(id: string, updates: Partial<AIModeKnowledgeSource>, workspaceId?: string): Promise<AIModeKnowledgeSource | null> {
    const existing = await this.getKnowledgeSourceById(id, workspaceId);
    if (!existing) return null;

    return await withTenantContext(existing.workspace_id, async (tx) => {
      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.document_count !== undefined) dbUpdates.documentCount = updates.document_count;
      if (updates.product_count !== undefined) dbUpdates.productCount = updates.product_count;
      if (updates.last_synced_at !== undefined) dbUpdates.lastSyncedAt = updates.last_synced_at ? new Date(updates.last_synced_at) : null;
      if (updates.error_message !== undefined) dbUpdates.errorMessage = updates.error_message;
      if (updates.raw_content !== undefined) dbUpdates.rawContent = updates.raw_content;
      if (updates.metadata !== undefined) dbUpdates.metadataJson = updates.metadata;

      const [row] = await tx.update(aiModeKnowledgeSources)
        .set(dbUpdates)
        .where(eq(aiModeKnowledgeSources.id, id))
        .returning();

      return row ? this.mapKnowledgeSource(row) : null;
    });
  }

  public async deleteKnowledgeSource(id: string, workspaceId?: string): Promise<boolean> {
    const existing = await this.getKnowledgeSourceById(id, workspaceId);
    if (!existing) return false;

    return await withTenantContext(existing.workspace_id, async (tx) => {
      const res = await tx.delete(aiModeKnowledgeSources).where(eq(aiModeKnowledgeSources.id, id)).returning();
      return res.length > 0;
    });
  }

  // --- Deployments ---
  public async getDeployments(workspaceId: string): Promise<AIModeDeployment[]> {
    return await withTenantContext(workspaceId, async (tx) => {
      const rows = await tx.select().from(aiModeDeployments).where(eq(aiModeDeployments.tenantId, workspaceId));
      if (rows.length === 0) {
        const defaultDepId = `aim_dep_${workspaceId.replace(/[^a-zA-Z0-9]/g, '_')}_01`;
        const [inserted] = await tx.insert(aiModeDeployments).values({
          id: defaultDepId,
          tenantId: workspaceId,
          name: 'Storefront AI Mode Widget',
          status: 'LIVE',
          allowedDomains: ['*'],
          themeJson: {
            primary_color: '#09090b',
            background_color: '#ffffff',
            text_color: '#09090b',
            border_radius: 'lg',
            font_family: 'Inter, system-ui, sans-serif'
          },
          brandingJson: {
            title: 'AI Shopping Mode',
            subtitle: 'Instant recommendations & product search',
            welcome_message: 'Hi there! 👋 I am in AI Mode. Ask me to find products, compare styles, or recommend items for any occasion.',
            suggested_prompts: [
              'Find formal shirts under ₹2000',
              'Recommend a summer outfit',
              'Compare top rated items'
            ],
            position: 'bottom-right'
          },
          embedCode: `<script src="/api/ai-mode/widget/${defaultDepId}/script.js" async defer></script>`,
          totalConversations: 0,
          totalProductClicks: 0
        }).returning();

        return [this.mapDeployment(inserted)];
      }

      return rows.map(r => this.mapDeployment(r));
    });
  }

  public async getDeploymentById(id: string, workspaceId?: string): Promise<AIModeDeployment | null> {
    if (workspaceId) {
      return await withTenantContext(workspaceId, async (tx) => {
        const rows = await tx.select().from(aiModeDeployments).where(
          and(eq(aiModeDeployments.id, id), eq(aiModeDeployments.tenantId, workspaceId))
        ).limit(1);
        return rows.length > 0 ? this.mapDeployment(rows[0]) : null;
      });
    }
    const rows = await dbClient.select().from(aiModeDeployments).where(eq(aiModeDeployments.id, id)).limit(1);
    return rows.length > 0 ? this.mapDeployment(rows[0]) : null;
  }

  public async addDeployment(dep: AIModeDeployment): Promise<void> {
    await withTenantContext(dep.workspace_id, async (tx) => {
      await tx.insert(aiModeDeployments).values({
        id: dep.id,
        tenantId: dep.workspace_id,
        name: dep.name,
        status: dep.status,
        allowedDomains: dep.allowed_domains || ['*'],
        themeJson: dep.theme || {},
        brandingJson: dep.branding || {},
        embedCode: dep.embed_code || '',
        totalConversations: dep.total_conversations || 0,
        totalProductClicks: dep.total_product_clicks || 0,
      }).onConflictDoNothing();
    });
  }

  public async updateDeployment(id: string, updates: Partial<AIModeDeployment>, workspaceId?: string): Promise<AIModeDeployment | null> {
    const existing = await this.getDeploymentById(id, workspaceId);
    if (!existing) return null;

    return await withTenantContext(existing.workspace_id, async (tx) => {
      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.allowed_domains !== undefined) dbUpdates.allowedDomains = updates.allowed_domains;
      if (updates.theme !== undefined) dbUpdates.themeJson = updates.theme;
      if (updates.branding !== undefined) dbUpdates.brandingJson = updates.branding;
      if (updates.embed_code !== undefined) dbUpdates.embedCode = updates.embed_code;
      if (updates.total_conversations !== undefined) dbUpdates.totalConversations = updates.total_conversations;
      if (updates.total_product_clicks !== undefined) dbUpdates.totalProductClicks = updates.total_product_clicks;

      const [row] = await tx.update(aiModeDeployments)
        .set(dbUpdates)
        .where(eq(aiModeDeployments.id, id))
        .returning();

      return row ? this.mapDeployment(row) : null;
    });
  }

  public async deleteDeployment(id: string, workspaceId?: string): Promise<boolean> {
    const existing = await this.getDeploymentById(id, workspaceId);
    if (!existing) return false;

    return await withTenantContext(existing.workspace_id, async (tx) => {
      const res = await tx.delete(aiModeDeployments).where(eq(aiModeDeployments.id, id)).returning();
      return res.length > 0;
    });
  }

  // --- Conversations ---
  public async getConversation(id: string, workspaceId?: string): Promise<AIModeConversation | null> {
    if (workspaceId) {
      return await withTenantContext(workspaceId, async (tx) => {
        const rows = await tx.select().from(aiModeConversations).where(
          and(eq(aiModeConversations.id, id), eq(aiModeConversations.tenantId, workspaceId))
        ).limit(1);
        return rows.length > 0 ? this.mapConversation(rows[0]) : null;
      });
    }
    const rows = await dbClient.select().from(aiModeConversations).where(eq(aiModeConversations.id, id)).limit(1);
    return rows.length > 0 ? this.mapConversation(rows[0]) : null;
  }

  public async saveConversation(conv: AIModeConversation): Promise<void> {
    await withTenantContext(conv.workspace_id, async (tx) => {
      await tx.insert(aiModeConversations).values({
        id: conv.id,
        tenantId: conv.workspace_id,
        messagesJson: conv.messages,
        lastSearchState: conv.last_search_state || null,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: aiModeConversations.id,
        set: {
          messagesJson: conv.messages,
          lastSearchState: conv.last_search_state || null,
          updatedAt: new Date(),
        }
      });
    });
  }

  private mapKnowledgeSource(row: any): AIModeKnowledgeSource {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      name: row.name,
      type: row.type,
      source_url: row.sourceUrl || undefined,
      status: row.status,
      document_count: row.documentCount,
      product_count: row.productCount,
      last_synced_at: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : undefined,
      error_message: row.errorMessage || undefined,
      raw_content: row.rawContent || undefined,
      metadata: row.metadataJson || {},
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  private mapDeployment(row: any): AIModeDeployment {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      name: row.name,
      status: row.status,
      allowed_domains: row.allowedDomains || ['*'],
      theme: row.themeJson || {},
      branding: row.brandingJson || {},
      embed_code: row.embedCode || '',
      total_conversations: row.totalConversations || 0,
      total_product_clicks: row.totalProductClicks || 0,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  private mapConversation(row: any): AIModeConversation {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      messages: row.messagesJson || [],
      last_search_state: row.lastSearchState || undefined,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }
}

export const aiModeStorage = AIModeStorage.getInstance();
