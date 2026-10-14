import datetime
import os
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Index, text
)
from sqlalchemy.orm import relationship, synonym
from pgvector.sqlalchemy import Vector
from .database import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

# ==============================================================================
# 1. CORE TENANT & IDENTITY MODELS
# ==============================================================================

class WorkspaceModel(Base):
    __tablename__ = "workspaces"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    tier = Column(String(50), default="ENTERPRISE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    members = relationship("WorkspaceMemberModel", back_populates="workspace", cascade="all, delete-orphan")
    agents = relationship("AgentModel", back_populates="workspace", cascade="all, delete-orphan")
    products = relationship("ProductModel", back_populates="workspace", cascade="all, delete-orphan")
    orders = relationship("OrderModel", back_populates="workspace", cascade="all, delete-orphan")


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="ADMIN", nullable=False)
    password_hash = Column(Text, nullable=True)
    mfa_secret = Column(String(255), nullable=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    memberships = relationship("WorkspaceMemberModel", back_populates="user", cascade="all, delete-orphan")


class WorkspaceMemberModel(Base):
    __tablename__ = "workspace_members"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="OWNER", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    workspace = relationship("WorkspaceModel", back_populates="members")
    user = relationship("UserModel", back_populates="memberships")

    __table_args__ = (
        Index("ix_workspace_members_tenant_user", "tenant_id", "user_id"),
    )


# ==============================================================================
# 2. AGENTS & RUNTIME CONFIGURATION
# ==============================================================================

class AgentModel(Base):
    __tablename__ = "agents"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    workspace = relationship("WorkspaceModel", back_populates="agents")
    config = relationship("AgentConfigModel", uselist=False, back_populates="agent", cascade="all, delete-orphan")
    versions = relationship("AgentVersionModel", back_populates="agent", cascade="all, delete-orphan")
    policies = relationship("AgentPolicyModel", back_populates="agent", cascade="all, delete-orphan")
    conversations = relationship("ConversationModel", back_populates="agent", cascade="all, delete-orphan")


class AgentConfigModel(Base):
    __tablename__ = "agent_configs"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    model = Column(String(100), default="sarvam-105b-conversations", nullable=False)
    temperature = Column(Float, default=0.7, nullable=False)
    max_tokens = Column(Integer, default=2048, nullable=False)
    system_prompt = Column(Text, nullable=False)
    tools = Column(JSON, default=list, nullable=False)
    guardrails = Column(JSON, default=dict, nullable=False)
    rag_enabled = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    agent = relationship("AgentModel", back_populates="config")


class AgentVersionModel(Base):
    __tablename__ = "agent_versions"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)
    config = Column(JSON, default=dict, nullable=False)
    changelog = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    agent = relationship("AgentModel", back_populates="versions")


class AgentPolicyModel(Base):
    __tablename__ = "agent_policies"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    policy_type = Column(String(50), default="GUARDRAIL", nullable=False)
    rule_definition = Column(JSON, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    agent = relationship("AgentModel", back_populates="policies")


# ==============================================================================
# 3. KNOWLEDGE & RAG MODELS (with pgvector embedding support)
# ==============================================================================

class KnowledgeSourceModel(Base):
    __tablename__ = "knowledge_sources"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="DOCUMENTS", nullable=False)
    status = Column(String(50), default="INDEXED", nullable=False)
    config = Column(JSON, default=dict, nullable=False)
    document_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    documents = relationship("KnowledgeDocModel", back_populates="source", cascade="all, delete-orphan")


