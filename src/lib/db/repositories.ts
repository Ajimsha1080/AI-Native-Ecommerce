import { dbClient, withTenantContext, pool } from './client';
import * as schema from './schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import {
  User,
  Workspace,
  WorkspaceMember,
  Agent,
  AgentConfig,
  AgentVersion,
  AgentPolicy,
  KnowledgeSource,
  KnowledgeDocument,
  KnowledgeChunk,
  CommerceProduct,
  CommerceOrder,
  CommerceCart,
  Integration,
  Tool,
  ToolPermission,
  Conversation,
  Message,
  ExecutionTrace,
  Deployment,
  ApiKey,
  Webhook,
  WebhookDelivery,
  EvaluationCase,
  EvaluationRun,
  AuditLog,
  UsageEvent,
  ProcessedWebhookEvent,
  WorkspaceIntegration,
  IntegrationSyncJob
} from '@/types';

// ==============================================================================
// 1. USERS REPOSITORY (Global / Cross-Tenant)
// ==============================================================================
export class UsersRepository {
  async findById(id: string): Promise<User | null> {
    const rows = await dbClient.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return rows.length > 0 ? this.mapUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await dbClient.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim())).limit(1);
    return rows.length > 0 ? this.mapUser(rows[0]) : null;
  }

  async findMany(): Promise<User[]> {
    const rows = await dbClient.select().from(schema.users);
    return rows.map(r => this.mapUser(r));
  }

  async create(user: User): Promise<User> {
    const [row] = await dbClient.insert(schema.users).values({
      id: user.id,
      email: user.email.toLowerCase().trim(),
      name: user.name,
      role: user.role,
      passwordHash: user.password_hash || null,
      mfaSecret: user.mfa_secret || null,
      mfaEnabled: user.mfa_enabled ?? false,
      createdAt: user.created_at ? new Date(user.created_at) : new Date(),
    }).onConflictDoUpdate({
      target: schema.users.id,
      set: {
        name: user.name,
        role: user.role,
        passwordHash: user.password_hash || null,
        mfaSecret: user.mfa_secret || null,
        mfaEnabled: user.mfa_enabled ?? false,
      }
    }).returning();
    return this.mapUser(row);
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.password_hash !== undefined) dbUpdates.passwordHash = updates.password_hash;
    if (updates.mfa_secret !== undefined) dbUpdates.mfaSecret = updates.mfa_secret;
    if (updates.mfa_enabled !== undefined) dbUpdates.mfaEnabled = updates.mfa_enabled;

    const [row] = await dbClient.update(schema.users).set(dbUpdates).where(eq(schema.users.id, id)).returning();
    return row ? this.mapUser(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await dbClient.delete(schema.users).where(eq(schema.users.id, id)).returning();
    return res.length > 0;
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as any,
      password_hash: row.passwordHash || undefined,
      mfa_secret: row.mfaSecret || undefined,
      mfa_enabled: row.mfaEnabled,
      is_super_admin: row.role === 'SUPER_ADMIN' || row.role === 'SUPERADMIN',
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString()
    };
  }
}

