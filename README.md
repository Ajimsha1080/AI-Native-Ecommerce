# ShopMate AaaS — Enterprise E-Commerce Agent-as-a-Service Platform

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

A production-ready, multi-tenant enterprise **E-Commerce Agent-as-a-Service (AaaS)** platform designed to deploy autonomous AI commerce concierges that assist shoppers, execute complex product search constraints, verify live inventory, track shipments via FedEx/UPS, process 30-day returns, and hand off sessions to human operators.

---

## 🏗️ Architecture: User → Workspaces → Agents → Deployments

ShopMate AaaS enforces multi-tenancy at every layer:

```
┌─────────────────────────────────────────────────────────────┐
│                       User Account                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │     Workspace (Tenant)      │
                └──────────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
  Catalog Products       Knowledge Base          Agent Fleet
  & Live Orders        (128-dim Vector RAG)   (Autonomous Reasoner)
                                                      │
                         ┌────────────────────────────┼────────────────────────────┐
                         ▼                            ▼                            ▼
                   Website Widget               Iframe Embed                   REST API
               <script src="/agent.js">      /embed/[deploymentId]      /v1/agents/[id]/chat
```

---

## ✨ Key Platform Features

### 1. Multi-Step Autonomous Reasoning Engine
- **Intent Detection**: Dynamically classifies customer queries (`PRODUCT_SEARCH`, `ORDER_TRACKING`, `RETURN_INQUIRY`, `CART_ACTION`, `HUMAN_HANDOFF`).
- **Policy Enforcement**: Evaluates brand safety rules, price negotiation limits, and prohibited topics before execution.
- **Trace Inspector**: Audits step-by-step tool inputs, RAG citations, latency ms, and token usage in real time.

### 2. 15+ Typed Commerce Tools
- `product_search`: Multi-parameter catalog filtering (category, budget ceiling/floor, size, color, in-stock status).
- `product_details`: Complete variant specs, image galleries, and pricing.
- `inventory_lookup`: Real-time warehouse variant availability.
- `order_lookup` & `order_tracking`: Live fulfillment status and carrier tracking links (FedEx/UPS/USPS).
- `coupon_validation`: Discount code qualification (e.g., `WELCOME10`, `VIP20`).
- `return_eligibility` & `create_return`: 30-day window policy check and prepaid label generation.
- `add_to_cart` & `cart_lookup`: Interactive cart building and direct checkout links.
- `human_handoff`: Seamless escalation to store support operators.

### 3. 128-Dimensional Semantic RAG Pipeline
- Text chunking with normalized n-gram dense embedding generation.
- High-precision cosine similarity search with keyword boost.
- Ingestion of PDF, Markdown, plaintext documents, and web URLs with SSRF protection.

### 4. 12-Module Agent Studio
1. **Overview**: Key agent stats, version summary, and quick links.
2. **Design & Persona**: Custom avatar, branding theme, tone, and system prompt.
3. **Knowledge Base**: Document indexing and similarity threshold controls.
4. **Commerce Catalog**: Direct store inventory and SKU management.
5. **Tools & Permissions**: Granular risk-level toggles (`LOW`, `MEDIUM`, `HIGH`).
6. **Guardrails & Rules**: Safety boundaries and prohibited keywords.
7. **Memory & Context**: History window management and state retention.
8. **Playground**: Interactive live chat paired with real-time execution trace visualizer.
9. **Evaluations**: Automated test suites calculating task success rate %, tool accuracy %, and citation attribution.
10. **Version History**: Immutable snapshots (`v1.0`, `v1.1`) with 1-click rollback.
11. **Deploy & Embed**: `<script>` snippet, iframe sandbox, and API endpoints.
12. **Live Inbox**: Real-time conversation stream with human operator takeover.

---

## 🚀 Quick Start

### 1. Install & Build
```bash
# Install dependencies
npm install

# Run automated verification suite
npx tsx scripts/test-integration.ts

# Build production bundle
npm run build

# Start local server
npm run dev
```

### 2. Demo Accounts
Open `http://localhost:3000/auth/login`:

| Role | Email | Password | Scope |
|---|---|---|---|
| **Store Merchant** | `merchant@shopmate.com` | `password123` | Acme Commerce Workspace (`ws_acme_corp`) |
| **SuperAdmin** | `admin@aaas-platform.com` | `admin123` | Platform Control & Global Health |

---

## 🔌 Deployment & Integration Examples

### 1. Website Embed Widget
Add this single snippet before the closing `</body>` tag of any HTML page or Shopify/WooCommerce theme:

```html
<script 
  src="http://localhost:3000/agent.js" 
  data-deployment="dep_live_widget_01" 
  defer>
</script>
```

### 2. Customer-Facing Standalone Iframe
```html
<iframe 
  src="http://localhost:3000/embed/dep_live_widget_01" 
  width="400" 
  height="600" 
  frameborder="0">
</iframe>
```

### 3. Programmatic REST API
```bash
curl -X POST http://localhost:3000/api/v1/agents/agent_shopmate_01/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ak_live_acme_2026_secret_key" \
  -d '{
    "message": "Find black running shoes under $160 in size 9",
    "channel": "mobile_app"
  }'
```

---

## 🧪 Test Suite Summary

Run the automated test suite with:
```bash
npx tsx scripts/test-integration.ts
```

Output:
```
========================================================
🚀 RUNNING SHOPMATE AAAS PLATFORM VERIFICATION SUITE
========================================================

[TEST] 1. Database Engine & Seed Integrity ... ✅ PASSED
[TEST] 2. Authentication, Hashing & JWT RBAC ... ✅ PASSED
[TEST] 3. 128-dim RAG Semantic Chunking & Cosine Retrieval ... ✅ PASSED
[TEST] 4. Commerce Engine & Tool Execution Engine ... ✅ PASSED
[TEST] 5. Multi-Step Agent Runtime with Trace Logging ... ✅ PASSED
[TEST] 6. Automated Evaluations Runner Suite ... ✅ PASSED

========================================================
📊 TEST SUITE SUMMARY: 6 PASSED | 0 FAILED
========================================================
```

---

## 📄 License
MIT © 2026 ShopMate AaaS Platform Inc.
