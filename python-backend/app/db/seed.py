import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .models import (
    WorkspaceModel, UserModel, WorkspaceMemberModel,
    AgentModel, AgentConfigModel, AgentPolicyModel,
    KnowledgeSourceModel, KnowledgeDocModel, KnowledgeChunkModel,
    ProductModel, OrderModel, ToolModel, IntegrationModel
)

def generate_embedding_128(text: str):
    import math, re
    dim = 128
    embedding = [0.0] * dim
    clean = re.sub(r'[^a-z0-9\s]', ' ', text.lower())
    words = [w for w in clean.split() if len(w) > 1]
    if not words:
        return embedding

    for i, word in enumerate(words):
        h = 0
        for char in word:
            h = (h * 31 + ord(char)) & 0xffffffff
        idx = abs(h) % dim
        weight = 1.0 + (0.5 if len(word) > 5 else 0.0)
        embedding[idx] += weight

        if i < len(words) - 1:
            next_word = words[i + 1]
            bh = 0
            for char in next_word:
                bh = (bh * 37 + ord(char)) & 0xffffffff
            b_idx = abs(bh) % dim
            embedding[b_idx] += 0.75

    norm = math.sqrt(sum(x * x for x in embedding))
    if norm > 0:
        embedding = [x / norm for x in embedding]
    return embedding