// ==============================================================================
// 2. WORKSPACES REPOSITORY
// ==============================================================================
export class WorkspacesRepository {
  async findById(id: string): Promise<Workspace | null> {
    const rows = await dbClient.select().from(schema.workspaces).where(eq(schema.workspaces.id, id)).limit(1);
    return rows.length > 0 ? this.mapWorkspace(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const rows = await dbClient.select().from(schema.workspaces).where(eq(schema.workspaces.slug, slug)).limit(1);
    return rows.length > 0 ? this.mapWorkspace(rows[0]) : null;
  }

  async findMany(): Promise<Workspace[]> {
    const rows = await dbClient.select().from(schema.workspaces);
    return rows.map(r => this.mapWorkspace(r));
  }

  async create(ws: Workspace): Promise<Workspace> {
    const tier = ws.tier || ws.plan || 'FREE';
    const [row] = await dbClient.insert(schema.workspaces).values({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      tier,
      createdAt: ws.created_at ? new Date(ws.created_at) : new Date(),
      updatedAt: ws.updated_at ? new Date(ws.updated_at) : new Date(),
    }).onConflictDoUpdate({
      target: schema.workspaces.id,
      set: {
        name: ws.name,
        slug: ws.slug,
        tier,
        updatedAt: new Date(),
      }
    }).returning();
    return this.mapWorkspace(row);
  }

  async update(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const dbUpdates: any = { updatedAt: new Date() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
    else if (updates.plan !== undefined) dbUpdates.tier = updates.plan;

    const [row] = await dbClient.update(schema.workspaces).set(dbUpdates).where(eq(schema.workspaces.id, id)).returning();
    return row ? this.mapWorkspace(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await dbClient.delete(schema.workspaces).where(eq(schema.workspaces.id, id)).returning();
    return res.length > 0;
  }

  private mapWorkspace(row: any): Workspace {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      tier: row.tier as any,
      plan: row.tier as any,
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 3. WORKSPACE MEMBERS REPOSITORY
// ==============================================================================
export class WorkspaceMembersRepository {
  async findMany(tenantId: string): Promise<WorkspaceMember[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.tenantId, tenantId));
      return rows.map(r => this.mapMember(r));
    });
  }

  async findByUser(userId: string): Promise<WorkspaceMember[]> {
    // Cross-tenant lookup for user login
    return await dbClient.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.allow_membership_lookup', 'true', true)`);
      const rows = await tx.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.userId, userId));
      return rows.map(r => this.mapMember(r));
    });
  }

  async findMember(tenantId: string, userId: string): Promise<WorkspaceMember | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.workspaceMembers).where(
        and(eq(schema.workspaceMembers.tenantId, tenantId), eq(schema.workspaceMembers.userId, userId))
      ).limit(1);
      return rows.length > 0 ? this.mapMember(rows[0]) : null;
    });
  }

  async create(tenantId: string, member: WorkspaceMember): Promise<WorkspaceMember> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.workspaceMembers).values({
        id: member.id,
        tenantId,
        userId: member.user_id,
        role: member.role,
        createdAt: member.created_at ? new Date(member.created_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.workspaceMembers.id,
        set: { role: member.role }
      }).returning();
      return this.mapMember(row);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.workspaceMembers).where(
        and(eq(schema.workspaceMembers.tenantId, tenantId), eq(schema.workspaceMembers.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapMember(row: any): WorkspaceMember {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      user_id: row.userId,
      role: row.role as any,
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString()
    };
  }
}

// ==============================================================================
// 4. AGENTS REPOSITORY
// ==============================================================================
export class AgentsRepository {
  async findMany(tenantId: string): Promise<Agent[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.agents).where(eq(schema.agents.tenantId, tenantId));
      return rows.map(r => this.mapAgent(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<Agent | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.agents).where(
        and(eq(schema.agents.tenantId, tenantId), eq(schema.agents.id, id))
      ).limit(1);
      return rows.length > 0 ? this.mapAgent(rows[0]) : null;
    });
  }

  async create(tenantId: string, agent: Agent): Promise<Agent> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.agents).values({
        id: agent.id,
        tenantId,
        name: agent.name,
        description: agent.description || null,
        status: agent.status || 'ACTIVE',
        createdAt: agent.created_at ? new Date(agent.created_at) : new Date(),
        updatedAt: agent.updated_at ? new Date(agent.updated_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.agents.id,
        set: {
          name: agent.name,
          description: agent.description || null,
          status: agent.status || 'ACTIVE',
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapAgent(row);
    });
  }

  async update(tenantId: string, id: string, updates: Partial<Agent>): Promise<Agent | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const [row] = await tx.update(schema.agents).set(dbUpdates).where(
        and(eq(schema.agents.tenantId, tenantId), eq(schema.agents.id, id))
      ).returning();
      return row ? this.mapAgent(row) : null;
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.agents).where(
        and(eq(schema.agents.tenantId, tenantId), eq(schema.agents.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapAgent(row: any): Agent {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      name: row.name,
      description: row.description || '',
      industry: 'E-commerce',
      primary_objective: 'Customer Support & Sales',
      language: 'English / Multilingual',
      status: row.status as any,
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 5. AGENT CONFIGS REPOSITORY
// ==============================================================================
export class AgentConfigsRepository {
  async findByAgentId(tenantId: string, agentId: string): Promise<AgentConfig | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.agentConfigs).where(
        and(eq(schema.agentConfigs.tenantId, tenantId), eq(schema.agentConfigs.agentId, agentId))
      ).limit(1);
      return rows.length > 0 ? this.mapConfig(rows[0]) : null;
    });
  }

  async create(tenantId: string, config: AgentConfig): Promise<AgentConfig> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.agentConfigs).values({
        id: config.id,
        tenantId,
        agentId: config.agent_id,
        model: config.model || 'sarvam-105b-conversations',
        temperature: config.temperature ?? 0.7,
        maxTokens: config.max_tokens ?? 2048,
        systemPrompt: config.system_prompt || '',
        tools: config.tools || [],
        guardrails: config.guardrails || {},
        ragEnabled: config.rag_enabled ?? true,
        updatedAt: config.updated_at ? new Date(config.updated_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.agentConfigs.id,
        set: {
          model: config.model || 'sarvam-105b-conversations',
          temperature: config.temperature ?? 0.7,
          maxTokens: config.max_tokens ?? 2048,
          systemPrompt: config.system_prompt || '',
          tools: config.tools || [],
          guardrails: config.guardrails || {},
          ragEnabled: config.rag_enabled ?? true,
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapConfig(row);
    });
  }

  async update(tenantId: string, agentId: string, updates: Partial<AgentConfig>): Promise<AgentConfig | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.model !== undefined) dbUpdates.model = updates.model;
      if (updates.temperature !== undefined) dbUpdates.temperature = updates.temperature;
      if (updates.max_tokens !== undefined) dbUpdates.maxTokens = updates.max_tokens;
      if (updates.system_prompt !== undefined) dbUpdates.systemPrompt = updates.system_prompt;
      if (updates.tools !== undefined) dbUpdates.tools = updates.tools;
      if (updates.guardrails !== undefined) dbUpdates.guardrails = updates.guardrails;
      if (updates.rag_enabled !== undefined) dbUpdates.ragEnabled = updates.rag_enabled;

      const [row] = await tx.update(schema.agentConfigs).set(dbUpdates).where(
        and(eq(schema.agentConfigs.tenantId, tenantId), eq(schema.agentConfigs.agentId, agentId))
      ).returning();
      return row ? this.mapConfig(row) : null;
    });
  }

  private mapConfig(row: any): AgentConfig {
    return {
      id: row.id,
      agent_id: row.agentId,
      model: row.model,
      temperature: row.temperature,
      max_tokens: row.maxTokens,
      system_prompt: row.systemPrompt,
      tools: row.tools || [],
      guardrails: row.guardrails || {},
      rag_enabled: row.ragEnabled,
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 6. COMMERCE PRODUCTS REPOSITORY
// ==============================================================================
export class CommerceProductsRepository {
  async findMany(tenantId: string): Promise<CommerceProduct[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.commerceProducts).where(eq(schema.commerceProducts.tenantId, tenantId));
      return rows.map(r => this.mapProduct(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<CommerceProduct | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.commerceProducts).where(
        and(eq(schema.commerceProducts.tenantId, tenantId), eq(schema.commerceProducts.id, id))
      ).limit(1);
      return rows.length > 0 ? this.mapProduct(rows[0]) : null;
    });
  }

  async findByHandle(tenantId: string, handle: string): Promise<CommerceProduct | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.commerceProducts).where(
        and(eq(schema.commerceProducts.tenantId, tenantId), eq(schema.commerceProducts.handle, handle))
      ).limit(1);
      return rows.length > 0 ? this.mapProduct(rows[0]) : null;
    });
  }

  async create(tenantId: string, prod: CommerceProduct): Promise<CommerceProduct> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.commerceProducts).values({
        id: prod.id,
        tenantId,
        title: prod.title,
        handle: prod.handle || null,
        description: prod.description || '',
        price: prod.price,
        compareAtPrice: prod.compare_at_price || null,
        currency: prod.currency || 'INR',
        category: prod.category || 'General',
        tags: prod.tags || [],
        images: prod.images || [],
        inStock: prod.in_stock ?? true,
        stock: (prod as any).inventory_count ?? prod.total_inventory ?? 10,
        variants: prod.variants || [],
        attributes: prod.attributes || {},
        sourceUrl: prod.source_url || null,
        createdAt: prod.created_at ? new Date(prod.created_at) : new Date(),
        updatedAt: prod.updated_at ? new Date(prod.updated_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.commerceProducts.id,
        set: {
          title: prod.title,
          description: prod.description || '',
          price: prod.price,
          inStock: prod.in_stock ?? true,
          stock: (prod as any).inventory_count ?? prod.total_inventory ?? 10,
          variants: prod.variants || [],
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapProduct(row);
    });
  }

  async update(tenantId: string, id: string, updates: Partial<CommerceProduct>): Promise<CommerceProduct | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.handle !== undefined) dbUpdates.handle = updates.handle;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.compare_at_price !== undefined) dbUpdates.compareAtPrice = updates.compare_at_price;
      if (updates.in_stock !== undefined) dbUpdates.inStock = updates.in_stock;
      if (updates.total_inventory !== undefined) dbUpdates.stock = updates.total_inventory;
      if (updates.variants !== undefined) dbUpdates.variants = updates.variants;
      if (updates.attributes !== undefined) dbUpdates.attributes = updates.attributes;

      const [row] = await tx.update(schema.commerceProducts).set(dbUpdates).where(
        and(eq(schema.commerceProducts.tenantId, tenantId), eq(schema.commerceProducts.id, id))
      ).returning();
      return row ? this.mapProduct(row) : null;
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.commerceProducts).where(
        and(eq(schema.commerceProducts.tenantId, tenantId), eq(schema.commerceProducts.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapProduct(row: any): CommerceProduct {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      title: row.title,
      handle: row.handle || undefined,
      description: row.description || '',
      price: row.price,
      compare_at_price: row.compareAtPrice || undefined,
      currency: row.currency || 'INR',
      category: row.category || 'General',
      tags: row.tags || [],
      images: row.images || [],
      in_stock: row.inStock,
      total_inventory: row.stock,
      inventory_count: row.stock,
      variants: row.variants || [],
      attributes: row.attributes || {},
      source_url: row.sourceUrl || undefined,
      searchable_text: row.searchableText || undefined,
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 7. COMMERCE ORDERS REPOSITORY
// ==============================================================================
export class CommerceOrdersRepository {
  async findMany(tenantId: string): Promise<CommerceOrder[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.commerceOrders).where(eq(schema.commerceOrders.tenantId, tenantId));
      return rows.map(r => this.mapOrder(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<CommerceOrder | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.commerceOrders).where(
        and(eq(schema.commerceOrders.tenantId, tenantId), eq(schema.commerceOrders.id, id))
      ).limit(1);
      return rows.length > 0 ? this.mapOrder(rows[0]) : null;
    });
  }

  async create(tenantId: string, order: CommerceOrder): Promise<CommerceOrder> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.commerceOrders).values({
        id: order.id,
        tenantId,
        orderNumber: order.order_number || order.id,
        customerName: order.customer_name || null,
        customerEmail: order.customer_email || 'guest@shopmate.ai',
        totalAmount: order.total_amount,
        currency: order.currency || 'INR',
        financialStatus: order.payment_status || order.status || 'PAID',
        fulfillmentStatus: order.fulfillment_status || 'UNFULFILLED',
        itemsJson: order.items || [],
        createdAt: order.created_at ? new Date(order.created_at) : new Date(),
        updatedAt: order.updated_at ? new Date(order.updated_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.commerceOrders.id,
        set: {
          financialStatus: order.payment_status || order.status || 'PAID',
          totalAmount: order.total_amount,
          itemsJson: order.items || [],
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapOrder(row);
    });
  }

  async update(tenantId: string, id: string, updates: Partial<CommerceOrder>): Promise<CommerceOrder | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.status !== undefined || updates.payment_status !== undefined) {
        dbUpdates.financialStatus = updates.payment_status || updates.status;
      }
      if (updates.fulfillment_status !== undefined) {
        dbUpdates.fulfillmentStatus = updates.fulfillment_status;
      }
      if (updates.total_amount !== undefined) dbUpdates.totalAmount = updates.total_amount;
      if (updates.items !== undefined) dbUpdates.itemsJson = updates.items;

      const [row] = await tx.update(schema.commerceOrders).set(dbUpdates).where(
        and(eq(schema.commerceOrders.tenantId, tenantId), eq(schema.commerceOrders.id, id))
      ).returning();
      return row ? this.mapOrder(row) : null;
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      await tx.delete(schema.commerceOrders).where(
        and(eq(schema.commerceOrders.tenantId, tenantId), eq(schema.commerceOrders.id, id))
      );
      return true;
    });
  }

  private mapOrder(row: any): CommerceOrder {
    return {
      id: row.id,
      order_number: row.orderNumber || row.id,
      workspace_id: row.tenantId,
      customer_name: row.customerName || undefined,
      customer_email: row.customerEmail,
      status: (row.financialStatus as any) || 'PAID',
      payment_status: (row.financialStatus as any) || 'PAID',
      fulfillment_status: (row.fulfillmentStatus as any) || 'UNFULFILLED',
      total_amount: row.totalAmount,
      currency: row.currency,
      items: (row.itemsJson as any) || [],
      shipping_address: {},
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 8. COMMERCE CARTS REPOSITORY
// ==============================================================================
export class CommerceCartsRepository {
  async findById(tenantId: string, id: string): Promise<CommerceCart | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.commerceCarts).where(
        and(eq(schema.commerceCarts.tenantId, tenantId), eq(schema.commerceCarts.id, id))
      ).limit(1);
      return rows.length > 0 ? this.mapCart(rows[0]) : null;
    });
  }

  async save(tenantId: string, cart: CommerceCart): Promise<CommerceCart> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.commerceCarts).values({
        id: cart.id,
        tenantId,
        sessionId: cart.id,
        itemsJson: cart.items || [],
        createdAt: cart.updated_at ? new Date(cart.updated_at) : new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.commerceCarts.id,
        set: {
          itemsJson: cart.items || [],
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapCart(row);
    });
  }

  async createOrUpdate(tenantId: string, cart: CommerceCart): Promise<CommerceCart> {
    return this.save(tenantId, cart);
  }

  private mapCart(row: any): CommerceCart {
    const items = (row.itemsJson as any) || [];
    const discountAmount = 0;
    const subtotal = items.reduce((sum: number, it: any) => sum + ((it.price || 0) * (it.quantity || 1)), 0);
    return {
      id: row.id,
      workspace_id: row.tenantId,
      items,
      discount_amount: discountAmount,
      subtotal,
      total: Math.max(0, subtotal - discountAmount),
      currency: 'INR',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 9. KNOWLEDGE SOURCES, DOCUMENTS & CHUNKS (With pgvector <=> in SQL)
// ==============================================================================
export class KnowledgeSourcesRepository {
  async findMany(tenantId: string): Promise<KnowledgeSource[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.knowledgeSources).where(eq(schema.knowledgeSources.tenantId, tenantId));
      return rows.map(r => this.mapSource(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<KnowledgeSource | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.knowledgeSources).where(
        and(eq(schema.knowledgeSources.tenantId, tenantId), eq(schema.knowledgeSources.id, id))
      ).limit(1);
      return rows.length > 0 ? this.mapSource(rows[0]) : null;
    });
  }

  async create(tenantId: string, source: KnowledgeSource): Promise<KnowledgeSource> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.knowledgeSources).values({
        id: source.id,
        tenantId,
        name: source.name,
        type: source.type,
        status: source.status,
        config: source.config || {},
        documentCount: source.document_count || 0,
        createdAt: source.created_at ? new Date(source.created_at) : new Date(),
        updatedAt: source.updated_at ? new Date(source.updated_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.knowledgeSources.id,
        set: {
          name: source.name,
          status: source.status,
          config: source.config || {},
          documentCount: source.document_count || 0,
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapSource(row);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.knowledgeSources).where(
        and(eq(schema.knowledgeSources.tenantId, tenantId), eq(schema.knowledgeSources.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapSource(row: any): KnowledgeSource {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      name: row.name,
      type: row.type as any,
      status: row.status as any,
      config: row.config || {},
      document_count: row.documentCount,
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export class KnowledgeDocumentsRepository {
  async findMany(tenantId: string): Promise<KnowledgeDocument[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.knowledgeDocuments).where(eq(schema.knowledgeDocuments.tenantId, tenantId));
      return rows.map(r => this.mapDoc(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<KnowledgeDocument | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.knowledgeDocuments).where(
        and(eq(schema.knowledgeDocuments.tenantId, tenantId), eq(schema.knowledgeDocuments.id, id))
      ).limit(1);
      return rows.length > 0 ? this.mapDoc(rows[0]) : null;
    });
  }

  async create(tenantId: string, doc: KnowledgeDocument): Promise<KnowledgeDocument> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.knowledgeDocuments).values({
        id: doc.id,
        tenantId,
        sourceId: doc.source_id || 'default-source',
        title: doc.title || doc.name || 'Untitled Document',
        content: doc.content || doc.raw_content || '',
        metadataJson: doc.metadata || {},
        createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.knowledgeDocuments.id,
        set: {
          title: doc.title || doc.name || 'Untitled Document',
          content: doc.content || doc.raw_content || '',
          metadataJson: doc.metadata || {},
        }
      }).returning();
      return this.mapDoc(row);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.knowledgeDocuments).where(
        and(eq(schema.knowledgeDocuments.tenantId, tenantId), eq(schema.knowledgeDocuments.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapDoc(row: any): KnowledgeDocument {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      source_id: row.sourceId,
      name: row.title,
      title: row.title,
      type: 'TEXT',
      status: 'READY',
      content: row.content,
      metadata: row.metadataJson || {},
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}

export class KnowledgeChunksRepository {
  async findMany(tenantId: string, docId?: string): Promise<KnowledgeChunk[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const whereClause = docId 
        ? and(eq(schema.knowledgeChunks.tenantId, tenantId), eq(schema.knowledgeChunks.docId, docId))
        : eq(schema.knowledgeChunks.tenantId, tenantId);
      const rows = await tx.select().from(schema.knowledgeChunks).where(whereClause);
      return rows.map(r => this.mapChunk(r));
    });
  }

  /**
   * Genuine pgvector similarity search executing `<=>` operator directly in SQL with HNSW index
   */
  async searchSimilar(tenantId: string, queryVector: number[], topK: number = 5): Promise<Array<KnowledgeChunk & { similarity: number }>> {
    return await withTenantContext(tenantId, async (tx) => {
      const vectorLiteral = `[${queryVector.join(',')}]`;
      const result = await tx.execute(sql`
        SELECT 
          id, tenant_id, doc_id, chunk_index, text, metadata_json, created_at,
          1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
        FROM knowledge_chunks
        WHERE tenant_id = current_setting('app.current_tenant', true)
        ORDER BY embedding <=> ${vectorLiteral}::vector ASC
        LIMIT ${topK};
      `);

      return (result.rows as any[]).map(r => ({
        id: r.id,
        workspace_id: r.tenant_id,
        document_id: r.doc_id,
        chunk_index: r.chunk_index,
        content: r.text,
        embedding: [],
        metadata: r.metadata_json || {},
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        similarity: parseFloat(r.similarity) || 0
      }));
    });
  }

  async create(tenantId: string, chunk: KnowledgeChunk): Promise<KnowledgeChunk> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.knowledgeChunks).values({
        id: chunk.id,
        tenantId,
        docId: chunk.document_id,
        chunkIndex: chunk.chunk_index,
        text: chunk.content,
        embedding: chunk.embedding && chunk.embedding.length === 1536 ? chunk.embedding : null,
        metadataJson: chunk.metadata || {},
        createdAt: chunk.created_at ? new Date(chunk.created_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.knowledgeChunks.id,
        set: {
          text: chunk.content,
          embedding: chunk.embedding && chunk.embedding.length === 1536 ? chunk.embedding : null,
          metadataJson: chunk.metadata || {},
        }
      }).returning();
      return this.mapChunk(row);
    });
  }

  async deleteByDocId(tenantId: string, docId: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.knowledgeChunks).where(
        and(eq(schema.knowledgeChunks.tenantId, tenantId), eq(schema.knowledgeChunks.docId, docId))
      ).returning();
      return res.length > 0;
    });
  }

  async count(tenantId: string): Promise<number> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.knowledgeChunks).where(eq(schema.knowledgeChunks.tenantId, tenantId));
      return rows.length;
    });
  }

  private mapChunk(row: any): KnowledgeChunk {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      document_id: row.docId,
      chunk_index: row.chunkIndex,
      content: row.text,
      embedding: row.embedding || undefined,
      metadata: row.metadataJson || {},
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 10. CONVERSATIONS & MESSAGES REPOSITORY
// ==============================================================================
export class ConversationsRepository {
  async findMany(tenantId: string): Promise<Conversation[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.conversations).where(eq(schema.conversations.tenantId, tenantId));
      return rows.map(r => this.mapConv(r));
    });
  }

  async findById(tenantId: string, id: string): Promise<Conversation | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.conversations).where(
        and(eq(schema.conversations.tenantId, tenantId), eq(schema.conversations.id, id))
      ).limit(1);
      return rows.length > 0 ? this.mapConv(rows[0]) : null;
    });
  }

  async create(tenantId: string, conv: Conversation): Promise<Conversation> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.conversations).values({
        id: conv.id,
        tenantId,
        agentId: conv.agent_id,
        customerId: conv.customer_id || conv.user_id || conv.customer_identifier || null,
        status: conv.status || 'ACTIVE',
        channel: conv.channel || 'WEBSITE',
        metadataJson: conv.metadata || {},
        createdAt: conv.created_at ? new Date(conv.created_at) : new Date(),
        updatedAt: conv.updated_at ? new Date(conv.updated_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.conversations.id,
        set: {
          status: conv.status || 'ACTIVE',
          metadataJson: conv.metadata || {},
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapConv(row);
    });
  }

  async count(tenantId: string): Promise<number> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.conversations).where(eq(schema.conversations.tenantId, tenantId));
      return rows.length;
    });
  }

  private mapConv(row: any): Conversation {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      agent_id: row.agentId,
      customer_id: row.customerId || undefined,
      user_id: row.customerId || undefined,
      customer_identifier: row.customerId || 'anonymous',
      status: row.status as any,
      channel: row.channel as any,
      metadata: row.metadataJson || {},
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export class MessagesRepository {
  async findMany(tenantId: string, conversationId: string): Promise<Message[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.messages).where(
        and(eq(schema.messages.tenantId, tenantId), eq(schema.messages.conversationId, conversationId))
      );
      return rows.map(r => this.mapMsg(r));
    });
  }

  async count(tenantId: string): Promise<number> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.messages).where(eq(schema.messages.tenantId, tenantId));
      return rows.length;
    });
  }

  async create(tenantId: string, msg: Message): Promise<Message> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.messages).values({
        id: msg.id,
        tenantId,
        conversationId: msg.conversation_id,
        sender: msg.sender || msg.role || 'USER',
        content: msg.content,
        traceJson: {
          metadata: msg.metadata || {},
          tokens_used: msg.tokens_used,
          latency_ms: msg.latency_ms,
        },
        createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
      }).returning();
      return this.mapMsg(row);
    });
  }

  private mapMsg(row: any): Message {
    const trace = (row.traceJson as any) || {};
    return {
      id: row.id,
      workspace_id: row.tenantId,
      conversation_id: row.conversationId,
      role: (row.sender as any) || 'USER',
      sender: row.sender,
      content: row.content,
      tokens_used: trace.tokens_used,
      latency_ms: trace.latency_ms,
      metadata: trace.metadata || {},
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 11. DEPLOYMENTS & API KEYS REPOSITORY
// ==============================================================================
export class DeploymentsRepository {
  async findMany(tenantId: string): Promise<Deployment[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.deployments).where(eq(schema.deployments.tenantId, tenantId));
      return rows.map(r => this.mapDeployment(r));
    });
  }

  async findById(id: string): Promise<Deployment | null> {
    // Public resolution by deployment ID or token
    const rows = await dbClient.select().from(schema.deployments).where(eq(schema.deployments.id, id)).limit(1);
    return rows.length > 0 ? this.mapDeployment(rows[0]) : null;
  }

  async findByPublicKey(publicKey: string): Promise<Deployment | null> {
    const rows = await dbClient.select().from(schema.deployments).where(eq(schema.deployments.publicKey, publicKey)).limit(1);
    return rows.length > 0 ? this.mapDeployment(rows[0]) : null;
  }

  async create(tenantId: string, dep: Deployment): Promise<Deployment> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.deployments).values({
        id: dep.id,
        tenantId,
        agentId: dep.agent_id,
        environment: dep.environment || 'PRODUCTION',
        publicKey: dep.public_key || `pk_live_${dep.id.replace(/[^a-zA-Z0-9]/g, '')}`,
        status: dep.status || 'ACTIVE',
        allowedDomains: dep.allowed_domains || ['*'],
        config: dep.config || {},
        createdAt: dep.created_at ? new Date(dep.created_at) : new Date(),
        updatedAt: dep.updated_at ? new Date(dep.updated_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.deployments.id,
        set: {
          environment: dep.environment || 'PRODUCTION',
          status: dep.status || 'ACTIVE',
          allowedDomains: dep.allowed_domains || ['*'],
          config: dep.config || {},
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapDeployment(row);
    });
  }

  async update(tenantId: string, id: string, updates: Partial<Deployment>): Promise<Deployment | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.environment !== undefined) dbUpdates.environment = updates.environment;
      if (updates.allowed_domains !== undefined) dbUpdates.allowedDomains = updates.allowed_domains;
      if (updates.config !== undefined) dbUpdates.config = updates.config;

      const [row] = await tx.update(schema.deployments).set(dbUpdates).where(
        and(eq(schema.deployments.tenantId, tenantId), eq(schema.deployments.id, id))
      ).returning();
      return row ? this.mapDeployment(row) : null;
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.deployments).where(
        and(eq(schema.deployments.tenantId, tenantId), eq(schema.deployments.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapDeployment(row: any): Deployment {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      agent_id: row.agentId,
      channel: 'WEBSITE',
      environment: row.environment,
      status: row.status as any,
      config: (row.config as any) || {},
      public_key: row.publicKey,
      allowed_domains: (row.allowedDomains as any) || ['*'],
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export class ApiKeysRepository {
  async findMany(tenantId: string): Promise<ApiKey[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.apiKeys).where(eq(schema.apiKeys.tenantId, tenantId));
      return rows.map(r => this.mapApiKey(r));
    });
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return await dbClient.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.allow_key_lookup', 'true', true)`);
      const rows = await tx.select().from(schema.apiKeys).where(eq(schema.apiKeys.hashedKey, keyHash)).limit(1);
      return rows.length > 0 ? this.mapApiKey(rows[0]) : null;
    });
  }

  async create(tenantId: string, apiKey: ApiKey): Promise<ApiKey> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.apiKeys).values({
        id: apiKey.id,
        tenantId,
        name: apiKey.name,
        hashedKey: apiKey.hashed_key || (apiKey as any).key_hash || '',
        keyPrefix: apiKey.key_prefix,
        permissions: apiKey.permissions || ['execute:agent', 'read:catalog'],
        lastUsedAt: apiKey.last_used_at ? new Date(apiKey.last_used_at) : null,
        createdAt: apiKey.created_at ? new Date(apiKey.created_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.apiKeys.id,
        set: {
          name: apiKey.name,
          hashedKey: apiKey.hashed_key || (apiKey as any).key_hash || '',
          permissions: apiKey.permissions || ['execute:agent', 'read:catalog'],
        }
      }).returning();
      return this.mapApiKey(row);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.apiKeys).where(
        and(eq(schema.apiKeys.tenantId, tenantId), eq(schema.apiKeys.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapApiKey(row: any): ApiKey {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      name: row.name,
      hashed_key: row.hashedKey,
      key_prefix: row.keyPrefix,
      permissions: (row.permissions as any) || [],
      last_used_at: row.lastUsedAt ? row.lastUsedAt.toISOString() : undefined,
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}

// ==============================================================================
// 12. WEBHOOKS & PROCESSED EVENTS REPOSITORY
// ==============================================================================
export class WebhooksRepository {
  async findMany(tenantId: string): Promise<Webhook[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.webhooks).where(eq(schema.webhooks.tenantId, tenantId));
      return rows.map(r => this.mapWebhook(r));
    });
  }

  async findByEvent(tenantId: string, eventName: string): Promise<Webhook[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.webhooks).where(
        and(eq(schema.webhooks.tenantId, tenantId), eq(schema.webhooks.isActive, true))
      );
      return rows.map(r => this.mapWebhook(r)).filter(w => (w.events || []).includes(eventName));
    });
  }

  async create(tenantId: string, hook: Webhook): Promise<Webhook> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.webhooks).values({
        id: hook.id,
        tenantId,
        url: hook.url,
        secret: hook.secret,
        events: hook.events || [],
        isActive: hook.is_active ?? true,
        createdAt: hook.created_at ? new Date(hook.created_at) : new Date(),
      }).returning();
      return this.mapWebhook(row);
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.webhooks).where(
        and(eq(schema.webhooks.tenantId, tenantId), eq(schema.webhooks.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapWebhook(row: any): Webhook {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      url: row.url,
      secret: row.secret,
      events: row.events || [],
      is_active: row.isActive,
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}

export class ProcessedWebhookEventsRepository {
  async hasProcessed(eventId: string, tenantId?: string): Promise<boolean> {
    if (tenantId) {
      return await withTenantContext(tenantId, async (tx) => {
        const rows = await tx.select().from(schema.processedWebhookEvents).where(
          and(eq(schema.processedWebhookEvents.tenantId, tenantId), eq(schema.processedWebhookEvents.eventId, eventId))
        ).limit(1);
        return rows.length > 0;
      });
    }
    const rows = await dbClient.select().from(schema.processedWebhookEvents).where(
      eq(schema.processedWebhookEvents.eventId, eventId)
    ).limit(1);
    return rows.length > 0;
  }

  async record(tenantId: string, eventId: string, provider: string): Promise<void> {
    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(schema.processedWebhookEvents).values({
        id: `pwe_${eventId}`,
        tenantId,
        eventId,
        provider,
        processedAt: new Date(),
      }).onConflictDoNothing();
    });
  }
}


// ==============================================================================
// 13. AUDIT LOGS & USAGE EVENTS REPOSITORY
// ==============================================================================
export class AuditLogsRepository {
  async findMany(tenantId: string, limit: number = 100): Promise<AuditLog[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.auditLogs)
        .where(eq(schema.auditLogs.tenantId, tenantId))
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(limit);
      return rows.map(r => this.mapLog(r));
    });
  }

  async create(tenantId: string, log: AuditLog): Promise<AuditLog> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.auditLogs).values({
        id: log.id,
        tenantId,
        userId: log.user_id || log.actor_user_id || null,
        action: log.action,
        resourceType: log.resource_type || log.resource || 'SYSTEM',
        resourceId: log.resource_id || log.resource || null,
        details: log.details || log.metadata || {},
        ipAddress: log.ip_address || null,
        createdAt: log.created_at ? new Date(log.created_at) : new Date(),
      }).returning();
      return this.mapLog(row);
    });
  }

  private mapLog(row: any): AuditLog {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      user_id: row.userId || undefined,
      action: row.action,
      resource: row.resourceType,
      resource_type: row.resourceType,
      resource_id: row.resourceId || undefined,
      metadata: row.details || {},
      details: row.details || {},
      ip_address: row.ipAddress || undefined,
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}

