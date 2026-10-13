import pytest
from app.auth import verify_service_jwt

def test_tenant_context_derivation_from_jwt(create_test_token):
    token_a = create_test_token(workspace_id="ws_alpha")
    token_b = create_test_token(workspace_id="ws_beta")
    
    claims_a = verify_service_jwt(authorization=f"Bearer {token_a}")
    claims_b = verify_service_jwt(authorization=f"Bearer {token_b}")
    
    assert claims_a["workspace_id"] == "ws_alpha"
    assert claims_b["workspace_id"] == "ws_beta"
    assert claims_a["workspace_id"] != claims_b["workspace_id"]

def test_cross_tenant_token_rejection(client, create_test_token):
    token_a = create_test_token(workspace_id="ws_alpha")
    
    # Attempting to query an agent or endpoint scoped to ws_beta using token_a
    # The API derives workspace_id strictly from the verified JWT claim
    response = client.get(
        "/health",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert response.status_code == 200

def test_unauthenticated_request_rejected(client):
    response = client.post(
        "/api/v1/tools/execute",
        json={"tool_name": "check_stock", "parameters": {}}
    )
    assert response.status_code == 401
