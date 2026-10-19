import os
import json
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ChatRequest, ChatResponse, RAGQueryRequest, KnowledgeIngestRequest, ToolExecuteRequest, EvaluationRunRequest
from .agent_runtime import run_agent_cycle
from .rag import execute_rag_pipeline
from .tools import lookup_order, execute_typed_tool
from .db.database import init_db, get_db_session
from .db.repository import DatabaseRepository
from .auth import verify_service_jwt, require_admin_auth
from .llm import LLMClient

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Enterprise Database Schema & Seeding
    await init_db()
    yield

app = FastAPI(
    title="ShopMate AaaS Enterprise Python AI Engine",
    version="2.0.0",
    description="Enterprise Python FastAPI backend powering Database-backed 12-stage RAG, Multi-step Agent Runtime, and E-commerce Tools.",
    lifespan=lifespan
)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Workspace-Id", "X-Request-Id"],
)

from .api.v1.auth import router as auth_router
from .api.v1.workspaces import router as workspaces_router
from .api.v1.commerce import router as commerce_router
from .api.v1.payments import router as payments_router
from .api.v1.webhooks import router as webhooks_router
from .api.v1.agents import router as agents_router
from .api.v1.conversations import router as conversations_router
from .api.v1.analytics import router as analytics_router
from .api.v1.integrations import router as integrations_router
from .api.v1.evaluations import router as evaluations_router
from .api.v1.knowledge import router as knowledge_router
from .api.v1.deployments import router as deployments_router
from .api.v1.admin import router as admin_router
from .ai_mode import router as ai_mode_router

app.include_router(auth_router)
app.include_router(workspaces_router)
app.include_router(commerce_router)
app.include_router(payments_router)
app.include_router(webhooks_router)
app.include_router(agents_router)
app.include_router(conversations_router)
app.include_router(analytics_router)
app.include_router(integrations_router)
app.include_router(evaluations_router)
app.include_router(knowledge_router)
app.include_router(deployments_router)
app.include_router(admin_router)
app.include_router(ai_mode_router, prefix="/api/ai-mode")
app.include_router(ai_mode_router, prefix="/api/v1/ai-mode")


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "python-backend",
        "uptime": "OK"
    }

@app.get("/ready")
@app.get("/api/ready")
async def readiness_check(session: AsyncSession = Depends(get_db_session)):
    try:
        from sqlalchemy import text
        await session.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {str(e)}")

    client = LLMClient()
    app_env = (os.getenv("APP_ENV") or os.getenv("NODE_ENV") or "production").lower()
    if app_env == "production" and not client.is_configured():
        raise HTTPException(
            status_code=503,
            detail="LLM runtime is not configured for production environment."
        )

    return {
        "status": "READY",
        "database": "CONNECTED",
        "vector_engine": "ACTIVE",
        "llm_runtime": "INITIALIZED" if client.is_configured() else ("TEST_ENABLED" if os.getenv("ALLOW_TEST_DETERMINISTIC_LLM", "").lower() == "true" else "UNCONFIGURED")
    }

@app.get("/api/v1/db/status")
async def get_db_status(
    admin_claims: Dict[str, Any] = Depends(require_admin_auth),
    session: AsyncSession = Depends(get_db_session)
):
    """Returns the live status of the Enterprise Database (Protected: Admin/Service Token Required)."""
    repo = DatabaseRepository(session)
    products = await repo.get_all_products(workspace_id=admin_claims["workspace_id"])
    chunks = await repo.get_tenant_chunks(workspace_id=admin_claims["workspace_id"])
    return {
        "status": "CONNECTED",
        "workspace_id": admin_claims["workspace_id"],
        "tenant_products": len(products),
        "tenant_knowledge_chunks": len(chunks),
        "persistence": "Enterprise Relational & Vector Storage Active"
    }