export class UsageEventsRepository {
  async count(tenantId: string, eventType?: string): Promise<number> {
    return await withTenantContext(tenantId, async (tx) => {
      const whereClause = eventType
        ? and(eq(schema.usageEvents.tenantId, tenantId), eq(schema.usageEvents.eventType, eventType))
        : eq(schema.usageEvents.tenantId, tenantId);
      const rows = await tx.select().from(schema.usageEvents).where(whereClause);
      return rows.length;
    });
  }

  async create(tenantId: string, event: UsageEvent): Promise<UsageEvent> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.usageEvents).values({
        id: event.id,
        tenantId,
        eventType: event.event_type,
        count: event.event_count || event.quantity || 1,
        metadataJson: event.metadata || {},
        timestamp: event.created_at ? new Date(event.created_at) : new Date(),
      }).returning();
      return {
        id: row.id,
        workspace_id: row.tenantId,
        event_type: row.eventType as any,
        event_count: row.count,
        quantity: row.count,
        metadata: row.metadataJson || {},
        created_at: row.timestamp ? row.timestamp.toISOString() : new Date().toISOString(),
      };
    });
  }
}

// ==============================================================================
// 14. AGENT VERSIONS REPOSITORY
// ==============================================================================
export class AgentVersionsRepository {
  async findMany(tenantId: string, agentId?: string): Promise<AgentVersion[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = agentId
        ? await tx.select().from(schema.agentVersions).where(
            and(eq(schema.agentVersions.tenantId, tenantId), eq(schema.agentVersions.agentId, agentId))
          ).orderBy(desc(schema.agentVersions.versionNumber))
        : await tx.select().from(schema.agentVersions).where(
            eq(schema.agentVersions.tenantId, tenantId)
          ).orderBy(desc(schema.agentVersions.versionNumber));

      return rows.map(r => ({
        id: r.id,
        workspace_id: r.tenantId,
        agent_id: r.agentId,
        version_number: r.versionNumber,
        config: (r as any).config || {},
        changelog: r.changelog || '',
        created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      }));
    });
  }

  async create(tenantId: string, version: AgentVersion): Promise<AgentVersion> {
    return await withTenantContext(tenantId, async (tx) => {
      const versionNum = typeof version.version_number === 'number'
        ? version.version_number
        : parseInt(String(version.version_number || '1'), 10) || 1;

      const [row] = await tx.insert(schema.agentVersions).values({
        id: version.id,
        tenantId,
        agentId: version.agent_id,
        versionNumber: versionNum,
        config: version.config || version.config_snapshot || {},
        changelog: version.changelog || version.change_summary || '',
        createdAt: version.created_at ? new Date(version.created_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.agentVersions.id,
        set: {
          config: version.config || version.config_snapshot || {},
          changelog: version.changelog || version.change_summary || '',
        }
      }).returning();

      return {
        id: row.id,
        workspace_id: row.tenantId,
        agent_id: row.agentId,
        version_number: row.versionNumber,
        config: row.config as any,
        changelog: row.changelog || '',
        created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }
}

// ==============================================================================
// 15. AGENT POLICIES REPOSITORY
// ==============================================================================
export class AgentPoliciesRepository {
  async findMany(tenantId: string, agentId?: string): Promise<AgentPolicy[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = agentId
        ? await tx.select().from(schema.agentPolicies).where(
            and(eq(schema.agentPolicies.tenantId, tenantId), eq(schema.agentPolicies.agentId, agentId))
          )
        : await tx.select().from(schema.agentPolicies).where(eq(schema.agentPolicies.tenantId, tenantId));

      return rows.map(r => ({
        id: r.id,
        workspace_id: r.tenantId,
        agent_id: r.agentId,
        policy_type: r.policyType,
        rule_definition: r.ruleDefinition as any,
        is_active: r.isActive,
        created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      }));
    });
  }

  async create(tenantId: string, policy: AgentPolicy): Promise<AgentPolicy> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.agentPolicies).values({
        id: policy.id,
        tenantId,
        agentId: policy.agent_id,
        policyType: policy.policy_type || policy.type || 'GUARDRAIL',
        ruleDefinition: policy.rule_definition || { condition: policy.condition, enforcement: policy.enforcement },
        isActive: policy.is_active ?? true,
        createdAt: policy.created_at ? new Date(policy.created_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.agentPolicies.id,
        set: {
          policyType: policy.policy_type || policy.type || 'GUARDRAIL',
          ruleDefinition: policy.rule_definition || { condition: policy.condition, enforcement: policy.enforcement },
          isActive: policy.is_active ?? true,
        }
      }).returning();

      return {
        id: row.id,
        workspace_id: row.tenantId,
        agent_id: row.agentId,
        policy_type: row.policyType,
        rule_definition: row.ruleDefinition as any,
        is_active: row.isActive,
        created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }
}

// ==============================================================================
// 16. TOOLS & TOOL PERMISSIONS REPOSITORY
// ==============================================================================
export class ToolsRepository {
  async findMany(tenantId: string): Promise<Tool[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.tools).where(eq(schema.tools.tenantId, tenantId));
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        category: (r.category as any) || 'CATALOG',
        description: r.description || '',
        risk_level: 'LOW',
        input_schema: {},
        output_schema: {},
      }));
    });
  }

  async create(tenantId: string, tool: Tool): Promise<Tool> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.tools).values({
        id: tool.id,
        tenantId,
        name: tool.name,
        category: tool.category || 'commerce',
        description: tool.description || '',
        isEnabled: true,
        createdAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.tools.id,
        set: {
          name: tool.name,
          category: tool.category || 'commerce',
          description: tool.description || '',
          isEnabled: true,
        }
      }).returning();

      return {
        id: row.id,
        name: row.name,
        category: (row.category as any) || 'CATALOG',
        description: row.description || '',
        risk_level: 'LOW',
        input_schema: {},
        output_schema: {},
      };
    });
  }
}

