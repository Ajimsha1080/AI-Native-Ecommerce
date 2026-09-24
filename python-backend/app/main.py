from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ChatRequest, ChatResponse, RAGQueryRequest
from .agent_runtime import run_agent_cycle
from .rag import execute_rag_pipeline
from .db.database import init_db, get_db_session
from .db.repository import DatabaseRepository

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Enterprise Database Schema & Seeding
    await init_db()
    yield
    # Shutdown: cleanup if needed

app = FastAPI(
    title="ShopMate AaaS Enterprise Python AI Engine",
    version="2.0.0",
    description="Enterprise Python FastAPI backend powering Database-backed 12-stage RAG, Multi-step Agent Runtime, and E-commerce Tools.",
    lifespan=lifespan
)

# Enable CORS for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "engine": "FastAPI + Python 3.14",
        "database": "SQLAlchemy 2.0 Async (PostgreSQL / SQLite fallback)",
        "rag_pipeline": "12-Stage Hybrid RRF + Cross-Rerank with DB Vector Store"
    }

@app.get("/api/v1/db/status")
async def get_db_status(session: AsyncSession = Depends(get_db_session)):
    """Returns the live status of the Enterprise Database."""
    repo = DatabaseRepository(session)
    products = await repo.get_all_products()
    chunks = await repo.get_all_chunks()
    return {
        "status": "CONNECTED",
        "total_products": len(products),
        "total_knowledge_chunks": len(chunks),
        "persistence": "Enterprise Relational & Vector Storage Active"
    }

@app.post("/api/v1/agents/{agent_id}/chat", response_model=ChatResponse)
def chat_agent(
    agent_id: str,
    req: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Executes a full multi-step agent reasoning cycle with 12-stage RAG and tools for a specific tenant.
    """
    try:
        result = run_agent_cycle(
            agent_id=agent_id,
            message=req.message,
            conversation_id=req.conversation_id,
            workspace_id=req.workspace_id or "ws_acme_corp"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse
import json
import asyncio

@app.post("/api/v1/agents/{agent_id}/chat/stream")
async def chat_agent_stream(
    agent_id: str,
    req: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Executes a real-time multi-step agent reasoning cycle and streams tokens via Server-Sent Events (SSE).
    """
    async def event_generator():
        # Step 1: Run agent cycle to get full plan and response
        result = run_agent_cycle(
            agent_id=agent_id,
            message=req.message,
            conversation_id=req.conversation_id,
            workspace_id=req.workspace_id or "ws_acme_corp"
        )
        
        # Stream stage: Intent & Planning
        yield f"event: stage\ndata: {json.dumps({'stage': 'INTENT_UNDERSTANDING', 'intent': result.get('intent')})}\n\n"
        await asyncio.sleep(0.02)

        # Stream stage: RAG Retrieval
        if result.get("trace", {}).get("retrieved_citations"):
            yield f"event: stage\ndata: {json.dumps({'stage': 'RAG_RETRIEVAL', 'citations': len(result['trace']['retrieved_citations'])})}\n\n"
            await asyncio.sleep(0.02)

        # Stream tokens
        full_text = result.get("response", "")
        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"event: token\ndata: {json.dumps({'token': chunk})}\n\n"
            await asyncio.sleep(0.015)

        # Stream final complete payload with interactive cards & trace
        yield f"event: done\ndata: {json.dumps(result)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/v1/rag/query")
def query_rag_pipeline(req: RAGQueryRequest):
    """
    Executes the 12-stage RAG Pipeline directly and returns the full diagnostic trace for a specific tenant.
    """
    try:
        return execute_rag_pipeline(req.question, workspace_id=req.workspace_id or "ws_acme_corp", top_k=req.top_k or 3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