@app.post("/api/v1/agents/{agent_id}/chat", response_model=ChatResponse)
async def chat_agent(
    agent_id: str,
    req: ChatRequest,
    claims: Dict[str, Any] = Depends(verify_service_jwt)
):
    """
    Executes a full multi-step agent reasoning cycle with 12-stage RAG and tools.
    Workspace ID is strictly derived from the verified service JWT.
    """
    token_workspace_id = claims["workspace_id"]
    if req.workspace_id and req.workspace_id != token_workspace_id and claims.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Cross-tenant workspace mismatch")

    try:
        result = run_agent_cycle(
            agent_id=agent_id,
            message=req.message,
            conversation_id=req.conversation_id,
            workspace_id=token_workspace_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/agents/{agent_id}/chat/stream")
async def chat_agent_stream(
    agent_id: str,
    req: ChatRequest,
    claims: Dict[str, Any] = Depends(verify_service_jwt)
):
    token_workspace_id = claims["workspace_id"]
    if req.workspace_id and req.workspace_id != token_workspace_id and claims.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Cross-tenant workspace mismatch")

    async def event_generator():
        result = run_agent_cycle(
            agent_id=agent_id,
            message=req.message,
            conversation_id=req.conversation_id,
            workspace_id=token_workspace_id
        )

        yield f"event: stage\ndata: {json.dumps({'stage': 'INTENT_UNDERSTANDING', 'intent': result.get('intent')})}\n\n"
        await asyncio.sleep(0.02)

        if result.get("trace", {}).get("retrieved_citations"):
            yield f"event: stage\ndata: {json.dumps({'stage': 'RAG_RETRIEVAL', 'citations': len(result['trace']['retrieved_citations'])})}\n\n"
            await asyncio.sleep(0.02)

        full_text = result.get("response", "")
        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"event: token\ndata: {json.dumps({'token': chunk})}\n\n"
            await asyncio.sleep(0.015)

        yield f"event: done\ndata: {json.dumps(result)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/v1/rag/query")
async def query_rag_pipeline(
    req: RAGQueryRequest,
    claims: Dict[str, Any] = Depends(verify_service_jwt)
):
    token_workspace_id = claims["workspace_id"]
    if req.workspace_id and req.workspace_id != token_workspace_id and claims.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Cross-tenant workspace mismatch")

    try:
        from .rag import fetch_tenant_chunks_from_db
        chunks = await fetch_tenant_chunks_from_db(token_workspace_id)
        return execute_rag_pipeline(req.question, workspace_id=token_workspace_id, tenant_chunks=chunks, top_k=req.top_k or 3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/knowledge/ingest")
async def ingest_knowledge_endpoint(
    req: KnowledgeIngestRequest,
    claims: Dict[str, Any] = Depends(verify_service_jwt),
    session: AsyncSession = Depends(get_db_session)
):
    token_workspace_id = claims["workspace_id"]
    if req.workspace_id and req.workspace_id != token_workspace_id and claims.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Cross-tenant workspace mismatch")

    target_ws = req.workspace_id or token_workspace_id
    
    # Split content into distinct paragraphs/chunks
    raw_chunks = [c.strip() for c in req.content.split("\n\n") if c.strip()]
    if not raw_chunks:
        raw_chunks = [req.content]
    
    from .rag import generate_embedding
    chunks_data = []
    for rc in raw_chunks:
        chunks_data.append({
            "text": rc,
            "embedding": generate_embedding(rc),
            "metadata": req.metadata or {}
        })

    repo = DatabaseRepository(session)
    doc = await repo.add_knowledge_doc_with_chunks(
        workspace_id=target_ws,
        title=req.title,
        content=req.content,
        chunks=chunks_data
    )
    return {
        "success": True,
        "document_id": doc.id,
        "title": doc.title,
        "chunks_created": len(chunks_data),
        "workspace_id": target_ws
    }

import time
from collections import defaultdict
from fastapi import Request

_order_rate_limit_store = defaultdict(list)

def check_order_rate_limit(client_ip: str, workspace_id: str, limit: int = 10, window_sec: int = 60):
    key = f"{client_ip}:{workspace_id}"
    now = time.time()
    timestamps = [ts for ts in _order_rate_limit_store[key] if now - ts < window_sec]
    if len(timestamps) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many order lookup attempts. Please wait before retrying."
        )
    timestamps.append(now)
    _order_rate_limit_store[key] = timestamps