export class ToolPermissionsRepository {
  async findMany(tenantId: string, agentId?: string): Promise<ToolPermission[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = agentId
        ? await tx.select().from(schema.toolPermissions).where(
            and(eq(schema.toolPermissions.tenantId, tenantId), eq(schema.toolPermissions.agentId, agentId))
          )
        : await tx.select().from(schema.toolPermissions).where(eq(schema.toolPermissions.tenantId, tenantId));

      return rows.map(r => ({
        id: r.id,
        agent_id: r.agentId,
        tool_id: r.toolId,
        is_enabled: r.isEnabled,
        permission_mode: r.permissionMode as any,
      }));
    });
  }

  async create(tenantId: string, perm: ToolPermission): Promise<ToolPermission> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.toolPermissions).values({
        id: perm.id,
        tenantId,
        agentId: perm.agent_id,
        toolId: perm.tool_id,
        isEnabled: perm.is_enabled ?? true,
        permissionMode: perm.permission_mode || 'ALLOWED',
        createdAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.toolPermissions.id,
        set: {
          isEnabled: perm.is_enabled ?? true,
          permissionMode: perm.permission_mode || 'ALLOWED',
        }
      }).returning();

      return {
        id: row.id,
        agent_id: row.agentId,
        tool_id: row.toolId,
        is_enabled: row.isEnabled,
        permission_mode: row.permissionMode as any,
      };
    });
  }
}

