import { 
  pgTable, text, varchar, integer, doublePrecision, boolean, timestamp, jsonb, index, uniqueIndex 
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ==============================================================================
// 1. WORKSPACES & IDENTITY
// ==============================================================================

export const workspaces = pgTable('workspaces', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  tier: varchar('tier', { length: 50 }).notNull().default('ENTERPRISE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_workspaces_id').on(table.id),
  uniqueIndex('ix_workspaces_slug').on(table.slug),
]);

export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('ADMIN'),
  passwordHash: text('password_hash'),
  mfaSecret: varchar('mfa_secret', { length: 255 }),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_users_id').on(table.id),
  uniqueIndex('ix_users_email').on(table.email),
]);

export const workspaceMembers = pgTable('workspace_members', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('OWNER'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_workspace_members_tenant_id').on(table.tenantId),
  index('ix_workspace_members_user_id').on(table.userId),
  index('ix_workspace_members_tenant_user').on(table.tenantId, table.userId),
]);

// ==============================================================================
// 2. AGENTS & RUNTIME CONFIGURATION
// ==============================================================================

export const agents = pgTable('agents', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_agents_tenant_id').on(table.tenantId),
]);

export const agentConfigs = pgTable('agent_configs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull().unique().references(() => agents.id, { onDelete: 'cascade' }),
  model: varchar('model', { length: 100 }).notNull().default('sarvam-105b-conversations'),
  temperature: doublePrecision('temperature').notNull().default(0.7),
  maxTokens: integer('max_tokens').notNull().default(2048),
  systemPrompt: text('system_prompt').notNull(),
  tools: jsonb('tools').notNull().default(sql`'[]'::jsonb`),
  guardrails: jsonb('guardrails').notNull().default(sql`'{}'::jsonb`),
  ragEnabled: boolean('rag_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_agent_configs_tenant_id').on(table.tenantId),
  index('ix_agent_configs_agent_id').on(table.agentId),
]);

export const agentVersions = pgTable('agent_versions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull().references(() => agents.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull().default(1),
  config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
  changelog: text('changelog'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_agent_versions_tenant_id').on(table.tenantId),
]);

export const agentPolicies = pgTable('agent_policies', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull().references(() => agents.id, { onDelete: 'cascade' }),
  policyType: varchar('policy_type', { length: 50 }).notNull().default('GUARDRAIL'),
  ruleDefinition: jsonb('rule_definition').notNull().default(sql`'{}'::jsonb`),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_agent_policies_tenant_id').on(table.tenantId),
]);

// ==============================================================================
// 3. KNOWLEDGE & RAG
// ==============================================================================

export const knowledgeSources = pgTable('knowledge_sources', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('DOCUMENTS'),
  status: varchar('status', { length: 50 }).notNull().default('INDEXED'),
  config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
  documentCount: integer('document_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_knowledge_sources_tenant_id').on(table.tenantId),
]);

export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceId: varchar('source_id', { length: 64 }).notNull().references(() => knowledgeSources.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  metadataJson: jsonb('metadata_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_knowledge_documents_tenant_id').on(table.tenantId),
  index('ix_knowledge_documents_source_id').on(table.sourceId),
]);

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  docId: varchar('doc_id', { length: 64 }).notNull().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull().default(0),
  text: text('text').notNull(),
  embedding: jsonb('embedding'), // JSON array of floats or pgvector
  metadataJson: jsonb('metadata_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_knowledge_chunks_tenant_id').on(table.tenantId),
  index('ix_knowledge_chunks_doc_id').on(table.docId),
  index('ix_knowledge_chunks_tenant_doc').on(table.tenantId, table.docId),
]);

// ==============================================================================
// 4. COMMERCE (Products, Orders, Carts)
// ==============================================================================

export const commerceProducts = pgTable('commerce_products', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  handle: varchar('handle', { length: 255 }),
  description: text('description'),
  price: doublePrecision('price').notNull(),
  compareAtPrice: doublePrecision('compare_at_price'),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  category: varchar('category', { length: 100 }).notNull().default('General'),
  tags: jsonb('tags').notNull().default(sql`'[]'::jsonb`),
  images: jsonb('images').notNull().default(sql`'[]'::jsonb`),
  inStock: boolean('in_stock').notNull().default(true),
  stock: integer('stock').notNull().default(10),
  variants: jsonb('variants').notNull().default(sql`'[]'::jsonb`),
  attributes: jsonb('attributes').notNull().default(sql`'{}'::jsonb`),
  sourceUrl: text('source_url'),
  embedding: jsonb('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_commerce_products_tenant_id').on(table.tenantId),
  index('ix_commerce_products_title').on(table.title),
  index('ix_commerce_products_tenant_category').on(table.tenantId, table.category),
  index('ix_commerce_products_tenant_price').on(table.tenantId, table.price),
]);

