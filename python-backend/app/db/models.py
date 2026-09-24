import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from .database import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class WorkspaceModel(Base):
    __tablename__ = "workspaces"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    tier = Column(String(50), default="ENTERPRISE")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    agents = relationship("AgentModel", back_populates="workspace", cascade="all, delete-orphan")
    products = relationship("ProductModel", back_populates="workspace", cascade="all, delete-orphan")
    orders = relationship("OrderModel", back_populates="workspace", cascade="all, delete-orphan")


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="ADMIN")
    created_at = Column(DateTime, default=utcnow)


class WorkspaceMemberModel(Base):
    __tablename__ = "workspace_members"

    id = Column(String(64), primary_key=True, index=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="OWNER")
    created_at = Column(DateTime, default=utcnow)


class AgentModel(Base):
    __tablename__ = "agents"

    id = Column(String(64), primary_key=True, index=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    workspace = relationship("WorkspaceModel", back_populates="agents")
    config = relationship("AgentConfigModel", uselist=False, back_populates="agent", cascade="all, delete-orphan")
    versions = relationship("AgentVersionModel", back_populates="agent", cascade="all, delete-orphan")
    policies = relationship("AgentPolicyModel", back_populates="agent", cascade="all, delete-orphan")
    conversations = relationship("ConversationModel", back_populates="agent", cascade="all, delete-orphan")


class AgentConfigModel(Base):
    __tablename__ = "agent_configs"

    id = Column(String(64), primary_key=True, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id"), unique=True, nullable=False)
    model = Column(String(100), default="claude-3-5-sonnet")
    temperature = Column(Float, default=0.7)
    system_prompt = Column(Text, nullable=False)
    tools_enabled = Column(JSON, default=list)
    rag_enabled = Column(Boolean, default=True)
    routing_rules = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    agent = relationship("AgentModel", back_populates="config")


class AgentVersionModel(Base):
    __tablename__ = "agent_versions"

    id = Column(String(64), primary_key=True, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id"), nullable=False)
    version = Column(String(50), nullable=False)
    system_prompt = Column(Text, nullable=False)
    model = Column(String(100), nullable=False)
    changelog = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    agent = relationship("AgentModel", back_populates="versions")


class AgentPolicyModel(Base):
    __tablename__ = "agent_policies"

    id = Column(String(64), primary_key=True, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id"), nullable=False)
    max_tokens_per_session = Column(Integer, default=100000)
    rate_limit_rpm = Column(Integer, default=60)
    allowed_domains = Column(JSON, default=list)
    require_human_approval_over = Column(Float, default=500.0)

    agent = relationship("AgentModel", back_populates="policies")


class KnowledgeSourceModel(Base):
    __tablename__ = "knowledge_sources"

    id = Column(String(64), primary_key=True, index=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="DOCUMENTS")
    created_at = Column(DateTime, default=utcnow)

    documents = relationship("KnowledgeDocModel", back_populates="source", cascade="all, delete-orphan")


class KnowledgeDocModel(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String(64), primary_key=True, index=True)
    source_id = Column(String(64), ForeignKey("knowledge_sources.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    source = relationship("KnowledgeSourceModel", back_populates="documents")
    chunks = relationship("KnowledgeChunkModel", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunkModel(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String(64), primary_key=True, index=True)
    doc_id = Column(String(64), ForeignKey("knowledge_documents.id"), nullable=False)
    chunk_index = Column(Integer, default=0)
    text = Column(Text, nullable=False)
    # Storing embedding as JSON float array (compatible with both PostgreSQL pgvector and SQLite)
    embedding = Column(JSON, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    document = relationship("KnowledgeDocModel", back_populates="chunks")


class ProductModel(Base):
    __tablename__ = "commerce_products"

    id = Column(String(64), primary_key=True, index=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    category = Column(String(100), default="General")
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    workspace = relationship("WorkspaceModel", back_populates="products")


class OrderModel(Base):
    __tablename__ = "commerce_orders"

    id = Column(String(64), primary_key=True, index=True)
    workspace_id = Column(String(64), ForeignKey("workspaces.id"), nullable=False)
    customer_email = Column(String(255), nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    status = Column(String(50), default="PAID")
    items_json = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)

    workspace = relationship("WorkspaceModel", back_populates="orders")


class CartModel(Base):
    __tablename__ = "commerce_carts"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(128), unique=True, index=True, nullable=False)
    items_json = Column(JSON, default=list)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class ConversationModel(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True)
    agent_id = Column(String(64), ForeignKey("agents.id"), nullable=False)
    user_id = Column(String(64), nullable=True)
    title = Column(String(255), default="New Session")
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    agent = relationship("AgentModel", back_populates="conversations")
    messages = relationship("MessageModel", back_populates="conversation", cascade="all, delete-orphan")


class MessageModel(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id"), nullable=False)
    sender = Column(String(50), nullable=False) # 'USER', 'AGENT', 'SYSTEM'
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    conversation = relationship("ConversationModel", back_populates="messages")


class ExecutionTraceModel(Base):
    __tablename__ = "execution_traces"

    id = Column(String(64), primary_key=True, index=True)
    agent_id = Column(String(64), index=True, nullable=False)
    conversation_id = Column(String(64), index=True, nullable=True)
    duration_ms = Column(Float, default=0.0)
    rag_steps_executed = Column(Integer, default=12)
    tools_called = Column(JSON, default=list)
    status = Column(String(50), default="SUCCESS")
    trace_log = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)


class ToolModel(Base):
    __tablename__ = "tools"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default="commerce")
    description = Column(Text, nullable=True)
    is_enabled = Column(Boolean, default=True)


class IntegrationModel(Base):
    __tablename__ = "integrations"

    id = Column(String(64), primary_key=True, index=True)
    workspace_id = Column(String(64), nullable=False)
    provider = Column(String(100), nullable=False) # Shopify, Stripe, SendGrid
    status = Column(String(50), default="CONNECTED")
    config_json = Column(JSON, default=dict)


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    actor_id = Column(String(64), nullable=False)
    details_json = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=utcnow)