// ==============================================================================
// 17. EXECUTIONS REPOSITORY
// ==============================================================================
export class ExecutionsRepository {
  async findMany(tenantId: string, conversationId?: string): Promise<ExecutionTrace[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = conversationId
        ? await tx.select().from(schema.executionTraces).where(
            and(eq(schema.executionTraces.tenantId, tenantId), eq(schema.executionTraces.conversationId, conversationId))
          ).orderBy(desc(schema.executionTraces.createdAt))
        : await tx.select().from(schema.executionTraces).where(
            eq(schema.executionTraces.tenantId, tenantId)
          ).orderBy(desc(schema.executionTraces.createdAt));

      return rows.map(r => ({
        id: r.id,
        workspace_id: r.tenantId,
        agent_id: r.agentId,
        conversation_id: r.conversationId || undefined,
        duration_ms: r.durationMs,
        rag_steps_executed: r.ragStepsExecuted,
        tools_called: (r.toolsCalled as any) || [],
        status: r.status as any,
        trace_log: (r.traceLog as any) || {},
        created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      }));
    });
  }

  async create(tenantId: string, trace: ExecutionTrace): Promise<ExecutionTrace> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.executionTraces).values({
        id: trace.id,
        tenantId,
        agentId: trace.agent_id,
        conversationId: trace.conversation_id || null,
        durationMs: trace.duration_ms || trace.latency_ms || 0,
        ragStepsExecuted: trace.rag_steps_executed || 0,
        toolsCalled: trace.tools_called || trace.tool_executions || [],
        status: trace.status || 'SUCCESS',
        traceLog: trace.trace_log || { intent: trace.intent, goal: trace.goal },
        createdAt: trace.created_at ? new Date(trace.created_at) : new Date(),
      }).returning();

      return {
        id: row.id,
        workspace_id: row.tenantId,
        agent_id: row.agentId,
        conversation_id: row.conversationId || undefined,
        duration_ms: row.durationMs,
        rag_steps_executed: row.ragStepsExecuted,
        tools_called: (row.toolsCalled as any) || [],
        status: row.status as any,
        trace_log: (row.traceLog as any) || {},
        created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }
}