export const commerceOrders = pgTable('commerce_orders', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  orderNumber: varchar('order_number', { length: 64 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  totalAmount: doublePrecision('total_amount').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  financialStatus: varchar('financial_status', { length: 50 }).notNull().default('PAID'),
  fulfillmentStatus: varchar('fulfillment_status', { length: 50 }).notNull().default('UNFULFILLED'),
  itemsJson: jsonb('items_json').notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_commerce_orders_tenant_id').on(table.tenantId),
  index('ix_commerce_orders_tenant_email').on(table.tenantId, table.customerEmail),
  index('ix_commerce_orders_tenant_number').on(table.tenantId, table.orderNumber),
]);

export const commerceCarts = pgTable('commerce_carts', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 128 }).notNull().unique(),
  itemsJson: jsonb('items_json').notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_commerce_carts_tenant_id').on(table.tenantId),
]);

// ==============================================================================
// 5. CONVERSATIONS & EXECUTION TRACES
// ==============================================================================

export const conversations = pgTable('conversations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull().references(() => agents.id, { onDelete: 'cascade' }),
  customerId: varchar('customer_id', { length: 64 }),
  channel: varchar('channel', { length: 50 }).notNull().default('WEBSITE'),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
  metadataJson: jsonb('metadata_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_conversations_tenant_id').on(table.tenantId),
]);

export const messages = pgTable('messages', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  conversationId: varchar('conversation_id', { length: 64 }).notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  sender: varchar('sender', { length: 50 }).notNull(),
  content: text('content').notNull(),
  traceJson: jsonb('trace_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_messages_tenant_id').on(table.tenantId),
  index('ix_messages_conversation_id').on(table.conversationId),
]);

export const executionTraces = pgTable('execution_traces', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull(),
  conversationId: varchar('conversation_id', { length: 64 }),
  durationMs: doublePrecision('duration_ms').notNull().default(0),
  ragStepsExecuted: integer('rag_steps_executed').notNull().default(12),
  toolsCalled: jsonb('tools_called').notNull().default(sql`'[]'::jsonb`),
  status: varchar('status', { length: 50 }).notNull().default('SUCCESS'),
  traceLog: jsonb('trace_log').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_execution_traces_tenant_id').on(table.tenantId),
]);

// ==============================================================================
// 6. DEPLOYMENTS, API KEYS, WEBHOOKS & EVALUATIONS
// ==============================================================================

export const deployments = pgTable('deployments', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull(),
  environment: varchar('environment', { length: 50 }).notNull().default('PRODUCTION'),
  publicKey: varchar('public_key', { length: 128 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
  allowedDomains: jsonb('allowed_domains').notNull().default(sql`'[]'::jsonb`),
  config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_deployments_tenant_id').on(table.tenantId),
]);

export const apiKeys = pgTable('api_keys', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 32 }).notNull(),
  hashedKey: text('hashed_key').notNull(),
  permissions: jsonb('permissions').notNull().default(sql`'[]'::jsonb`),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_api_keys_tenant_id').on(table.tenantId),
]);

export const webhooks = pgTable('webhooks', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: jsonb('events').notNull().default(sql`'[]'::jsonb`),
  secret: varchar('secret', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_webhooks_tenant_id').on(table.tenantId),
]);

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  webhookId: varchar('webhook_id', { length: 64 }).notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
  responseCode: integer('response_code'),
  success: boolean('success').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_webhook_deliveries_tenant_id').on(table.tenantId),
]);

export const evaluationCases = pgTable('evaluation_cases', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull().references(() => agents.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  userInput: text('user_input').notNull(),
  expectedIntent: varchar('expected_intent', { length: 100 }).notNull(),
  expectedTools: jsonb('expected_tools').notNull().default(sql`'[]'::jsonb`),
  expectedKeywords: jsonb('expected_keywords').notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_evaluation_cases_tenant_id').on(table.tenantId),
]);

export const evaluationRuns = pgTable('evaluation_runs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull(),
  caseId: varchar('case_id', { length: 64 }).references(() => evaluationCases.id, { onDelete: 'cascade' }),
  passed: boolean('passed').notNull().default(false),
  score: doublePrecision('score').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  actualOutput: text('actual_output'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_evaluation_runs_tenant_id').on(table.tenantId),
]);

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 64 }),
  details: jsonb('details').notNull().default(sql`'{}'::jsonb`),
  ipAddress: varchar('ip_address', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_audit_logs_tenant_id').on(table.tenantId),
]);

export const processedWebhookEvents = pgTable('processed_webhook_events', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  provider: varchar('provider', { length: 50 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_processed_webhook_events_tenant_id').on(table.tenantId),
]);

export const tools = pgTable('tools', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }).notNull().default('commerce'),
  description: text('description'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_tools_tenant_id').on(table.tenantId),
]);

export const integrations = pgTable('integrations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('CONNECTED'),
  configJson: jsonb('config_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ix_integrations_tenant_id').on(table.tenantId),
]);
