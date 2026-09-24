# ShopMate AaaS — Enterprise Multi-Tenant E-Commerce AI Agent Platform

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_+_pgvector-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

A hardened, multi-tenant enterprise **E-Commerce Agent-as-a-Service (AaaS)** platform. Features a unified Next.js 15 frontend and an asynchronous Python 3.12 FastAPI intelligence engine backed by PostgreSQL and pgvector.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Layer (Browser / Embed)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Public HTTPS)
                ┌──────────────┴──────────────┐
                │    Next.js 15 UI Layer      │
                └──────────────┬──────────────┘
                               │ (Service JWT / Signed Token)
                ┌──────────────┴──────────────┐
                │   FastAPI Python Engine     │
                └──────────────┬──────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   PostgreSQL 16         Redis 7 Cache        Vector Store
 (DatabaseRepository)  (Token Rate Limits)     (pgvector)
```

---

## ✨ Verified Capabilities

### 1. Multi-Tenant Agent Intelligence & Tool Engine
- **Deterministic & LLM Reasoning**: Dynamically maps queries to catalog filtering, inventory checks, order status tracking, return generation, and human handoff.
- **Strict Tenant Data Isolation**: Database queries, embeddings, and customer records are filtered strictly by `workspace_id`.
- **Zero Policy Text Invention**: If a tenant has zero ingested knowledge base chunks, the engine safely refuses without hallucinating return or warranty terms.

### 2. Typed Commerce Execution Tools
- `product_search`: Category, price, variant, size, and in-stock filtering.
- `inventory_lookup`: Multi-warehouse availability verification.
- `order_lookup`: Real-time fulfillment tracking (FedEx, UPS, USPS).
- `return_eligibility`: 30-day window policy evaluation and label generation.
- `human_handoff`: Operator escalation and staff console inbox takeover.

### 3. Enterprise Security & Auditability
- **SSRF & Loopback Blocking**: DNS-validated HTTP requests rejecting private IP ranges.
- **Sliding-Window Rate Limiting**: IP and token burst management.
- **Append-Only Audit Logs**: Server-side recording of sensitive administrative actions.
- **Image URL Sanitization**: Safe markdown image rendering preventing cross-site scripting.

---

## 🧪 Verification Commands

```bash
# 1. TypeScript & Integration Verification
npx tsc --noEmit
npm run test:integration
npx tsx scripts/test-security.ts

# 2. Python FastAPI Tenancy & Pipeline Tests
python python-backend/test_pipeline.py
python python-backend/test_http_endpoints.py

# 3. Production Build
npm run build
```

---

## 📄 License
MIT © 2026 ShopMate AaaS Platform Inc.