// ==============================================================================
// 18. EVALUATION CASES & RUNS REPOSITORIES
// ==============================================================================
export class EvaluationCasesRepository {
  async findMany(tenantId: string, agentId?: string): Promise<EvaluationCase[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = agentId
        ? await tx.select().from(schema.evaluationCases).where(
            and(eq(schema.evaluationCases.tenantId, tenantId), eq(schema.evaluationCases.agentId, agentId))
          )
        : await tx.select().from(schema.evaluationCases).where(eq(schema.evaluationCases.tenantId, tenantId));

      return rows.map(r => ({
        id: r.id,
        workspace_id: r.tenantId,
        agent_id: r.agentId,
        name: r.name,
        user_input: r.userInput,
        expected_intent: r.expectedIntent,
        expected_tools: (r.expectedTools as any) || [],
        expected_keywords: (r.expectedKeywords as any) || [],
        created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      }));
    });
  }

  async create(tenantId: string, c: EvaluationCase): Promise<EvaluationCase> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.evaluationCases).values({
        id: c.id,
        tenantId,
        agentId: c.agent_id,
        name: c.name,
        userInput: c.user_input,
        expectedIntent: c.expected_intent,
        expectedTools: c.expected_tools || [],
        expectedKeywords: c.expected_keywords || [],
        createdAt: c.created_at ? new Date(c.created_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.evaluationCases.id,
        set: {
          name: c.name,
          userInput: c.user_input,
          expectedIntent: c.expected_intent,
          expectedTools: c.expected_tools || [],
          expectedKeywords: c.expected_keywords || [],
        }
      }).returning();

      return {
        id: row.id,
        workspace_id: row.tenantId,
        agent_id: row.agentId,
        name: row.name,
        user_input: row.userInput,
        expected_intent: row.expectedIntent,
        expected_tools: (row.expectedTools as any) || [],
        expected_keywords: (row.expectedKeywords as any) || [],
        created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }
}

