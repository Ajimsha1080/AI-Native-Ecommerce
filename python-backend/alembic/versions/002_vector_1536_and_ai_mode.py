"""vector_1536_and_ai_mode_tables

Revision ID: 002_vector_1536_ai_mode
Revises: 001_initial_schema
Create Date: 2026-10-14 02:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '002_vector_1536_ai_mode'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_RLS_TABLES = [
    "ai_mode_configs",
    "ai_mode_knowledge_sources",
    "ai_mode_deployments",
    "ai_mode_conversations",
    "usage_events",
    "tool_permissions",
    "workspace_integrations",
    "integration_sync_jobs",
]

def upgrade() -> None:
    # 1a. Update embedding column in knowledge_chunks to vector(1536) with HNSW index
    op.execute("ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(1536) USING NULL;")
    op.execute("CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);")

    # 1b. Update embedding column in commerce_products to vector(1536) with HNSW index
    op.execute("ALTER TABLE commerce_products ALTER COLUMN embedding TYPE vector(1536) USING NULL;")
    op.execute("CREATE INDEX IF NOT EXISTS ix_commerce_products_embedding ON commerce_products USING hnsw (embedding vector_cosine_ops);")

    # 2. Tool Permissions table
    op.create_table(
        'tool_permissions',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(length=64), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tool_id', sa.String(length=64), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('permission_mode', sa.String(length=50), nullable=False, server_default='ALLOWED'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tenant_id', 'tool_id'], ['tools.tenant_id', 'tools.id'], ondelete='CASCADE')
    )
    op.create_index('ix_tool_permissions_tenant_id', 'tool_permissions', ['tenant_id'])
    op.create_index('ix_tool_permissions_agent_id', 'tool_permissions', ['agent_id'])

    # 3. Usage Events table
    op.create_table(
        'usage_events',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_usage_events_tenant_id', 'usage_events', ['tenant_id'])
    op.create_index('ix_usage_events_timestamp', 'usage_events', ['timestamp'])

    # 4. Workspace Integrations
    op.create_table(
        'workspace_integrations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='CONNECTED'),
        sa.Column('config_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_ws_integrations_tenant_id', 'workspace_integrations', ['tenant_id'])

    # 5. Integration Sync Jobs
    op.create_table(
        'integration_sync_jobs',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('integration_id', sa.String(length=64), sa.ForeignKey('workspace_integrations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='COMPLETED'),
        sa.Column('records_synced', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_sync_jobs_tenant_id', 'integration_sync_jobs', ['tenant_id'])

    # 6. AI Mode Configs
    op.create_table(
        'ai_mode_configs',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('model_provider', sa.String(length=50), nullable=False, server_default='sarvam'),
        sa.Column('model_name', sa.String(length=100), nullable=False, server_default='sarvam-105b-conversations'),
        sa.Column('api_key', sa.Text(), nullable=True),
        sa.Column('temperature', sa.Float(), nullable=False, server_default='0.7'),
        sa.Column('retrieval_threshold', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('max_search_results', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('enable_recommendations', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('enable_comparisons', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('enable_cart_actions', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('system_instructions', sa.Text(), nullable=False, server_default='You are an enterprise AI commerce concierge.'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_ai_mode_configs_tenant_id', 'ai_mode_configs', ['tenant_id'])

    # 7. AI Mode Knowledge Sources
    op.create_table(
        'ai_mode_knowledge_sources',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False, server_default='DOCUMENT'),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='IDLE'),
        sa.Column('document_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('product_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('raw_content', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_ai_mode_ks_tenant_id', 'ai_mode_knowledge_sources', ['tenant_id'])

    # 8. AI Mode Deployments
    op.create_table(
        'ai_mode_deployments',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='LIVE'),
        sa.Column('allowed_domains', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('theme_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('branding_json', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('embed_code', sa.Text(), nullable=False, server_default=''),
        sa.Column('total_conversations', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_product_clicks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_ai_mode_dep_tenant_id', 'ai_mode_deployments', ['tenant_id'])

    # 9. AI Mode Conversations
    op.create_table(
        'ai_mode_conversations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('messages_json', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('last_search_state', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_ai_mode_conv_tenant_id', 'ai_mode_conversations', ['tenant_id'])

    # 10. Enable and Force RLS on all new tables
    for tbl in NEW_RLS_TABLES:
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY;")
        policy_name = f"{tbl}_tenant_isolation"
        op.execute(
            f"CREATE POLICY {policy_name} ON {tbl} "
            f"FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)) "
            f"WITH CHECK (tenant_id = current_setting('app.current_tenant', true));"
        )
        op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'shopmate_app') THEN
                GRANT ALL PRIVILEGES ON TABLE {tbl} TO shopmate_app;
            END IF;
        END
        $$;
        """)


def downgrade() -> None:
    for tbl in reversed(NEW_RLS_TABLES):
        op.execute(f"DROP POLICY IF EXISTS {tbl}_tenant_isolation ON {tbl};")
        op.drop_table(tbl)
    op.execute("DROP INDEX IF EXISTS ix_knowledge_chunks_embedding;")
    op.execute("ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE json USING embedding::text::json;")
    op.execute("DROP INDEX IF EXISTS ix_commerce_products_embedding;")
    op.execute("ALTER TABLE commerce_products ALTER COLUMN embedding TYPE json USING embedding::text::json;")
