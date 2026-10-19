# ShopMate AaaS — Enterprise Multi-Tenant AI E-Commerce Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![SQLAlchemy 2.x](https://img.shields.io/badge/SQLAlchemy-2.x_AsyncIO-red?style=flat)](https://www.sqlalchemy.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16_+_pgvector-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Redis 7](https://img.shields.io/badge/Redis-7_Distributed_Rate_Limit-DC382D?style=flat&logo=redis)](https://redis.io/)
[![Pytest](https://img.shields.io/badge/Pytest-33%2F33_Passing-brightgreen?style=flat)](python-backend/tests/)
[![Sarvam AI](https://img.shields.io/badge/Sarvam_AI-105B_Conversations-orange?style=flat)](https://www.sarvam.ai/)

A production-grade, hardened, multi-tenant enterprise **AI-Native E-Commerce SaaS (AaaS)** platform. Features a modern **100% Pure Python Server-Side Backend** (FastAPI, SQLAlchemy 2.x AsyncIO, asyncpg, Redis 7, and PostgreSQL 16 with pgvector) coupled with a sleek **Next.js 15.5 React 19 Frontend UI** and an embeddable storefront AI concierge widget.

---

## 🏛️ System Architecture

```
                                  [ Customer / Merchant ]
                                             │
                        ┌────────────────────┴────────────────────┐
                        │                                         │
           [ Next.js 15.5 Frontend (:3000) ]           [ Embed Storefront Widget ]
             • Merchant Dashboard & UI                              │
             • React 19 Client Components                           │
             • Client Cache & Theme Presets                         │
                        │                                           │
            next.config.js rewrites:                                │
              /api/:path* ────┐                                     │
                              ▼                                     │
                ┌───────────────────────────────────────────────────┘
                ▼
  [ FastAPI Pure Python Server-Side Backend (:8000) ]
    ├── app/core/
    │     ├── config.py         (Environment & secret validation)
    │     ├── security.py       (Argon2/Bcrypt pw, HS256 JWT, pyotp TOTP MFA, CSRF)
    │     └── redis_client.py   (Sliding-window distributed rate limiter & 15m lockout)
    ├── app/api/
    │     ├── dependencies.py   (Tenant derivation & PostgreSQL RLS session injection)
    │     └── v1/
    │           ├── auth.py         (Login, signup, session /me, MFA, CSRF)
    │           ├── workspaces.py   (Tenant management, settings, members, export, deletion)
    │           ├── commerce.py     (Catalog CRUD, orders tracking, checkout commit)
    │           ├── payments.py     (Razorpay orders/links/verify, Stripe portal)
    │           ├── webhooks.py     (Razorpay & Stripe HMAC signature verification & idempotency)
    │           ├── agents.py       (Shopping agent configs, versions, execution)
    │           ├── conversations.py(Message threads, operator takeover)
    │           ├── analytics.py    (Revenue, containment, audit logs, API keys)
    │           ├── integrations.py (Shopify, WooCommerce, Blue Dart connectors)
    │           ├── evaluations.py  (RAG benchmark suites & eval runs)
    │           ├── knowledge.py    (PDF upload, chunking, 12-stage RAG query)
    │           ├── deployments.py  (Widget deployment lifecycle & resolver)
    │           └── admin.py        (Cross-tenant SuperAdmin metrics)
    ├── app/ai_mode.py          (Storefront embed widget script & hybrid search)
    ├── app/db/
    │     ├── database.py       (SQLAlchemy 2.x async engine & connection pool)
    │     ├── models.py         (Declarative SQLAlchemy 2.x models matching PG schema)
    │     ├── repository.py     (Tenant-scoped data access repositories)
    │     └── seed.py           (RLS-safe database seeding)
    ├── app/rag.py              (12-stage RAG pipeline, pgvector, RRF fusion)
    └── app/agent_runtime.py    (Multi-step tool reasoning engine)
                │
                ├── PostgreSQL 16 + pgvector (:5432) [Row-Level Security enforced]
                └── Redis 7 (:6379) [Distributed atomic rate limits & lockouts]
```

---

## 🔒 Enterprise Security & Multi-Tenancy

* **Zero-Trust Multi-Tenant Isolation**: Tenant identity is strictly derived from verified cryptographic JWT session claims. Client-provided tenant IDs are never trusted as authorization.
* **PostgreSQL Row-Level Security (RLS)**: Every database transaction enforces defense-in-depth isolation via:
  ```sql
  SELECT set_config('app.current_tenant', :workspace_id, true);
  SELECT set_config('app.current_user_id', :user_id, true);
  ```
  Tenant Alpha can never query, modify, or leak Tenant Beta's catalog, orders, or documents.
* **Authentication & Cryptography**:
  * Bcrypt password hashing with work-factor 12.
  * HS256 Session JWTs with strict claim, issuer, audience, and expiration validation.
  * RFC 6238 TOTP Multi-Factor Authentication (`pyotp`) with secure recovery codes.
  * Edge CSRF token verification for browser session mutations.
* **Rate Limiting & Lockout**:
  * Redis 7 atomic sliding-window rate limiters.
  * Automatic 15-minute account lockout after 5 consecutive failed login attempts.
* **Payment Webhook Idempotency**:
  * Razorpay HMAC SHA-256 signature verification.
  * Stripe signature header verification.
  * `ProcessedWebhookEventModel` tracking preventing duplicate replay attacks.

---

## 🧠 12-Stage Advanced Hybrid RAG Engine

1. **Query Normalization & Intent Detection**: Cleans input, extracts parameters (size, color, price range, ordinals).
2. **Dense Vector Embeddings**: Generates 1536-dimensional semantic vectors.
3. **Dual-Channel Hybrid Retrieval**:
   * **Dense Channel**: Fast HNSW cosine distance search (`<=>`) in PostgreSQL `pgvector`.
   * **Lexical Channel**: BM25 and keyword full-text matching for exact brand, SKU, and policy term hits.
4. **Reciprocal Rank Fusion (RRF)**: Merges candidates using $k=60$ formula:
   $$\text{RRF Score}(d) = \sum_{m \in \{\text{vector}, \text{lexical}\}} \frac{1}{60 + \text{rank}_m(d)}$$
5. **Context Assembly & Grounding Guard**: Verifies citation similarity thresholds to guarantee zero-hallucination factual confidence.
6. **LLM Synthesis**: Synthesizes responses using Sarvam AI (105B) or configured models with verifiable citations.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* Python 3.12+
* Node.js 20+ & npm 10+
* PostgreSQL 16 with `pgvector`
* Redis 7

### 1. Environment Configuration
Create a `.env` file in the project root:
```env
# Application Mode
APP_ENV=development
NODE_ENV=development

# Service URLs
PYTHON_BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database & Cache
DATABASE_URL=postgresql://shopmate_app:shopmate_secure_app_pwd_2026@127.0.0.1:5432/aaas_enterprise
REDIS_URL=redis://127.0.0.1:6379

# Cryptographic Secrets (32+ chars each)
SESSION_JWT_SECRET=super_secure_enterprise_session_jwt_secret_32bytes_long!
SERVICE_JWT_SECRET=super_secure_enterprise_service_jwt_secret_32bytes_long!
ENCRYPTION_KEY=super_secure_enterprise_encryption_key_32bytes_long!

# LLM Provider (Sarvam AI / OpenAI)
SARVAM_API_KEY=your_sarvam_api_key_here
LLM_PROVIDER=sarvam
LLM_MODEL=sarvam-105b-conversations

# Razorpay (Optional)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### 2. Start the Pure Python Backend
```bash
cd python-backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation (Swagger UI) is available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Start the Next.js Frontend
```bash
# In the repository root:
npm install
npm run dev -- -p 3000
# Or for production:
npm run build
npm run start -- -p 3000
```
Merchant Dashboard & Storefront UI: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Accounts

* **Store Merchant Account**:
  * **Email**: `merchant@shopmate.com`
  * **Password**: `password123`
  * **Workspace**: `ws_acme_corp` (Blue Tyga Store with 34 active catalog products and orders)

* **Platform SuperAdmin Account**:
  * **Email**: `admin@aaas-platform.com`
  * **Password**: `admin123`

---

## 🧪 Comprehensive Verification & Test Suite

```bash
# 1. Run Python Backend Pytest Suite (33/33 tests passing)
cd python-backend
pytest tests/ -v

# 2. Run End-to-End Next.js -> FastAPI Integration Suite
cd ..
python tests/verify_e2e.py

# 3. TypeScript Typecheck (0 errors)
npm run typecheck

# 4. ESLint Check (0 errors)
npm run lint

# 5. Next.js Production Build Test (36 clean UI routes)
npm run build
```

---

## 📄 License
MIT © 2026 ShopMate AaaS Platform Inc.
