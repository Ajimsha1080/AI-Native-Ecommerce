"""initial_schema_postgresql_pgvector_rls

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-14 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RLS_TABLES = [
    "workspace_members",
    "agents",
    "agent_configs",
    "agent_versions",
    "agent_policies",
    "knowledge_sources",
    "knowledge_documents",
    "knowledge_chunks",
    "commerce_products",
    "commerce_orders",
    "commerce_carts",
    "conversations",
    "messages",
    "execution_traces",
    "deployments",
    "api_keys",
    "webhooks",
    "webhook_deliveries",
    "evaluation_cases",
    "evaluation_runs",
    "audit_logs",
    "processed_webhook_events",
    "tools",
    "integrations",
]

def upgrade() -> None:
    # 0. PostgreSQL extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 1. Workspaces
    op.create_table(
        'workspaces',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False, unique=True),
        sa.Column('tier', sa.String(length=50), nullable=False, server_default='ENTERPRISE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_workspaces_id', 'workspaces', ['id'])
    op.create_index('ix_workspaces_slug', 'workspaces', ['slug'])

    # 2. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='ADMIN'),
        sa.Column('password_hash', sa.Text(), nullable=True),
        sa.Column('mfa_secret', sa.String(length=255), nullable=True),
        sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'])

    # 3. Workspace Members
    op.create_table(
        'workspace_members',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='OWNER'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_workspace_members_tenant_id', 'workspace_members', ['tenant_id'])
    op.create_index('ix_workspace_members_user_id', 'workspace_members', ['user_id'])
    op.create_index('ix_workspace_members_tenant_user', 'workspace_members', ['tenant_id', 'user_id'])

    # 4. Agents
    op.create_table(
        'agents',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_agents_tenant_id', 'agents', ['tenant_id'])

    # 5. Agent Configs
    op.create_table(
        'agent_configs',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('model', sa.String(length=100), nullable=False, server_default='sarvam-105b-conversations'),
        sa.Column('temperature', sa.Float(), nullable=False, server_default='0.7'),
        sa.Column('max_tokens', sa.Integer(), nullable=False, server_default='2048'),
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('tools', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('guardrails', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('rag_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_agent_configs_tenant_id', 'agent_configs', ['tenant_id'])
    op.create_index('ix_agent_configs_agent_id', 'agent_configs', ['agent_id'])

    # 6. Agent Versions
    op.create_table(
        'agent_versions',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('config', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('changelog', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_agent_versions_tenant_id', 'agent_versions', ['tenant_id'])

    # 7. Agent Policies
    op.create_table(
        'agent_policies',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('policy_type', sa.String(length=50), nullable=False, server_default='GUARDRAIL'),
        sa.Column('rule_definition', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_agent_policies_tenant_id', 'agent_policies', ['tenant_id'])

    # 8. Knowledge Sources
    op.create_table(
        'knowledge_sources',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False, server_default='DOCUMENTS'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='INDEXED'),
        sa.Column('config', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('document_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_knowledge_sources_tenant_id', 'knowledge_sources', ['tenant_id'])

    # 9. Knowledge Documents
    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_id', sa.String(length=64), sa.ForeignKey('knowledge_sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_knowledge_documents_tenant_id', 'knowledge_documents', ['tenant_id'])
    op.create_index('ix_knowledge_documents_source_id', 'knowledge_documents', ['source_id'])

    # 10. Knowledge Chunks
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doc_id', sa.String(length=64), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('embedding', sa.JSON(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_knowledge_chunks_tenant_id', 'knowledge_chunks', ['tenant_id'])
    op.create_index('ix_knowledge_chunks_doc_id', 'knowledge_chunks', ['doc_id'])
    op.create_index('ix_knowledge_chunks_tenant_doc', 'knowledge_chunks', ['tenant_id', 'doc_id'])

    # 11. Commerce Products
    op.create_table(
        'commerce_products',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('handle', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('compare_at_price', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='General'),
        sa.Column('tags', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('images', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('in_stock', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('stock', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('variants', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('attributes', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('embedding', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_commerce_products_tenant_id', 'commerce_products', ['tenant_id'])
    op.create_index('ix_commerce_products_title', 'commerce_products', ['title'])
    op.create_index('ix_commerce_products_tenant_category', 'commerce_products', ['tenant_id', 'category'])
    op.create_index('ix_commerce_products_tenant_price', 'commerce_products', ['tenant_id', 'price'])

    # 12. Commerce Orders
    op.create_table(
        'commerce_orders',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('order_number', sa.String(length=64), nullable=False),
        sa.Column('customer_name', sa.String(length=255), nullable=True),
        sa.Column('customer_email', sa.String(length=255), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('financial_status', sa.String(length=50), nullable=False, server_default='PAID'),
        sa.Column('fulfillment_status', sa.String(length=50), nullable=False, server_default='UNFULFILLED'),
        sa.Column('items_json', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_commerce_orders_tenant_id', 'commerce_orders', ['tenant_id'])
    op.create_index('ix_commerce_orders_tenant_email', 'commerce_orders', ['tenant_id', 'customer_email'])
    op.create_index('ix_commerce_orders_tenant_number', 'commerce_orders', ['tenant_id', 'order_number'])

    # 13. Commerce Carts
    op.create_table(
        'commerce_carts',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', sa.String(length=128), nullable=False, unique=True),
        sa.Column('items_json', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_commerce_carts_tenant_id', 'commerce_carts', ['tenant_id'])

    # 14. Conversations
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', sa.String(length=64), nullable=True),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='WEBSITE'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_conversations_tenant_id', 'conversations', ['tenant_id'])

    # 15. Messages
    op.create_table(
        'messages',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('conversation_id', sa.String(length=64), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('trace_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_messages_tenant_id', 'messages', ['tenant_id'])
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])

    # 16. Execution Traces
    op.create_table(
        'execution_traces',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), nullable=False),
        sa.Column('conversation_id', sa.String(length=64), nullable=True),
        sa.Column('duration_ms', sa.Float(), nullable=False, server_default='0'),
        sa.Column('rag_steps_executed', sa.Integer(), nullable=False, server_default='12'),
        sa.Column('tools_called', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='SUCCESS'),
        sa.Column('trace_log', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_execution_traces_tenant_id', 'execution_traces', ['tenant_id'])

    # 17. Deployments
    op.create_table(
        'deployments',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), nullable=False),
        sa.Column('environment', sa.String(length=50), nullable=False, server_default='PRODUCTION'),
        sa.Column('public_key', sa.String(length=128), nullable=False, unique=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('allowed_domains', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('config', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_deployments_tenant_id', 'deployments', ['tenant_id'])

    # 18. API Keys
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('key_prefix', sa.String(length=32), nullable=False),
        sa.Column('hashed_key', sa.Text(), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_api_keys_tenant_id', 'api_keys', ['tenant_id'])

    # 19. Webhooks
    op.create_table(
        'webhooks',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('events', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('secret', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_webhooks_tenant_id', 'webhooks', ['tenant_id'])

    # 20. Webhook Deliveries
    op.create_table(
        'webhook_deliveries',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('webhook_id', sa.String(length=64), sa.ForeignKey('webhooks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('response_code', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_webhook_deliveries_tenant_id', 'webhook_deliveries', ['tenant_id'])

    # 21. Evaluation Cases
    op.create_table(
        'evaluation_cases',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('user_input', sa.Text(), nullable=False),
        sa.Column('expected_intent', sa.String(length=100), nullable=False),
        sa.Column('expected_tools', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('expected_keywords', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_evaluation_cases_tenant_id', 'evaluation_cases', ['tenant_id'])

    # 22. Evaluation Runs
    op.create_table(
        'evaluation_runs',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), nullable=False),
        sa.Column('case_id', sa.String(length=64), sa.ForeignKey('evaluation_cases.id', ondelete='CASCADE'), nullable=True),
        sa.Column('passed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('score', sa.Float(), nullable=False, server_default='0'),
        sa.Column('latency_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('actual_output', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_evaluation_runs_tenant_id', 'evaluation_runs', ['tenant_id'])

    # 23. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=64), nullable=True),
        sa.Column('details', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_audit_logs_tenant_id', 'audit_logs', ['tenant_id'])

    # 24. Processed Webhook Events
    op.create_table(
        'processed_webhook_events',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), nullable=False),
        sa.Column('event_id', sa.String(length=255), nullable=False, unique=True),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_processed_webhook_events_tenant_id', 'processed_webhook_events', ['tenant_id'])

    # 25. Tools
    op.create_table(
        'tools',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='commerce'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_tools_tenant_id', 'tools', ['tenant_id'])

    # 26. Integrations
    op.create_table(
        'integrations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='CONNECTED'),
        sa.Column('config_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_integrations_tenant_id', 'integrations', ['tenant_id'])

    # 27. Enable PostgreSQL Row-Level Security on all tenant tables
    for tbl in RLS_TABLES:
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY;")
        policy_name = f"{tbl}_tenant_isolation"
        if tbl == "api_keys":
            op.execute(
                f"CREATE POLICY {policy_name} ON {tbl} "
                f"FOR ALL USING (tenant_id = current_setting('app.current_tenant', true) OR current_setting('app.allow_key_lookup', true) = 'true') "
                f"WITH CHECK (tenant_id = current_setting('app.current_tenant', true));"
            )
        else:
            op.execute(
                f"CREATE POLICY {policy_name} ON {tbl} "
                f"FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)) "
                f"WITH CHECK (tenant_id = current_setting('app.current_tenant', true));"
            )


def downgrade() -> None:
    for tbl in reversed(RLS_TABLES):
        op.execute(f"DROP POLICY IF EXISTS {tbl}_tenant_isolation ON {tbl};")
        op.drop_table(tbl)
    op.drop_table('users')
    op.drop_table('workspaces')