export class EvaluationRunsRepository {
  async findMany(tenantId: string, agentId?: string): Promise<EvaluationRun[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = agentId
        ? await tx.select().from(schema.evaluationRuns).where(
            and(eq(schema.evaluationRuns.tenantId, tenantId), eq(schema.evaluationRuns.agentId, agentId))
          ).orderBy(desc(schema.evaluationRuns.createdAt))
        : await tx.select().from(schema.evaluationRuns).where(
            eq(schema.evaluationRuns.tenantId, tenantId)
          ).orderBy(desc(schema.evaluationRuns.createdAt));

      return rows.map(r => ({
        id: r.id,
        workspace_id: r.tenantId,
        agent_id: r.agentId,
        case_id: r.caseId || undefined,
        passed: r.passed,
        score: r.score,
        latency_ms: r.latencyMs,
        actual_output: r.actualOutput || undefined,
        created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      }));
    });
  }

  async create(tenantId: string, run: EvaluationRun): Promise<EvaluationRun> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.evaluationRuns).values({
        id: run.id,
        tenantId,
        agentId: run.agent_id,
        caseId: run.case_id || null,
        passed: run.passed ?? false,
        score: run.score ?? 0,
        latencyMs: run.latency_ms ?? 0,
        actualOutput: run.actual_output || null,
        createdAt: run.created_at ? new Date(run.created_at) : new Date(),
      }).returning();

      return {
        id: row.id,
        workspace_id: row.tenantId,
        agent_id: row.agentId,
        case_id: row.caseId || undefined,
        passed: row.passed,
        score: row.score,
        latency_ms: row.latencyMs,
        actual_output: row.actualOutput || undefined,
        created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }
}

// ==============================================================================
// 19. WORKSPACE INTEGRATIONS & SYNC JOBS REPOSITORY
// ==============================================================================
export class WorkspaceIntegrationsRepository {
  async findMany(tenantId: string): Promise<WorkspaceIntegration[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.workspaceIntegrations).where(eq(schema.workspaceIntegrations.tenantId, tenantId));
      return rows.map(r => this.mapIntegration(r));
    });
  }

  async findByProvider(tenantId: string, provider: string): Promise<WorkspaceIntegration | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.workspaceIntegrations).where(
        and(eq(schema.workspaceIntegrations.tenantId, tenantId), eq(schema.workspaceIntegrations.provider, provider))
      ).limit(1);
      return rows.length > 0 ? this.mapIntegration(rows[0]) : null;
    });
  }

  async findById(tenantId: string, id: string): Promise<WorkspaceIntegration | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.workspaceIntegrations).where(
        and(eq(schema.workspaceIntegrations.tenantId, tenantId), eq(schema.workspaceIntegrations.id, id))
      ).limit(1);
      return rows.length > 0 ? this.mapIntegration(rows[0]) : null;
    });
  }

  async create(tenantId: string, item: WorkspaceIntegration): Promise<WorkspaceIntegration> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.workspaceIntegrations).values({
        id: item.id,
        tenantId,
        provider: item.provider,
        status: item.status || 'CONNECTED',
        configJson: item.config || {},
        createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
      }).onConflictDoUpdate({
        target: schema.workspaceIntegrations.id,
        set: {
          status: item.status || 'CONNECTED',
          configJson: item.config || {},
          updatedAt: new Date(),
        }
      }).returning();
      return this.mapIntegration(row);
    });
  }

  async update(tenantId: string, id: string, updates: Partial<WorkspaceIntegration>): Promise<WorkspaceIntegration | null> {
    return await withTenantContext(tenantId, async (tx) => {
      const dbUpdates: any = { updatedAt: new Date() };
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.config !== undefined) dbUpdates.configJson = updates.config;
      const [row] = await tx.update(schema.workspaceIntegrations).set(dbUpdates).where(
        and(eq(schema.workspaceIntegrations.tenantId, tenantId), eq(schema.workspaceIntegrations.id, id))
      ).returning();
      return row ? this.mapIntegration(row) : null;
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return await withTenantContext(tenantId, async (tx) => {
      const res = await tx.delete(schema.workspaceIntegrations).where(
        and(eq(schema.workspaceIntegrations.tenantId, tenantId), eq(schema.workspaceIntegrations.id, id))
      ).returning();
      return res.length > 0;
    });
  }

  private mapIntegration(row: any): WorkspaceIntegration {
    return {
      id: row.id,
      workspace_id: row.tenantId,
      integration_id: row.provider.toLowerCase(),
      provider: row.provider,
      name: row.provider,
      status: row.status as any,
      config: row.configJson || {},
      created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export class IntegrationSyncJobsRepository {
  async findMany(tenantId: string, integrationId?: string): Promise<IntegrationSyncJob[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = integrationId
        ? await tx.select().from(schema.integrationSyncJobs).where(
            and(eq(schema.integrationSyncJobs.tenantId, tenantId), eq(schema.integrationSyncJobs.integrationId, integrationId))
          ).orderBy(desc(schema.integrationSyncJobs.startedAt))
        : await tx.select().from(schema.integrationSyncJobs).where(
            eq(schema.integrationSyncJobs.tenantId, tenantId)
          ).orderBy(desc(schema.integrationSyncJobs.startedAt));

      return rows.map(r => ({
        id: r.id,
        workspace_id: r.tenantId,
        integration_id: r.integrationId,
        status: r.status as any,
        progress: 100,
        records_synced: r.recordsSynced,
        created_at: r.startedAt ? r.startedAt.toISOString() : new Date().toISOString(),
        completed_at: r.completedAt ? r.completedAt.toISOString() : undefined,
      }));
    });
  }

  async create(tenantId: string, job: IntegrationSyncJob): Promise<IntegrationSyncJob> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.integrationSyncJobs).values({
        id: job.id,
        tenantId,
        integrationId: job.integration_id,
        status: job.status || 'COMPLETED',
        recordsSynced: job.items_synced || 0,
        startedAt: job.created_at ? new Date(job.created_at) : new Date(),
        completedAt: job.completed_at ? new Date(job.completed_at) : null,
      }).returning();

      return {
        id: row.id,
        workspace_id: row.tenantId,
        integration_id: row.integrationId,
        status: row.status as any,
        progress: 100,
        records_synced: row.recordsSynced,
        created_at: row.startedAt ? row.startedAt.toISOString() : new Date().toISOString(),
        completed_at: row.completedAt ? row.completedAt.toISOString() : undefined,
      };
    });
  }
}

