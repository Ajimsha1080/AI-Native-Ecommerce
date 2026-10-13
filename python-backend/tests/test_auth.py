import pytest
import time
import jwt
from fastapi import HTTPException
from app.auth import decode_token, verify_service_jwt, require_admin_auth

def test_decode_token_valid(create_test_token):
    token = create_test_token(workspace_id="ws_acme", role="ADMIN")
    payload = decode_token(token)
    assert payload["workspace_id"] == "ws_acme"
    assert payload["role"] == "ADMIN"
    assert payload["aud"] == "aaas-python"
    assert payload["iss"] == "aaas-node"

def test_decode_token_expired(create_test_token):
    token = create_test_token(workspace_id="ws_acme", expires_in=-100)
    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 401
    assert "expired" in str(exc.value.detail).lower()

def test_decode_token_invalid_audience(create_test_token):
    token = create_test_token(workspace_id="ws_acme", aud="wrong-audience")
    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 401
    assert "invalid service token" in str(exc.value.detail).lower()

def test_decode_token_invalid_issuer(create_test_token):
    token = create_test_token(workspace_id="ws_acme", iss="wrong-issuer")
    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 401
    assert "invalid service token" in str(exc.value.detail).lower()

def test_verify_service_jwt_missing_header():
    with pytest.raises(HTTPException) as exc:
        verify_service_jwt(authorization=None)
    assert exc.value.status_code == 401

def test_verify_service_jwt_not_bearer():
    with pytest.raises(HTTPException) as exc:
        verify_service_jwt(authorization="Basic dXNlcjpwYXNz")
    assert exc.value.status_code == 401

def test_verify_service_jwt_success(create_test_token):
    token = create_test_token(workspace_id="ws_verified", role="OWNER")
    claims = verify_service_jwt(authorization=f"Bearer {token}")
    assert claims["workspace_id"] == "ws_verified"
    assert claims["role"] == "OWNER"
    assert claims["is_super_admin"] is True

def test_require_admin_auth_success():
    admin_claims = {"workspace_id": "ws_1", "role": "ADMIN", "is_super_admin": False}
    result = require_admin_auth(admin_claims)
    assert result == admin_claims

def test_require_admin_auth_forbidden_for_member():
    member_claims = {"workspace_id": "ws_1", "role": "MEMBER", "is_super_admin": False}
    with pytest.raises(HTTPException) as exc:
        require_admin_auth(member_claims)
    assert exc.value.status_code == 403
