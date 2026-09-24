import asyncio
import sys
from app.db.database import init_db, async_session_factory
from app.db.repository import DatabaseRepository
from app.db.models import WorkspaceModel, ProductModel, AgentModel

async def run_db_tests():
    print("=== 1. Initializing Enterprise Database Schema & Seeding ===")
    await init_db()
    print("[OK] Schema initialized and seed check completed.")

    async with async_session_factory() as session:
        repo = DatabaseRepository(session)

        # 2. Check Workspaces
        print("\n=== 2. Verifying Multi-Tenant Workspace & Agent ===")
        agent = await repo.get_agent_with_config("agent_shopmate_01")
        assert agent is not None, "ShopMate agent not found in DB"
        print(f"[OK] Agent Found: {agent.name} (Workspace: {agent.workspace_id})")
        print(f"[OK] Config System Prompt: {agent.config.system_prompt[:50]}...")
        print(f"[OK] Policies: Max tokens = {agent.policies[0].max_tokens_per_session}")

        # 3. Check Products
        print("\n=== 3. Verifying Products Catalog ===")
        products = await repo.get_all_products()
        print(f"[OK] Found {len(products)} products in enterprise database.")
        for p in products:
            print(f"  - [{p.id}] {p.title} - ${p.price} (Stock: {p.stock})")

        # 4. Check Vector Search from DB
        print("\n=== 4. Verifying DB Vector Search on Knowledge Chunks ===")
        import math
        query_vec = [math.sin(i + 42) for i in range(128)]
        vector_results = await repo.vector_similarity_search(agent.workspace_id, query_vec, top_k=2)
        print(f"[OK] Top {len(vector_results)} Vector Matches from Persistent DB:")
        for res in vector_results:
            print(f"  - Score: {res['similarity']} | Text: {res['text'][:60]}...")

        # 5. Check ACID Order Transaction
        print("\n=== 5. Testing ACID Order Transaction & Stock Deduction ===")
        target_prod = products[0]
        initial_stock = target_prod.stock
        order = await repo.create_order_transaction(
            workspace_id=agent.workspace_id,
            customer_email="enterprise_buyer@acme.com",
            items=[{"product_id": target_prod.id, "quantity": 2, "price": target_prod.price}],
            total_amount=target_prod.price * 2
        )
        await session.commit()
        print(f"[OK] Order created: {order.id} for ${order.total_amount}")
        
        # Verify stock updated
        updated_prod = await session.get(ProductModel, target_prod.id)
        assert updated_prod.stock == initial_stock - 2, "Stock deduction failed!"
        print(f"[OK] Stock successfully updated from {initial_stock} -> {updated_prod.stock}")

        # 6. Check Trace Recording
        print("\n=== 6. Testing Execution Trace Recording ===")
        trace = await repo.record_execution_trace(
            agent_id=agent.id,
            conversation_id="conv_test_001",
            duration_ms=45.2,
            tools_called=["search_products"],
            status="SUCCESS",
            trace_log={"rag_version": "12-stage-rrf"}
        )
        print(f"[OK] Trace logged: {trace.id} with status {trace.status}")

    print("\n[SUCCESS] ALL 6 ENTERPRISE DATABASE SUITES PASSED!")

if __name__ == "__main__":
    asyncio.run(run_db_tests())
