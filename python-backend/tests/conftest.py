import os
import time
import pytest
import jwt
from fastapi.testclient import TestClient

import sys

from pathlib import Path

# Ensure test environment secrets are loaded before app imports
os.environ["APP_ENV"] = "development"
os.environ["TESTING"] = "true"
os.environ["ALLOW_TEST_DETERMINISTIC_LLM"] = "true"
os.environ["ALLOW_TEST_EMBEDDINGS"] = "true"
os.environ["SERVICE_JWT_SECRET"] = "super_secure_ci_test_service_secret_32bytes_long!"
os.environ["INTERNAL_SERVICE_SECRET"] = "super_secure_ci_test_service_secret_32bytes_long!"
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://shopmate_app:shopmate_secure_app_pwd_2026@127.0.0.1:5432/aaas_enterprise"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Install deterministic test fallbacks fixture for offline testing
import app.rag
from tests.fixtures.test_fallbacks import generate_deterministic_aligned_vector
app.rag.generate_embedding = lambda text, dim=1536: generate_deterministic_aligned_vector(text, dim)

from app.main import app as fastapi_app
from app.auth import get_service_secret
from app.db.database import init_db

@pytest.fixture(autouse=True, scope="session")
def setup_test_db():
    import asyncio
    asyncio.run(init_db())
    yield

@pytest.fixture
def client():
    return TestClient(fastapi_app)

@pytest.fixture
def test_secret():
    return get_service_secret()

@pytest.fixture
def create_test_token(test_secret):
    def _create_token(workspace_id: str = "ws_test_alpha", role: str = "ADMIN", expires_in: int = 900, aud: str = "aaas-python", iss: str = "aaas-node"):
        payload = {
            "workspace_id": workspace_id,
            "sub": "user_ci_test",
            "userId": "user_ci_test",
            "role": role,
            "isSuperAdmin": role in ["OWNER", "SUPERADMIN"],
            "iss": iss,
            "aud": aud,
            "exp": int(time.time()) + expires_in,
            "iat": int(time.time())
        }
        return jwt.encode(payload, test_secret, algorithm="HS256")
    return _create_token
