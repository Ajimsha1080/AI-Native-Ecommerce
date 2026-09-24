import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .models import (
    WorkspaceModel, UserModel, WorkspaceMemberModel,
    AgentModel, AgentConfigModel, AgentPolicyModel,
    KnowledgeSourceModel, KnowledgeDocModel, KnowledgeChunkModel,
    ProductModel, ToolModel, IntegrationModel
)

async def seed_database_if_empty(session: AsyncSession):
    """Checks if database has workspaces; if not, seeds standard enterprise datasets."""
    stmt = select(WorkspaceModel).limit(1)
    res = await session.execute(stmt)
    if res.scalars().first():
        return # Already seeded

    # 1. Workspace
    ws = WorkspaceModel(
        id="ws_enterprise_01",
        name="Global Commerce Corp",
        slug="global-commerce",
        tier="ENTERPRISE"
    )
    session.add(ws)

    # 2. User
    user = UserModel(
        id="usr_admin_01",
        email="admin@globalcommerce.com",
        name="Chief Commerce Officer",
        role="SUPER_ADMIN"
    )
    session.add(user)

    member = WorkspaceMemberModel(
        id="wsm_01",
        workspace_id=ws.id,
        user_id=user.id,
        role="OWNER"
    )
    session.add(member)

    # 3. Agent
    agent = AgentModel(
        id="agent_shopmate_01",
        workspace_id=ws.id,
        name="ShopMate AI Enterprise Advisor",
        description="Autonomous e-commerce conversational assistant with 12-stage RAG and transactional capabilities.",
        status="ACTIVE"
    )
    session.add(agent)

    config = AgentConfigModel(
        id="cfg_01",
        agent_id=agent.id,
        model="claude-3-5-sonnet",
        temperature=0.3,
        system_prompt=(
            "You are ShopMate AI, an Enterprise Commerce Assistant. "
            "Use grounded citations from RAG knowledge and execute tools safely."
        ),
        tools_enabled=["search_products", "check_order_status", "apply_coupon", "create_return_label"],
        rag_enabled=True,
        routing_rules={"intent_threshold": 0.8}
    )
    session.add(config)

    policy = AgentPolicyModel(
        id="pol_01",
        agent_id=agent.id,
        max_tokens_per_session=150000,
        rate_limit_rpm=120,
        allowed_domains=["globalcommerce.com", "shopmate.ai"],
        require_human_approval_over=1000.0
    )
    session.add(policy)

    # 4. Products
    products = [
        ProductModel(
            id="prod_01",
            workspace_id=ws.id,
            title="Apex Pro Wireless Headphones",
            description="Active noise cancellation, 40-hour battery life, lossless LDAC codec.",
            price=299.99,
            stock=145,
            category="Audio",
            image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e"
        ),
        ProductModel(
            id="prod_02",
            workspace_id=ws.id,
            title="UltraBook Titanium 16",
            description="M3 Pro Architecture, 32GB Unified Memory, 1TB SSD, 120Hz Liquid Retina display.",
            price=2199.00,
            stock=42,
            category="Laptops",
            image_url="https://images.unsplash.com/photo-1517336714731-489689fd1ca8"
        ),
        ProductModel(
            id="prod_03",
            workspace_id=ws.id,
            title="ErgoStance Pro Desk",
            description="Dual motor electric standing desk with memory presets and anti-collision sensor.",
            price=549.50,
            stock=80,
            category="Furniture",
            image_url="https://images.unsplash.com/photo-1595515106969-1ce29566ff1c"
        ),
        ProductModel(
            id="prod_04",
            workspace_id=ws.id,
            title="Chronos Smartwatch Gen 4",
            description="Sapphire glass, ECG monitoring, titanium bezel, 14-day battery reserve.",
            price=399.00,
            stock=210,
            category="Wearables",
            image_url="https://images.unsplash.com/photo-1523275335684-37898b6baf30"
        )
    ]
    session.add_all(products)

    # 5. Knowledge Base & Documents
    ks = KnowledgeSourceModel(
        id="ks_01",
        workspace_id=ws.id,
        name="Global Commerce Policy & Catalog Handbook",
        type="HANDBOOK"
    )
    session.add(ks)

    doc1 = KnowledgeDocModel(
        id="doc_returns",
        source_id=ks.id,
        title="Enterprise Return & Refund Policy",
        content="Returns are accepted within 30 days of purchase in original packaging. Refunds are processed within 3-5 business days."
    )
    doc2 = KnowledgeDocModel(
        id="doc_shipping",
        source_id=ks.id,
        title="Global Shipping & Express Delivery Terms",
        content="Standard shipping takes 3-5 business days. Express priority shipping guarantees delivery within 24-48 hours. Orders over $100 qualify for free express shipping."
    )
    doc3 = KnowledgeDocModel(
        id="doc_warranty",
        source_id=ks.id,
        title="Hardware Warranty & Protection Plans",
        content="All electronics include a 2-year manufacturer warranty covering internal defects, battery replacements, and certified service."
    )
    session.add_all([doc1, doc2, doc3])

    # 6. Knowledge Chunks with 128-dim mock dense embeddings
    import math
    def generate_embedding(seed_text: str):
        val = sum(ord(c) for c in seed_text) % 100
        return [math.sin(i + val) for i in range(128)]

    chunks = [
        KnowledgeChunkModel(
            id="chk_01",
            doc_id=doc1.id,
            chunk_index=0,
            text=doc1.content,
            embedding=generate_embedding(doc1.content),
            metadata_json={"section": "returns", "policy_version": "2026.1"}
        ),
        KnowledgeChunkModel(
            id="chk_02",
            doc_id=doc2.id,
            chunk_index=0,
            text=doc2.content,
            embedding=generate_embedding(doc2.content),
            metadata_json={"section": "shipping", "min_free_tier": 100.0}
        ),
        KnowledgeChunkModel(
            id="chk_03",
            doc_id=doc3.id,
            chunk_index=0,
            text=doc3.content,
            embedding=generate_embedding(doc3.content),
            metadata_json={"section": "warranty", "duration_years": 2}
        )
    ]
    session.add_all(chunks)

    # 7. Integrations & Tools
    session.add_all([
        IntegrationModel(id="int_01", workspace_id=ws.id, provider="Shopify Enterprise", status="CONNECTED"),
        IntegrationModel(id="int_02", workspace_id=ws.id, provider="Stripe Payments", status="ACTIVE"),
        ToolModel(id="tool_01", name="search_products", category="commerce", description="Searches inventory catalog"),
        ToolModel(id="tool_02", name="process_order", category="orders", description="Creates and confirms orders")
    ])

    await session.commit()