@app.get("/api/v1/orders/{order_number}")
async def get_order_endpoint(
    order_number: str,
    request: Request,
    customer_email: str = Query(..., description="Customer email for verification"),
    claims: Dict[str, Any] = Depends(verify_service_jwt)
):
    workspace_id = claims["workspace_id"]
    client_ip = request.client.host if request.client else "unknown_ip"
    check_order_rate_limit(client_ip, workspace_id)

    from .tools import _fetch_order_db
    order = await _fetch_order_db(workspace_id, order_number, customer_email)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order '{order_number}' not found with the provided email address.")
@app.post("/api/v1/tools/execute")
async def execute_tool_endpoint(
    req: ToolExecuteRequest,
    claims: Dict[str, Any] = Depends(verify_service_jwt)
):
    token_workspace_id = claims["workspace_id"]
    if req.workspace_id and req.workspace_id != token_workspace_id and claims.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Cross-tenant workspace mismatch")

    target_ws = req.workspace_id or token_workspace_id
    try:
        start_time = time.time()
        tool_res = execute_typed_tool(req.tool_id, req.parameters, workspace_id=target_ws)
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            "tool_id": req.tool_id,
            "status": "SUCCESS" if "error" not in tool_res else "FAILED",
            "message": tool_res.get("error") or "Tool execution succeeded",
            "data": tool_res,
            "latency_ms": latency_ms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tool execution failed: {str(e)}")

@app.post("/api/v1/evaluations/run")
async def run_evaluations_endpoint(
    req: EvaluationRunRequest,
    claims: Dict[str, Any] = Depends(verify_service_jwt),
    session: AsyncSession = Depends(get_db_session)
):
    token_workspace_id = claims["workspace_id"]
    if req.workspace_id and req.workspace_id != token_workspace_id and claims.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Cross-tenant workspace mismatch")

    target_ws = req.workspace_id or token_workspace_id
    from sqlalchemy import select
    from .db.models import EvaluationCaseModel, EvaluationRunModel, AgentModel
    import uuid

    agent_stmt = select(AgentModel).where(AgentModel.id == req.agent_id, AgentModel.tenant_id == target_ws)
    agent_res = await session.execute(agent_stmt)
    if not agent_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Agent not found in tenant workspace")

    cases_stmt = select(EvaluationCaseModel).where(
        EvaluationCaseModel.agent_id == req.agent_id,
        EvaluationCaseModel.tenant_id == target_ws
    )
    cases_res = await session.execute(cases_stmt)
    cases = cases_res.scalars().all()

    results = []
    total_latency = 0
    passed_count = 0

    for tc in cases:
        start = time.time()
        try:
            agent_output = run_agent_cycle(
                agent_id=req.agent_id,
                message=tc.user_input,
                workspace_id=target_ws
            )
            latency = int((time.time() - start) * 1000)
            total_latency += latency

            tools_called = [t.get("tool_name") for t in agent_output.get("trace", {}).get("tool_executions", [])]
            tools_match = len(tc.expected_tools) == 0 or all(exp in tools_called for exp in tc.expected_tools)
            resp_lower = agent_output.get("response", "").lower()
            keywords_match = len(tc.expected_keywords) == 0 or any(kw.lower() in resp_lower for kw in tc.expected_keywords)

            is_passed = tools_match and keywords_match
            if is_passed:
                passed_count += 1

            eval_run = EvaluationRunModel(
                id=f"erun_{uuid.uuid4().hex[:12]}",
                tenant_id=target_ws,
                agent_id=req.agent_id,
                case_id=tc.id,
                passed=is_passed,
                score=100.0 if is_passed else 50.0,
                latency_ms=latency,
                actual_output=agent_output.get("response", "")[:500]
            )
            session.add(eval_run)

            results.push if hasattr(results, 'push') else results.append({
                "case_id": tc.id,
                "case_name": tc.name,
                "passed": is_passed,
                "score": 100 if is_passed else 50,
                "latency_ms": latency
            })
        except Exception as err:
            results.append({
                "case_id": tc.id,
                "case_name": tc.name,
                "passed": False,
                "score": 0,
                "error": str(err)
            })

    await session.commit()
    total_cases = len(cases) or 1
    return {
        "success": True,
        "agent_id": req.agent_id,
        "workspace_id": target_ws,
        "total_cases": len(cases),
        "passed_cases": passed_count,
        "pass_rate": round((passed_count / total_cases) * 100, 2),
        "avg_latency_ms": round(total_latency / total_cases, 2),
        "results": results
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
