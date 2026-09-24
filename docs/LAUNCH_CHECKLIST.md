# 🚀 ShopMate AaaS — Production Launch Checklist & Security Audit

This document defines the strict pre-launch verification requirements, environment configuration, security architecture, and residual risk assessment for deploying the ShopMate Multi-Tenant AI Agent Platform.

---

## 1. Pre-Launch Verification Matrix

| Category | Verification Test | Status | Command |
| :--- | :--- | :--- | :--- |
| **Code Quality** | TypeScript Zero-Error Strict Compilation | ✅ PASSED | `npx tsc --noEmit` |
| **Route Coverage** | 32/32 Application & Admin Routes 200 OK | ✅ PASSED | `npm run test:routes` |
| **Platform E2E** | Authentication, RAG Cosine Retrieval & Trace Engine | ✅ PASSED | `npx tsx scripts/test-integration.ts` |
| **Python Backend** | Service JWT Claims & Cross-Tenancy Protection | ✅ PASSED | `python python-backend/test_pipeline.py` |
| **AI Evaluation** | 24-Query Realistic E-Commerce Customer Harness | ✅ PASSED | `python python-backend/test_evals.py` |
| **Security & SSRF** | SSRF Blocking, Rate Limiting, Password Policy & RBAC | ✅ PASSED | `npx tsx scripts/test-security.ts` |

---

## 2. Environment Variables Matrix

### Next.js Frontend Service
| Variable | Required | Default / Description |
| :--- | :---: | :--- |
| `NODE_ENV` | **Yes** | `production` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `PYTHON_BACKEND_URL` | **Yes** | Internal service URL (`http://python-backend:8000`) |
| `JWT_SECRET` | **Yes** | 32+ byte cryptographic secret for service and session JWTs |
| `STRIPE_SECRET_KEY` | Optional | Stripe Live Secret Key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe Webhook HMAC secret (`whsec_...`) |
| `RAZORPAY_KEY_ID` | Optional | Razorpay Merchant Key ID (`rzp_live_...`) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | Razorpay Webhook HMAC secret |
| `SENTRY_DSN` | Optional | Sentry Error Monitoring DSN |

### Python AI & RAG Backend Service
| Variable | Required | Default / Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Yes** | Async PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `JWT_SECRET` | **Yes** | Must match Next.js `JWT_SECRET` for signed service-to-service auth |
| `ALLOWED_ORIGINS` | **Yes** | Comma-separated list of allowed origins (e.g. `http://localhost:3000`) |
| `LLM_PROVIDER` | Optional | `openai`, `anthropic`, `ollama` (falls back to deterministic engine) |
| `OPENAI_API_KEY` | Optional | OpenAI API key for `text-embedding-3-small` and `gpt-4o` |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key for `claude-3-5-sonnet` |
| `OLLAMA_BASE_URL` | Optional | Local Ollama endpoint (`http://localhost:11434`) |

---

## 3. Production Deployment & Security Topology

```mermaid
flowchart TD
    Client["Browser / Mobile / Widget"] -->|Public HTTPS :443| Ingress["Cloudflare / Nginx Reverse Proxy"]
    Ingress -->|Rate Limited / WAF| NextJS["Next.js 15 Standalone Frontend (:3000)"]
    
    subgraph Internal Isolated Network [Private VPC / Docker Network]
        NextJS -->|Signed Service JWT| PythonBackend["Python FastAPI AI Engine (:8000)"]
        NextJS -->|Connection Pool| PostgresDB[("PostgreSQL 16 + pgvector (:5432)")]
        PythonBackend -->|Async SQLAlchemy| PostgresDB
        NextJS -->|Token Bucket| RedisCache[("Redis 7 Cache (:6379)")]
    end
```

### Key Security Guardrails:
1. **Zero External Exposure for Python Backend**: The FastAPI container only exposes port `8000` to the internal Docker network; it cannot be accessed directly by external browsers.
2. **Service JWT Authentication**: All proxy calls from Next.js to FastAPI carry a signed JWT bearing the verified `workspace_id` and caller role.
3. **SSRF Guard (`safeFetch`)**: Webhook dispatches and external store connector queries resolve DNS and strictly reject private/loopback IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `169.254.169.254`, `::1`).
4. **Prompt Injection Boundary (`<<<UNTRUSTED_CATALOG_DATA>>>`)**: All retrieved knowledge chunks and catalog data are encapsulated inside untrusted delimiters with system instructions forbidding execution of text inside data blocks.
5. **Server-Side Computed Arithmetic**: Prices, taxes, shipping rules, and discount caps are calculated exclusively on the server to prevent LLM hallucination or price tampering.

---

## 4. Residual Risks & Ongoing Mitigations

1. **Third-Party LLM Outages**:
   - *Mitigation*: The Python runtime features a built-in deterministic fallback engine that parses intent, executes typed server-side commerce tools, and formats catalog responses if remote model APIs timeout or fail.
2. **Rate Limit Bursts on Widget Chat**:
   - *Mitigation*: Public widget chat is bounded by public token domain validation (`pk_live_...`), origin validation, and sliding-window rate limiters.
3. **Database Migration Synchronization**:
   - *Mitigation*: Relational models are synced between Next.js and Python SQLAlchemy with migration scripts maintained in `data/schema.sql`.
