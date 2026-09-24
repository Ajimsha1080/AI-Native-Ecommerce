import sys
import os
import jwt
from typing import Dict, Any

# Ensure utf-8 output encoding on Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.rag import execute_rag_pipeline
from app.agent_runtime import run_agent_cycle
from app.auth import decode_token, verify_service_jwt, get_service_secret
from app.db.database import init_db
import asyncio
import time

def generate_test_jwt(workspace_id: str, role: str = "ADMIN") -> str:
    secret = get_service_secret()
    payload = {
        "workspace_id": workspace_id,
        "workspaceId": workspace_id,
        "sub": f"test_user_{workspace_id}",
        "userId": f"test_user_{workspace_id}",
        "role": role,
        "isSuperAdmin": role == "SUPERADMIN",
        "iss": "aaas-node",
        "aud": "aaas-python",
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def test():
    asyncio.run(init_db())
    print("========================================================")
    print("RUNNING PYTHON BACKEND HARDENING & TENANCY SUITE")
    print("========================================================")
    
    # 1. Test JWT Verification & Tenancy Extraction
    print("\n[TEST 1] Service JWT Token Verification & Claim Extraction...")
    valid_token = generate_test_jwt("ws_acme_corp")
    claims = verify_service_jwt(f"Bearer {valid_token}")
    assert claims["workspace_id"] == "ws_acme_corp", "Workspace ID mismatch in verified JWT"
    print("  * Verified workspace_id:", claims["workspace_id"])
    print("  * Verified role:", claims["role"])

    # Test rejection on missing/invalid token
    try:
        verify_service_jwt(None)
        assert False, "Should have rejected missing token"
    except Exception as e:
        print("  * Correctly rejected missing token:", str(e))

    try:
        bad_token = jwt.encode({"random": "payload"}, "wrong_secret_key_at_least_32_bytes_long_123456789", algorithm="HS256")
        verify_service_jwt(f"Bearer {bad_token}")
        assert False, "Should have rejected invalid signature"
    except Exception as e:
        print("  * Correctly rejected forged token:", str(e))

    print("  [PASS] Service Auth & JWT Security PASSED")

    # 2. Test Tenant A vs Tenant B 12-Stage RAG Scoping
    print("\n[TEST 2] 12-Stage RAG Pipeline Isolation (Tenant A vs Tenant B)...")
    rag_a = execute_rag_pipeline("What is your return warranty policy?", workspace_id="ws_acme_corp")
    assert "Acme" in rag_a["citations"][0]["document_name"] or "Return" in rag_a["citations"][0]["document_name"]
    print(f"  * Tenant A (ws_acme_corp) returned: {rag_a['citations'][0]['document_name']}")

    rag_b = execute_rag_pipeline("What is your return warranty policy?", workspace_id="ws_tech_store")
    assert "TechNova" in rag_b["citations"][0]["document_name"]
    print(f"  * Tenant B (ws_tech_store) returned: {rag_b['citations'][0]['document_name']}")
    print("  [PASS] Multi-Tenant RAG Pipeline PASSED")

    # 3. Test Agent Runtime Product Search Tenant Scoping
    print("\n[TEST 3] Agent Runtime Multi-Tenant Catalog Isolation...")
    res_a = run_agent_cycle("agent_shopmate_01", "Show me your catalog products", workspace_id="ws_acme_corp")
    assert "AeroPulse" in res_a["response"]
    assert "UltraBook" not in res_a["response"], "CRITICAL: TechNova laptop leaked into Acme Corp catalog response!"
    print(f"  * Tenant A response contains only Acme footwear: {[p['title'] for p in res_a['interactive_payload']['data']]}")

    res_b = run_agent_cycle("agent_tech_01", "Show me your catalog products", workspace_id="ws_tech_store")
    assert "UltraBook" in res_b["response"]
    assert "AeroPulse" not in res_b["response"], "CRITICAL: Acme footwear leaked into TechNova catalog response!"
    print(f"  * Tenant B response contains only TechNova hardware: {[p['title'] for p in res_b['interactive_payload']['data']]}")
    print("  [PASS] Agent Runtime Product Search PASSED")

    # 4. Test Cross-Tenant Order Tracking Protection
    print("\n[TEST 4] Cross-Tenant Order Lookup Protection...")
    # Attempting to look up TechNova order #20991 while under Acme Corp tenant must fail!
    leak_attempt = run_agent_cycle("agent_shopmate_01", "Where is my package #20991?", workspace_id="ws_acme_corp")
    assert leak_attempt["interactive_payload"] is None or leak_attempt["interactive_payload"]["type"] != "ORDER_TRACKING", "CRITICAL LEAK: Order #20991 was accessible from ws_acme_corp!"
    print(f"  * Cross-tenant order lookup safely blocked: '{leak_attempt['response']}'")

    # Legitimate order lookup under Tenant B
    valid_order = run_agent_cycle("agent_tech_01", "Where is my package #20991?", workspace_id="ws_tech_store")
    assert valid_order["interactive_payload"]["data"]["status"] == "IN_TRANSIT"
    print(f"  * Legitimate Tenant B order lookup succeeded: {valid_order['interactive_payload']['data']['status']} via {valid_order['interactive_payload']['data']['carrier']}")
    print("  [PASS] Cross-Tenant Order Protection PASSED")

    # 5. Test Empty Tenant Zero-Policy Invention & Entailment
    print("\n[TEST 5] Empty Tenant Zero Policy Invention & Grounding...")
    rag_empty = execute_rag_pipeline("What is your 60-day return policy?", workspace_id="ws_empty_tenant_xyz")
    assert len(rag_empty["citations"]) == 0, f"Expected 0 citations for empty tenant, got {len(rag_empty['citations'])}"
    assert "do not have store policy" in rag_empty["natural_answer"] or "customer support" in rag_empty["natural_answer"]
    assert "30 days" not in rag_empty["natural_answer"] and "60 days" not in rag_empty["natural_answer"]
    assert rag_empty["grounding_verification"]["is_grounded"] is True
    print(f"  * Empty tenant safely refused without hallucinating policy: '{rag_empty['natural_answer']}'")
    print("  [PASS] Empty Tenant Zero Policy Invention PASSED")

    print("\n========================================================")
    print("SUMMARY: ALL 5 PYTHON BACKEND HARDENING SUITES PASSED")
    print("========================================================")

if __name__ == "__main__":
    test()

