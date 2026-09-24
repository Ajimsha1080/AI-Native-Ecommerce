# Technical Audit: TypeScript Runtime vs. Python Runtime Duplication

This document audits all areas of duplicate business logic between the TypeScript runtime (`src/lib/*`) and the Python runtime (`python-backend/app/*`), outlining the consolidation plan for Phase 1.

---

## 1. Executive Summary

The codebase currently maintains two parallel runtime implementations for the AI Agent orchestration, RAG vector retrieval, commerce tool execution, and multi-tenant persistence:
1. **TypeScript Runtime (`src/lib/*`)**: Originally used by Next.js API route handlers (`/api/agents/[id]/chat`, `/api/rag/query`, `/api/rag/ingest`).
2. **Python Runtime (`python-backend/app/*`)**: FastAPI service running a 12-stage RAG pipeline, SQLAlchemy multi-tenant repository, and tool reasoning engine.

Having dual runtimes creates synchronization drift, security divergence, and maintenance overhead.

---

## 2. Comprehensive Duplication Matrix

| Subsystem | TypeScript Location | Python Location | Duplication Nature |
| :--- | :--- | :--- | :--- |
| **Agent Reasoning & Intent Detection** | [`src/lib/agent-runtime/index.ts`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/src/lib/agent-runtime/index.ts) | [`python-backend/app/agent_runtime.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/app/agent_runtime.py) | Duplicate regex intent classifiers (`PRODUCT_SEARCH`, `ORDER_TRACKING`, `RETURN_INQUIRY`, `CART_ACTION`, `HUMAN_HANDOFF`), response template generators, and turn planners. |
| **RAG Pipeline & Embeddings** | [`src/lib/rag/index.ts`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/src/lib/rag/index.ts) | [`python-backend/app/rag.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/app/rag.py) | Duplicate 128-dimensional dense embedding calculations, cosine similarity functions, BM25/sparse text search, Reciprocal Rank Fusion (RRF), and citation extractors. |
| **Commerce Tool Implementations** | [`src/lib/tools/index.ts`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/src/lib/tools/index.ts) | [`python-backend/app/agent_runtime.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/app/agent_runtime.py) | 11 identical tool implementations: `product_search`, `product_details`, `inventory_lookup`, `order_lookup`, `order_tracking`, `coupon_validation`, `return_eligibility`, `create_return`, `add_to_cart`, `cart_lookup`, `human_handoff`. |
| **Policy Guardrails & Safety** | [`src/lib/agent-runtime/index.ts`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/src/lib/agent-runtime/index.ts) | [`python-backend/app/agent_runtime.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/app/agent_runtime.py) | Duplicate policy validators (`STOCK_GUARD`, `DISCOUNT_CAP`, `REFUND_APPROVAL`, `PROMPT_INJECTION`) and enforcement triggers (`BLOCK`, `REQUIRE_CONFIRMATION`, `ESCALATE`). |
| **Execution Trace Logging** | [`src/lib/agent-runtime/index.ts`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/src/lib/agent-runtime/index.ts) | [`python-backend/app/agent_runtime.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/app/agent_runtime.py) & [`python-backend/app/db/models.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/app/db/models.py) | Duplicate trace generation computing latency milliseconds, input/output token counters, citations retrieved, and tool call statuses. |
| **Database Models & Persistence** | [`src/lib/db/index.ts`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/src/lib/db/index.ts) & [`src/lib/db/seed.ts`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/src/lib/db/seed.ts) | [`python-backend/app/db/repository.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/app/db/repository.py) & [`python-backend/app/db/seed.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/app/db/seed.py) | Duplicate schemas and seed data for Workspaces, Users, Agents, Versions, Policies, Tools, Knowledge Chunks, Products, Orders, and Deployments. |
| **Evaluations Engine** | [`src/lib/evaluations/index.ts`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/src/lib/evaluations/index.ts) | [`python-backend/test_pipeline.py`](file:///c:/Users/91730/Downloads/AaaS%20ecommerce/python-backend/test_pipeline.py) | Duplicate golden test scenarios measuring task success rates, tool selection precision, and citation attribution. |

---

## 3. Consolidation Strategy (Phase 1 Target)

To eliminate technical debt and establish strict single-source-of-truth reliability:
1. **Single Backend of Record**: Python FastAPI backend becomes the sole authority for database transactions (PostgreSQL / SQLite via SQLAlchemy repository), RAG vector retrieval, and LLM agent reasoning.
2. **Next.js as UI + Thin Proxy**: Next.js API routes will proxy authenticated requests to `PYTHON_BACKEND_URL` with signed service JWTs and verified workspace tenancy headers.
3. **Removal of In-Memory / File-based JSON Database**: Deprecate `aaas.db.json` and in-memory object arrays in favor of ACID transactions.
