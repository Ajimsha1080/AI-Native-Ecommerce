import os
import sys
import jwt
import asyncio
import unittest

# Set valid production-grade secrets for test execution
VALID_SERVICE_SECRET = "super_secure_production_service_jwt_secret_123456789_aaas"
os.environ["INTERNAL_SERVICE_SECRET"] = VALID_SERVICE_SECRET
os.environ["SERVICE_JWT_SECRET"] = VALID_SERVICE_SECRET
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_acceptance.db"

from app.auth import decode_token, verify_service_jwt, get_service_secret, DISALLOWED_DEFAULT_SECRETS
from app.tools import lookup_order, _fetch_order_db
from app.rag import execute_rag_pipeline
from app.db.database import init_db
from fastapi import HTTPException

class TestAcceptanceHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        asyncio.run(init_db())

    def test_01_service_secret_strength_validation(self):
        """Service secret rejects missing, short, or known insecure strings."""
        old_env = os.environ.get("INTERNAL_SERVICE_SECRET")
        try:
            # Short secret
            os.environ["INTERNAL_SERVICE_SECRET"] = "too_short"
            with self.assertRaises(RuntimeError):
                get_service_secret()

            # Disallowed repo default secret
            os.environ["INTERNAL_SERVICE_SECRET"] = DISALLOWED_DEFAULT_SECRETS[0]
            with self.assertRaises(RuntimeError):
                get_service_secret()
        finally:
            os.environ["INTERNAL_SERVICE_SECRET"] = old_env

    def test_02_old_default_token_rejected_with_401(self):
        """Tokens signed with old default secret string are rejected with 401."""
        old_secret = "super_secret_jwt_key_enterprise_grade_aaas_platform_2026"
        old_token = jwt.encode(
            {"workspace_id": "ws_acme_corp", "sub": "attacker", "exp": 9999999999},
            old_secret,
            algorithm="HS256"
        )
        with self.assertRaises(HTTPException) as ctx:
            decode_token(old_token)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_03_valid_service_jwt_verification(self):
        """Valid service JWT with iss:aaas-node, aud:aaas-python, exp succeeds."""
        import time
        token = jwt.encode(
            {
                "workspace_id": "ws_acme_corp",
                "sub": "service_node_01",
                "role": "ADMIN",
                "iss": "aaas-node",
                "aud": "aaas-python",
                "exp": int(time.time()) + 3600
            },
            VALID_SERVICE_SECRET,
            algorithm="HS256"
        )
        claims = verify_service_jwt(f"Bearer {token}")
        self.assertEqual(claims["workspace_id"], "ws_acme_corp")
        self.assertEqual(claims["role"], "ADMIN")

    def test_04_service_jwt_rejects_wrong_audience_or_issuer(self):
        """Service JWT rejects invalid audience or issuer with 401."""
        import time
        token = jwt.encode(
            {
                "workspace_id": "ws_acme_corp",
                "sub": "attacker",
                "iss": "wrong-issuer",
                "aud": "wrong-audience",
                "exp": int(time.time()) + 3600
            },
            VALID_SERVICE_SECRET,
            algorithm="HS256"
        )
        with self.assertRaises(HTTPException) as ctx:
            verify_service_jwt(f"Bearer {token}")
        self.assertEqual(ctx.exception.status_code, 401)

    def test_05_order_lookup_requires_matching_customer_email(self):
        """Order lookup requires customer email and matches case-insensitively; mismatch returns not found."""
        # 1. Matching email succeeds
        res = lookup_order("ws_acme_corp", "#10482", "sarah.connor@example.com")
        self.assertTrue(res.get("found"))
        self.assertEqual(res["order"]["order_number"], "#10482")

        # 2. Mismatched email returns not found (no enumeration)
        res_mismatch = lookup_order("ws_acme_corp", "#10482", "attacker@evil.com")
        self.assertFalse(res_mismatch.get("found"))

        # 3. Missing email returns not found
        res_missing = lookup_order("ws_acme_corp", "#10482", "")
        self.assertFalse(res_missing.get("found"))

    def test_06_empty_tenant_rag_returns_zero_citations(self):
        """Empty workspace returns 0 citations and no invented policy text."""
        res = execute_rag_pipeline(
            question="What is the store return and warranty policy?",
            workspace_id="ws_empty_tenant",
            tenant_chunks=[]
        )
        self.assertEqual(len(res.get("citations", [])), 0)
        self.assertIn("do not have", res["natural_answer"].lower())

if __name__ == "__main__":
    unittest.main(verbosity=2)
