import sys
import os
import time
import jwt
from starlette.testclient import TestClient

# Add python-backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.main import app
from app.auth import get_service_secret

def generate_token(workspace_id: str, role: str = "ADMIN") -> str:
    secret = get_service_secret()
    payload = {
        "workspace_id": workspace_id,
        "workspaceId": workspace_id,
        "role": role,
        "iss": "aaas-node",
        "aud": "aaas-python",
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def run_http_tests():
    print("=" * 65)
    print("HTTP-LEVEL FASTAPI SECURITY & MULTI-TENANCY TEST SUITE")
    print("=" * 65)

    with TestClient(app) as client:
        token_a = generate_token("ws_acme_corp", "ADMIN")
        token_b = generate_token("ws_tech_store", "ADMIN")

        # 1. Test 401 Unauthorized when no token is supplied
        endpoints_to_test = [
            ("GET", "/api/v1/db/status", None),
            ("POST", "/api/v1/agents/agent_shopmate_01/chat", {"message": "Hello"}),
            ("POST", "/api/v1/rag/query", {"question": "What is the return policy?"}),
            ("GET", "/api/v1/orders/10482?customer_email=sarah.connor@example.com", None),
        ]

        print("\n[TEST 1] Verifying 401 Unauthorized for Unauthenticated Requests...")
        for method, path, body in endpoints_to_test:
            if method == "GET":
                resp = client.get(path)
            else:
                resp = client.post(path, json=body)
            assert resp.status_code == 401, f"Expected 401 for {method} {path}, got {resp.status_code}"
            print(f"  * {method} {path} -> 401 Unauthorized (PASSED)")

        # 2. Test 403 Forbidden when Token A attempts to operate on Workspace B
        print("\n[TEST 2] Verifying 403 Forbidden on Cross-Tenant Workspace Mismatch...")
        cross_tenant_chat = client.post(
            "/api/v1/agents/agent_shopmate_01/chat",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"message": "Show catalog", "workspace_id": "ws_tech_store"}
        )
        assert cross_tenant_chat.status_code == 403, f"Expected 403, got {cross_tenant_chat.status_code}"
        print("  * Token(ws_acme_corp) + Body(ws_tech_store) -> 403 Forbidden (PASSED)")

        cross_tenant_rag = client.post(
            "/api/v1/rag/query",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"question": "Return policy", "workspace_id": "ws_tech_store"}
        )
        assert cross_tenant_rag.status_code == 403, f"Expected 403, got {cross_tenant_rag.status_code}"
        print("  * Token(ws_acme_corp) + RAG Body(ws_tech_store) -> 403 Forbidden (PASSED)")

        # 3. Test 404 Not Found on Bogus, Mismatched Email, or Cross-Tenant Order Lookups
        print("\n[TEST 3] Verifying 404 Not Found on Bogus and Cross-Tenant Order Numbers...")
        bogus_order = client.get(
            "/api/v1/orders/99999999?customer_email=sarah.connor@example.com",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert bogus_order.status_code == 404, f"Expected 404 for bogus order, got {bogus_order.status_code}"
        print("  * Lookup non-existent order #99999999 -> 404 Not Found (PASSED)")

        mismatched_email_order = client.get(
            "/api/v1/orders/10482?customer_email=attacker@evil.com",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert mismatched_email_order.status_code == 404, f"Expected 404 for mismatched email, got {mismatched_email_order.status_code}"
        print("  * Lookup order #10482 with wrong email -> 404 Not Found (PASSED)")

        # Attempting to look up Tenant B order #20991 using Tenant A token must return 404 (never leak!)
        cross_order = client.get(
            "/api/v1/orders/20991?customer_email=buyer@technova.com",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert cross_order.status_code == 404, f"Expected 404 for cross-tenant order, got {cross_order.status_code}"
        print("  * Tenant A token querying Tenant B order #20991 -> 404 Not Found (PASSED)")

        # Legitimate order lookup under Tenant A must succeed
        valid_order = client.get(
            "/api/v1/orders/10482?customer_email=sarah.connor@example.com",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert valid_order.status_code == 200, f"Expected 200, got {valid_order.status_code}"
        assert valid_order.json()["status"] == "DELIVERED"
        print("  * Tenant A token querying own order #10482 -> 200 OK (PASSED)")

        print("\n" + "=" * 65)
        print("SUMMARY: ALL HTTP-LEVEL MULTI-TENANCY & AUTH TESTS PASSED (100%)")
        print("=" * 65)

if __name__ == "__main__":
    run_http_tests()