async def seed_database_if_empty(session: AsyncSession):
    """Checks if database has ws_acme_corp; if not, seeds standard multi-tenant datasets."""
    stmt = select(WorkspaceModel).where(WorkspaceModel.id == "ws_acme_corp")
    res = await session.execute(stmt)
    if res.scalars().first():
        return

    # =========================================================================
    # TENANT A: Acme Footwear & Apparel (ws_acme_corp)
    # =========================================================================
    ws_acme = WorkspaceModel(
        id="ws_acme_corp",
        name="Acme Footwear & Apparel",
        slug="acme-footwear",
        tier="ENTERPRISE"
    )
    session.add(ws_acme)

    user_acme = UserModel(
        id="usr_acme_admin",
        email="admin@acmefootwear.com",
        name="Acme Store Admin",
        role="ADMIN"
    )
    session.add(user_acme)

    session.add(WorkspaceMemberModel(
        id="wsm_acme_01",
        workspace_id=ws_acme.id,
        user_id=user_acme.id,
        role="OWNER"
    ))

    agent_acme = AgentModel(
        id="agent_shopmate_01",
        workspace_id=ws_acme.id,
        name="Acme ShopMate Assistant",
        description="Official shopping and support agent for Acme Footwear.",
        status="ACTIVE"
    )
    session.add(agent_acme)

    session.add(AgentConfigModel(
        id="cfg_acme_01",
        agent_id=agent_acme.id,
        model="claude-3-5-sonnet",
        temperature=0.3,
        system_prompt="You are the Acme Footwear AI Shopping Assistant.",
        tools_enabled=["search_products", "check_inventory", "calculate_cart", "apply_discount", "lookup_order"],
        rag_enabled=True
    ))

    # Acme Products
    acme_prods = [
        ProductModel(
            id="prod_01",
            workspace_id=ws_acme.id,
            title="AeroPulse Velocity Running Shoes",
            price=149.99,
            stock=42,
            category="Footwear",
            description="Ultra-breathable carbon-plated running shoes with responsive foam cushioning."
        ),
        ProductModel(
            id="prod_02",
            workspace_id=ws_acme.id,
            title="StormShield All-Weather Trail Jacket",
            price=189.50,
            stock=18,
            category="Outerwear",
            description="3-layer GORE-TEX waterproof shell with reinforced storm seams."
        ),
        ProductModel(
            id="prod_03",
            workspace_id=ws_acme.id,
            title="HydroPulse 32oz Insulated Flask",
            price=34.00,
            stock=0,
            category="Accessories",
            description="Double-wall vacuum insulated stainless steel bottle with leakproof lid."
        )
    ]
    session.add_all(acme_prods)

    # Acme Orders
    session.add(OrderModel(
        id="ord_acme_10482",
        workspace_id=ws_acme.id,
        customer_email="customer@example.com",
        total_amount=149.99,
        currency="USD",
        status="DELIVERED",
        items_json=[{"order_number": "#10482", "carrier": "FedEx Express", "tracking_number": "FX-8941039821-US", "items": ["1x AeroPulse Velocity Running Shoes (Size US 10.5)"], "shipping_address": "742 Evergreen Terrace, Springfield, OR"}]
    ))

    # Acme Knowledge Base
    ks_acme = KnowledgeSourceModel(id="ks_acme_01", workspace_id=ws_acme.id, name="Acme Policy Handbook", type="HANDBOOK")
    session.add(ks_acme)

    doc_acme_1 = KnowledgeDocModel(
        id="doc_acme_ret",
        source_id=ks_acme.id,
        title="Acme Store Return & Warranty Policy 2026.pdf",
        content="Acme Store Return & Refund Policy:\n1. Returns are accepted within 30 days of delivery date for unworn items with tags.\n2. Defective items are covered under a 1-year limited warranty for immediate replacement or full refund."
    )
    doc_acme_2 = KnowledgeDocModel(
        id="doc_acme_ship",
        source_id=ks_acme.id,
        title="Shipping Rates, Express Transit & International Customs.md",
        content="Standard Ground Shipping delivers in 3 to 5 business days via FedEx/UPS. Free shipping on orders over $75. International return shipping costs $15 flat rate."
    )
    session.add_all([doc_acme_1, doc_acme_2])

    chunks_acme = [
        KnowledgeChunkModel(
            id="chk_acme_01",
            doc_id=doc_acme_1.id,
            chunk_index=0,
            text="Acme Store Return & Refund Policy:\n1. Returns are accepted within 30 days of the delivery date for unwashed and unworn merchandise with original tags attached.\n2. Defective items are covered under a 1-year limited warranty and are eligible for immediate replacement or full refund.",
            embedding=generate_embedding_128("Acme Store Return & Refund Policy: Returns are accepted within 30 days for unworn merchandise. 1-year limited warranty on defective items.")
        ),
        KnowledgeChunkModel(
            id="chk_acme_02",
            doc_id=doc_acme_1.id,
            chunk_index=1,
            text="3. Return shipping is free for all orders within the continental US. International return labels cost $15 flat rate.\n4. Refunds are processed to original payment within 3-5 days.",
            embedding=generate_embedding_128("Return shipping is free within continental US. International return labels cost $15 flat rate. Refunds in 3-5 business days.")
        )
    ]
    session.add_all(chunks_acme)

    # =========================================================================
    # TENANT B: TechNova Electronics (ws_tech_store)
    # =========================================================================
    ws_tech = WorkspaceModel(
        id="ws_tech_store",
        name="TechNova Electronics",
        slug="technova-store",
        tier="ENTERPRISE"
    )
    session.add(ws_tech)

    user_tech = UserModel(
        id="usr_tech_admin",
        email="admin@technova.com",
        name="TechNova Admin",
        role="ADMIN"
    )
    session.add(user_tech)

    session.add(WorkspaceMemberModel(
        id="wsm_tech_01",
        workspace_id=ws_tech.id,
        user_id=user_tech.id,
        role="OWNER"
    ))

    agent_tech = AgentModel(
        id="agent_tech_01",
        workspace_id=ws_tech.id,
        name="TechNova Hardware Expert",
        description="Specialist in computing, gadgets, and technical warranty policies.",
        status="ACTIVE"
    )
    session.add(agent_tech)

    session.add(AgentConfigModel(
        id="cfg_tech_01",
        agent_id=agent_tech.id,
        model="claude-3-5-sonnet",
        temperature=0.3,
        system_prompt="You are the TechNova Hardware AI Assistant.",
        tools_enabled=["search_products", "check_inventory", "calculate_cart", "apply_discount", "lookup_order"],
        rag_enabled=True
    ))

    # TechNova Products
    tech_prods = [
        ProductModel(
            id="prod_tech_01",
            workspace_id=ws_tech.id,
            title="UltraBook Titanium 16 M3 Pro",
            price=2199.00,
            stock=12,
            category="Laptops",
            description="M3 Pro architecture with 32GB RAM, 1TB SSD, 120Hz Liquid Retina display."
        ),
        ProductModel(
            id="prod_tech_02",
            workspace_id=ws_tech.id,
            title="Chronos Smartwatch Gen 4",
            price=399.00,
            stock=25,
            category="Wearables",
            description="Sapphire glass, ECG monitoring, titanium bezel, 14-day battery reserve."
        )
    ]
    session.add_all(tech_prods)

    # TechNova Orders
    session.add(OrderModel(
        id="ord_tech_20991",
        workspace_id=ws_tech.id,
        customer_email="buyer@technova.com",
        total_amount=2199.00,
        currency="USD",
        status="IN_TRANSIT",
        items_json=[{"order_number": "#20991", "carrier": "UPS Next Day Air", "tracking_number": "1Z9999999999999999", "items": ["1x UltraBook Titanium 16"], "shipping_address": "100 Market St, San Francisco, CA"}]
    ))

    # TechNova Knowledge Base
    ks_tech = KnowledgeSourceModel(id="ks_tech_01", workspace_id=ws_tech.id, name="TechNova Warranty Documents", type="HANDBOOK")
    session.add(ks_tech)

    doc_tech_1 = KnowledgeDocModel(
        id="doc_tech_war",
        source_id=ks_tech.id,
        title="TechNova 2-Year Hardware Replacement & AppleCare Equivalent.pdf",
        content="TechNova Electronics Policy: All certified laptops and smartwatches come with a 2-Year Instant Replacement Warranty covering battery degradation and screen failure. Returns on opened electronics are subject to a 14-day return window and 0% restocking fee when reset to factory settings."
    )
    session.add(doc_tech_1)

    chunk_tech_1 = KnowledgeChunkModel(
        id="chk_tech_01",
        doc_id=doc_tech_1.id,
        chunk_index=0,
        text="TechNova Electronics Policy: All certified laptops and smartwatches come with a 2-Year Instant Replacement Warranty covering battery degradation and screen failure. Returns on opened electronics are subject to a 14-day return window and 0% restocking fee when reset to factory settings.",
        embedding=generate_embedding_128("TechNova Electronics Policy: All certified laptops and smartwatches come with a 2-Year Instant Replacement Warranty covering battery degradation and screen failure.")
    )
    session.add(chunk_tech_1)

    await session.commit()