// ==============================================================================
// 20. WEBHOOK DELIVERIES REPOSITORY
// ==============================================================================
export class WebhookDeliveriesRepository {
  async findMany(tenantId: string, webhookId?: string): Promise<WebhookDelivery[]> {
    return await withTenantContext(tenantId, async (tx) => {
      const rows = webhookId
        ? await tx.select().from(schema.webhookDeliveries).where(
            and(eq(schema.webhookDeliveries.tenantId, tenantId), eq(schema.webhookDeliveries.webhookId, webhookId))
          ).orderBy(desc(schema.webhookDeliveries.createdAt))
        : await tx.select().from(schema.webhookDeliveries).where(
            eq(schema.webhookDeliveries.tenantId, tenantId)
          ).orderBy(desc(schema.webhookDeliveries.createdAt));

      return rows.map(r => ({
        id: r.id,
        workspace_id: r.tenantId,
        webhook_id: r.webhookId,
        event: r.eventType,
        event_type: r.eventType,
        payload: r.payload || {},
        response_code: r.responseCode || undefined,
        status_code: r.responseCode || undefined,
        success: r.success,
        delivery_status: r.success ? 'SUCCESS' : 'FAILED',
        created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      }));
    });
  }

  async create(tenantId: string, delivery: WebhookDelivery): Promise<WebhookDelivery> {
    return await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.webhookDeliveries).values({
        id: delivery.id,
        tenantId,
        webhookId: delivery.webhook_id,
        eventType: delivery.event_type || delivery.event || 'unknown',
        payload: delivery.payload || {},
        responseCode: delivery.response_code || delivery.status_code || null,
        success: delivery.success ?? (delivery.delivery_status === 'SUCCESS'),
        createdAt: delivery.created_at ? new Date(delivery.created_at) : new Date(),
      }).returning();

      return {
        id: row.id,
        workspace_id: row.tenantId,
        webhook_id: row.webhookId,
        event: row.eventType,
        event_type: row.eventType,
        payload: row.payload || {},
        response_code: row.responseCode || undefined,
        status_code: row.responseCode || undefined,
        success: row.success,
        delivery_status: row.success ? 'SUCCESS' : 'FAILED',
        created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }
}

// ==============================================================================
// 21. EXPORT REPOSITORIES SINGLETON
// ==============================================================================
const usersRepo = new UsersRepository();
const workspacesRepo = new WorkspacesRepository();
const workspaceMembersRepo = new WorkspaceMembersRepository();
const agentsRepo = new AgentsRepository();
const agentConfigsRepo = new AgentConfigsRepository();
const agentVersionsRepo = new AgentVersionsRepository();
const agentPoliciesRepo = new AgentPoliciesRepository();
const toolsRepo = new ToolsRepository();
const toolPermissionsRepo = new ToolPermissionsRepository();
const commerceProductsRepo = new CommerceProductsRepository();
const commerceOrdersRepo = new CommerceOrdersRepository();
const commerceCartsRepo = new CommerceCartsRepository();
const knowledgeSourcesRepo = new KnowledgeSourcesRepository();
const knowledgeDocumentsRepo = new KnowledgeDocumentsRepository();
const knowledgeChunksRepo = new KnowledgeChunksRepository();
const conversationsRepo = new ConversationsRepository();
const messagesRepo = new MessagesRepository();
const executionsRepo = new ExecutionsRepository();
const deploymentsRepo = new DeploymentsRepository();
const apiKeysRepo = new ApiKeysRepository();
const webhooksRepo = new WebhooksRepository();
const webhookDeliveriesRepo = new WebhookDeliveriesRepository();
const evaluationCasesRepo = new EvaluationCasesRepository();
const evaluationRunsRepo = new EvaluationRunsRepository();
const processedWebhookEventsRepo = new ProcessedWebhookEventsRepository();
const auditLogsRepo = new AuditLogsRepository();
const usageEventsRepo = new UsageEventsRepository();
const workspaceIntegrationsRepo = new WorkspaceIntegrationsRepository();
const integrationSyncJobsRepo = new IntegrationSyncJobsRepository();

export const repositories = {
  // CamelCase
  users: usersRepo,
  workspaces: workspacesRepo,
  workspaceMembers: workspaceMembersRepo,
  agents: agentsRepo,
  agentConfigs: agentConfigsRepo,
  agentVersions: agentVersionsRepo,
  agentPolicies: agentPoliciesRepo,
  tools: toolsRepo,
  toolPermissions: toolPermissionsRepo,
  commerceProducts: commerceProductsRepo,
  commerceOrders: commerceOrdersRepo,
  commerceCarts: commerceCartsRepo,
  knowledgeSources: knowledgeSourcesRepo,
  knowledgeDocuments: knowledgeDocumentsRepo,
  knowledgeChunks: knowledgeChunksRepo,
  conversations: conversationsRepo,
  messages: messagesRepo,
  executions: executionsRepo,
  deployments: deploymentsRepo,
  apiKeys: apiKeysRepo,
  webhooks: webhooksRepo,
  webhookDeliveries: webhookDeliveriesRepo,
  evaluationCases: evaluationCasesRepo,
  evaluationRuns: evaluationRunsRepo,
  processedWebhookEvents: processedWebhookEventsRepo,
  auditLogs: auditLogsRepo,
  usageEvents: usageEventsRepo,
  workspaceIntegrations: workspaceIntegrationsRepo,
  integrationSyncJobs: integrationSyncJobsRepo,

  // Snake_case aliases for seamless DB parity
  workspace_members: workspaceMembersRepo,
  agent_configs: agentConfigsRepo,
  agent_versions: agentVersionsRepo,
  agent_policies: agentPoliciesRepo,
  tool_permissions: toolPermissionsRepo,
  commerce_products: commerceProductsRepo,
  commerce_orders: commerceOrdersRepo,
  commerce_carts: commerceCartsRepo,
  knowledge_sources: knowledgeSourcesRepo,
  knowledge_documents: knowledgeDocumentsRepo,
  knowledge_chunks: knowledgeChunksRepo,
  execution_traces: executionsRepo,
  api_keys: apiKeysRepo,
  webhook_deliveries: webhookDeliveriesRepo,
  evaluation_cases: evaluationCasesRepo,
  evaluation_runs: evaluationRunsRepo,
  processed_webhook_events: processedWebhookEventsRepo,
  audit_logs: auditLogsRepo,
  usage_events: usageEventsRepo,
  workspace_integrations: workspaceIntegrationsRepo,
  integration_sync_jobs: integrationSyncJobsRepo,
};

