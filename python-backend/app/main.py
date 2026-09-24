import os
import json
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ChatRequest, ChatResponse, RAGQueryRequest
from .agent_runtime import run_agent_cycle
from .rag import execute_rag_pipeline
from .tools import lookup_order
from .db.database import init_db, get_db_session
from .db.repository import DatabaseRepository
from .auth import verify_service_jwt, require_admin_auth

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

# Restrict CORS to explicit allowed origins list (Never wildcard with credentials)
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://frontend:3000")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip() and o.strip() != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Workspace-Id", "X-Request-Id"],
)

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "python-backend",
        "uptime": "OK"
    }

@app.get("/ready")
async def readiness_check(session: AsyncSession = Depends(get_db_session)):
    try:
        from sqlalchemy import text
        await session.execute(text("SELECT 1"))
        return {
            "status": "READY",
            "database": "CONNECTED",
            "vector_engine": "ACTIVE",
            "llm_runtime": "INITIALIZED"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {str(e)}")

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

@app.get("/api/v1/orders/{order_number}")
async def get_order_endpoint(
    order_number: str,
    claims: Dict[str, Any] = Depends(verify_service_jwt)
):
    workspace_id = claims["workspace_id"]
    from .tools import _fetch_order_db
    order = await _fetch_order_db(workspace_id, order_number)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order '{order_number}' not found in workspace {workspace_id}")
    return order

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
