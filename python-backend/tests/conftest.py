import os
import time
import pytest
import jwt
from fastapi.testclient import TestClient

import sys

from pathlib import Path

# Ensure test environment secrets are loaded before app imports
os.environ["APP_ENV"] = "development"
os.environ["SERVICE_JWT_SECRET"] = "super_secure_ci_test_service_secret_32bytes_long!"
os.environ["INTERNAL_SERVICE_SECRET"] = "super_secure_ci_test_service_secret_32bytes_long!"

test_db_path = Path(__file__).resolve().parent.parent / "test_aaas.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{test_db_path.as_posix()}"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.auth import get_service_secret
from app.db.database import init_db

@pytest.fixture(autouse=True, scope="session")
def setup_test_db():
    import asyncio
    asyncio.run(init_db())
    yield
    if test_db_path.exists():
        try:
            test_db_path.unlink()
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)

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