class KnowledgeDocModel(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(64), ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    source = relationship("KnowledgeSourceModel", back_populates="documents")
    chunks = relationship("KnowledgeChunkModel", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunkModel(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_id = Column(String(64), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, default=0, nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=True)  # Real pgvector 1536-dimensional vector
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    document = relationship("KnowledgeDocModel", back_populates="chunks")

    __table_args__ = (
        Index("ix_knowledge_chunks_tenant_doc", "tenant_id", "doc_id"),
        Index("ix_knowledge_chunks_embedding", "embedding", postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"}),
    )


# ==============================================================================
# 4. COMMERCE MODELS (Products, Orders, Carts)
# ==============================================================================

class ProductModel(Base):
    __tablename__ = "commerce_products"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    handle = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False, index=True)
    compare_at_price = Column(Float, nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    category = Column(String(100), default="General", index=True, nullable=False)
    tags = Column(JSON, default=list, nullable=False)
    images = Column(JSON, default=list, nullable=False)
    in_stock = Column(Boolean, default=True, index=True, nullable=False)
    stock = Column(Integer, default=10, nullable=False)
    variants = Column(JSON, default=list, nullable=False)
    attributes = Column(JSON, default=dict, nullable=False)
    source_url = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    workspace = relationship("WorkspaceModel", back_populates="products")

    __table_args__ = (
        Index("ix_commerce_products_tenant_category", "tenant_id", "category"),
        Index("ix_commerce_products_tenant_price", "tenant_id", "price"),
    )


class OrderModel(Base):
    __tablename__ = "commerce_orders"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    order_number = Column(String(64), nullable=False, index=True)
    customer_name = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=False, index=True)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    financial_status = Column(String(50), default="PAID", nullable=False)
    fulfillment_status = Column(String(50), default="UNFULFILLED", nullable=False)
    items_json = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    workspace = relationship("WorkspaceModel", back_populates="orders")

    __table_args__ = (
        Index("ix_commerce_orders_tenant_email", "tenant_id", "customer_email"),
        Index("ix_commerce_orders_tenant_number", "tenant_id", "order_number"),
    )


class CartModel(Base):
    __tablename__ = "commerce_carts"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(128), unique=True, index=True, nullable=False)
    items_json = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


# ==============================================================================
# 5. CONVERSATIONS & EXECUTION TRACES
# ==============================================================================

class ConversationModel(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(64), nullable=True)
    channel = Column(String(50), default="WEBSITE", nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    agent = relationship("AgentModel", back_populates="conversations")
    messages = relationship("MessageModel", back_populates="conversation", cascade="all, delete-orphan")


class MessageModel(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(50), nullable=False)  # 'USER', 'AGENT', 'SYSTEM'
    content = Column(Text, nullable=False)
    trace_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")

    conversation = relationship("ConversationModel", back_populates="messages")


class ExecutionTraceModel(Base):
    __tablename__ = "execution_traces"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), index=True, nullable=False)
    conversation_id = Column(String(64), index=True, nullable=True)
    duration_ms = Column(Float, default=0.0, nullable=False)
    rag_steps_executed = Column(Integer, default=12, nullable=False)
    tools_called = Column(JSON, default=list, nullable=False)
    status = Column(String(50), default="SUCCESS", nullable=False)
    trace_log = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


# ==============================================================================
# 6. PLATFORM DEPLOYMENTS, SECURITY, WEBHOOKS & EVALUATIONS
# ==============================================================================

class DeploymentModel(Base):
    __tablename__ = "deployments"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), nullable=False, index=True)
    environment = Column(String(50), default="PRODUCTION", nullable=False)
    public_key = Column(String(128), unique=True, index=True, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    allowed_domains = Column(JSON, default=list, nullable=False)
    config = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class ApiKeyModel(Base):
    __tablename__ = "api_keys"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    key_prefix = Column(String(32), index=True, nullable=False)
    hashed_key = Column(Text, nullable=False)
    permissions = Column(JSON, default=list, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class WebhookModel(Base):
    __tablename__ = "webhooks"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(Text, nullable=False)
    events = Column(JSON, default=list, nullable=False)
    secret = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class WebhookDeliveryModel(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    webhook_id = Column(String(64), ForeignKey("webhooks.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, default=dict, nullable=False)
    response_code = Column(Integer, nullable=True)
    success = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class EvaluationCaseModel(Base):
    __tablename__ = "evaluation_cases"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    user_input = Column(Text, nullable=False)
    expected_intent = Column(String(100), nullable=False)
    expected_tools = Column(JSON, default=list, nullable=False)
    expected_keywords = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class EvaluationRunModel(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), nullable=False, index=True)
    case_id = Column(String(64), ForeignKey("evaluation_cases.id", ondelete="CASCADE"), nullable=True)
    passed = Column(Boolean, default=False, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    latency_ms = Column(Integer, default=0, nullable=False)
    actual_output = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(64), nullable=True)
    details = Column(JSON, default=dict, nullable=False)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class ProcessedWebhookEventModel(Base):
    __tablename__ = "processed_webhook_events"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    event_id = Column(String(255), unique=True, index=True, nullable=False)
    provider = Column(String(50), nullable=False)
    processed_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class ToolModel(Base):
    __tablename__ = "tools"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default="commerce", nullable=False)
    description = Column(Text, nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class IntegrationModel(Base):
    __tablename__ = "integrations"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(100), nullable=False)
    status = Column(String(50), default="CONNECTED", nullable=False)
    config_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class ToolPermissionModel(Base):
    __tablename__ = "tool_permissions"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_id = Column(String(64), ForeignKey("tools.id", ondelete="CASCADE"), nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    permission_mode = Column(String(50), default="ALLOWED", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class UsageEventModel(Base):
    __tablename__ = "usage_events"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    count = Column(Integer, default=1, nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class WorkspaceIntegrationModel(Base):
    __tablename__ = "workspace_integrations"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    status = Column(String(50), default="CONNECTED", nullable=False)
    config_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class IntegrationSyncJobModel(Base):
    __tablename__ = "integration_sync_jobs"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    integration_id = Column(String(64), ForeignKey("workspace_integrations.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="COMPLETED", nullable=False)
    records_synced = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    workspace_id = synonym("tenant_id")


class AIModeConfigModel(Base):
    __tablename__ = "ai_mode_configs"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    enabled = Column(Boolean, default=True, nullable=False)
    model_provider = Column(String(50), default="sarvam", nullable=False)
    model_name = Column(String(100), default="sarvam-105b-conversations", nullable=False)
    api_key = Column(Text, nullable=True)
    temperature = Column(Float, default=0.7, nullable=False)
    retrieval_threshold = Column(Float, default=0.5, nullable=False)
    max_search_results = Column(Integer, default=10, nullable=False)
    enable_recommendations = Column(Boolean, default=True, nullable=False)
    enable_comparisons = Column(Boolean, default=True, nullable=False)
    enable_cart_actions = Column(Boolean, default=True, nullable=False)
    system_instructions = Column(Text, default="You are an enterprise AI commerce concierge.", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class AIModeKnowledgeSourceModel(Base):
    __tablename__ = "ai_mode_knowledge_sources"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="DOCUMENT", nullable=False)
    source_url = Column(String(500), nullable=True)
    status = Column(String(50), default="IDLE", nullable=False)
    document_count = Column(Integer, default=0, nullable=False)
    product_count = Column(Integer, default=0, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    raw_content = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class AIModeDeploymentModel(Base):
    __tablename__ = "ai_mode_deployments"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="LIVE", nullable=False)
    allowed_domains = Column(JSON, default=list, nullable=False)
    theme_json = Column(JSON, default=dict, nullable=False)
    branding_json = Column(JSON, default=dict, nullable=False)
    embed_code = Column(Text, default="", nullable=False)
    total_conversations = Column(Integer, default=0, nullable=False)
    total_product_clicks = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


class AIModeConversationModel(Base):
    __tablename__ = "ai_mode_conversations"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    messages_json = Column(JSON, default=list, nullable=False)
    last_search_state = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    workspace_id = synonym("tenant_id")


# ==============================================================================
# 7. ROW-LEVEL SECURITY DEFINITIONS FOR POSTGRESQL 16
# ==============================================================================

RLS_ENABLED_TABLES = [
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
    "tool_permissions",
    "usage_events",
    "workspace_integrations",
    "integration_sync_jobs",
    "ai_mode_configs",
    "ai_mode_knowledge_sources",
    "ai_mode_deployments",
    "ai_mode_conversations",
]

def generate_rls_sql() -> str:
    """Generates PostgreSQL Row-Level Security statements for all tenant tables."""
    statements = []
    for table in RLS_ENABLED_TABLES:
        statements.append(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        statements.append(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        policy_name = f"{table}_tenant_isolation"
        statements.append(
            f"DROP POLICY IF EXISTS {policy_name} ON {table};"
        )
        statements.append(
            f"CREATE POLICY {policy_name} ON {table} "
            f"FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)) "
            f"WITH CHECK (tenant_id = current_setting('app.current_tenant', true));"
        )
    return "\n".join(statements)
