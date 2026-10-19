import pytest
import uuid
import hmac
import hashlib
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_session_token, hash_password, verify_password, validate_password_policy
from app.core.config import settings

@pytest.fixture
def client():
    return TestClient(app)

def test_password_policy_validation():
    valid, err = validate_password_policy("Weak")
    assert not valid
    assert "8 characters" in err

    valid, err = validate_password_policy("nouppercase123")
    assert not valid
    assert "uppercase" in err or "special" in err

    valid, err = validate_password_policy("StrongPassword123!")
    assert valid
    assert err is None

def test_password_hashing():
    pwd = "EnterpriseSecret123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed)
    assert not verify_password("WrongSecret", hashed)

def test_session_token_lifecycle():
    token = create_session_token(
        user_id="usr_test_123",
        email="test@enterprise.com",
        workspace_id="ws_test_tenant",
        is_super_admin=False
    )
    from app.core.security import verify_session_token
    payload = verify_session_token(token)
    assert payload is not None
    assert payload["userId"] == "usr_test_123"
    assert payload["workspaceId"] == "ws_test_tenant"

def test_auth_csrf_endpoint(client):
    res = client.get("/api/auth/csrf")
    assert res.status_code == 200
    data = res.json()
    assert "csrfToken" in data
    assert len(data["csrfToken"]) >= 32

def test_auth_login_endpoint(client):
    # Test valid credentials
    res = client.post("/api/auth/login", json={
        "email": "merchant@shopmate.com",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["email"] == "merchant@shopmate.com"
    assert settings.AUTH_COOKIE_NAME in res.cookies

def test_auth_me_endpoint(client):
    # Log in first
    login_res = client.post("/api/auth/login", json={
        "email": "merchant@shopmate.com",
        "password": "password123"
    })
    token = login_res.json()["token"]

    # Call /api/auth/me with Bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["authenticated"] is True
    assert me_data["user"]["email"] == "merchant@shopmate.com"

def test_commerce_products_and_orders(client):
    login_res = client.post("/api/auth/login", json={
        "email": "merchant@shopmate.com",
        "password": "password123"
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List products
    prod_res = client.get("/api/commerce/products", headers=headers)
    assert prod_res.status_code == 200
    products = prod_res.json().get("products", [])
    assert len(products) > 0

    # 2. List orders
    ord_res = client.get("/api/commerce/orders", headers=headers)
    assert ord_res.status_code == 200
    orders = ord_res.json().get("orders", [])
    assert isinstance(orders, list)

def test_checkout_commit(client):
    login_res = client.post("/api/auth/login", json={
        "email": "merchant@shopmate.com",
        "password": "password123"
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Find a product to checkout
    prod_res = client.get("/api/commerce/products", headers=headers)
    prod = prod_res.json()["products"][0]

    checkout_res = client.post("/api/commerce/checkout/commit", json={
        "productId": prod["id"],
        "quantity": 1,
        "customerName": "Test Buyer",
        "customerEmail": "buyer@test.com",
        "shippingAddress": "123 Market Street, Bengaluru",
        "paymentMethod": "UPI"
    }, headers=headers)

    assert checkout_res.status_code == 200
    checkout_data = checkout_res.json()
    assert checkout_data["success"] is True
    assert "#ORD-" in checkout_data["order"]["order_number"]

def test_razorpay_endpoints(client):
    login_res = client.post("/api/auth/login", json={
        "email": "merchant@shopmate.com",
        "password": "password123"
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Razorpay order
    rzp_res = client.post("/api/commerce/razorpay/create-order", json={
        "amount": 1499.0,
        "currency": "INR",
        "customerName": "Rahul Verma",
        "customerEmail": "rahul@test.com"
    }, headers=headers)
    assert rzp_res.status_code == 200
    assert rzp_res.json()["success"] is True

    # Payment link
    link_res = client.post("/api/commerce/razorpay/payment-link", json={
        "amount": 999.0,
        "description": "Tech Tee Purchase"
    }, headers=headers)
    assert link_res.status_code == 200
    assert link_res.json()["success"] is True

def test_analytics_and_billing(client):
    login_res = client.post("/api/auth/login", json={
        "email": "merchant@shopmate.com",
        "password": "password123"
    })
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Analytics
    an_res = client.get("/api/analytics", headers=headers)
    assert an_res.status_code == 200
    assert "total_revenue" in an_res.json()

    # Billing
    bill_res = client.get("/api/billing", headers=headers)
    assert bill_res.status_code == 200
    assert "plan" in bill_res.json()

def test_ai_mode_search_and_chat(client):
    # Test public AI Mode Search
    search_res = client.post("/api/v1/ai-mode/search", json={
        "query": "breathable jacket under 3000",
        "workspace_id": "ws_acme_corp"
    })
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert "products" in search_data
    assert search_data["search_plan"]["intent"] is not None

    # Test AI Mode Chat
    chat_res = client.post("/api/v1/ai-mode/chat", json={
        "user_message": "Do you have any jackets for running?",
        "workspace_id": "ws_acme_corp"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["role"] == "assistant"
    assert len(chat_data["content"]) > 0
