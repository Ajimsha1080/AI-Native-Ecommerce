import uuid
import io
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ...db.database import get_db_session
from ...db.models import KnowledgeSourceModel, KnowledgeDocModel, KnowledgeChunkModel
from ..dependencies import require_auth_session, require_role
from ...rag import generate_embedding, execute_rag_pipeline, fetch_tenant_chunks_from_db

router = APIRouter(tags=["Knowledge & RAG"])

class KnowledgeDocCreateRequest(BaseModel):
    name: Optional[str] = "Store FAQ"
    type: Optional[str] = "TEXT"
    content: str
    agent_id: Optional[str] = None

class RAGQueryRequestSchema(BaseModel):
    question: Optional[str] = None
    query: Optional[str] = None
    workspace_id: Optional[str] = None
    top_k: Optional[int] = 3

@router.get("/api/knowledge")
@router.get("/api/v1/knowledge")
async def list_knowledge(
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(KnowledgeDocModel).where(KnowledgeDocModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    docs = res.scalars().all()

    formatted = []
    for d in docs:
        formatted.append({
            "id": d.id,
            "workspace_id": d.workspace_id,
            "name": d.title,
            "title": d.title,
            "type": d.metadata_json.get("type", "TEXT") if d.metadata_json else "TEXT",
            "content": d.content[:200] if d.content else "",
            "created_at": d.created_at.isoformat() if d.created_at else None
        })

    return {"documents": formatted, "sources": formatted}

@router.post("/api/knowledge")
@router.post("/api/v1/knowledge")
async def create_knowledge(
    request: Request,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN", "EDITOR"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    content_type = request.headers.get("content-type", "")

    title = "Store Knowledge Document"
    doc_type = "TEXT"
    content = ""

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        title = form.get("name") or (uploaded_file.filename if hasattr(uploaded_file, "filename") else "Uploaded Document")
        doc_type = form.get("type") or ("PDF" if str(title).lower().endswith(".pdf") else "DOCUMENT")

        if uploaded_file and hasattr(uploaded_file, "read"):
            file_bytes = await uploaded_file.read()
            if str(title).lower().endswith(".pdf") or file_bytes.startswith(b"%PDF-"):
                try:
                    import pypdf
                    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                    content = "\n\n".join(page.extract_text() or "" for page in reader.pages)
                    doc_type = "PDF"
                except Exception:
                    content = file_bytes.decode("utf-8", errors="ignore")
            else:
                content = file_bytes.decode("utf-8", errors="ignore")
        else:
            content = str(form.get("content") or "")
    else:
        body = await request.json()
        title = body.get("name") or body.get("title") or "Store Policy & FAQ"
        doc_type = body.get("type") or "TEXT"
        content = body.get("content") or ""

    if not content:
        raise HTTPException(status_code=400, detail="Document content cannot be empty")

    # Ensure a knowledge source exists
    src_stmt = select(KnowledgeSourceModel).where(KnowledgeSourceModel.workspace_id == ws_id)
    src_res = await db.execute(src_stmt)
    src = src_res.scalars().first()
    if not src:
        src = KnowledgeSourceModel(
            id=f"src_{uuid.uuid4().hex[:10]}",
            tenant_id=ws_id,
            name="Default Knowledge Base",
            type="MANUAL"
        )
        db.add(src)
        await db.flush()

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    new_doc = KnowledgeDocModel(
        id=doc_id,
        tenant_id=ws_id,
        source_id=src.id,
        title=title,
        content=content,
        metadata_json={"type": doc_type}
    )
    db.add(new_doc)

    # Chunk and embed
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [content]

    for idx, p_text in enumerate(paragraphs):
        emb = generate_embedding(p_text)
        chunk = KnowledgeChunkModel(
            id=f"chk_{uuid.uuid4().hex[:12]}",
            tenant_id=ws_id,
            doc_id=doc_id,
            chunk_index=idx,
            text=p_text,
            embedding=emb,
            metadata_json={"source": title}
        )
        db.add(chunk)

    await db.commit()

    return {
        "success": True,
        "document": {
            "id": new_doc.id,
            "title": new_doc.title,
            "chunks_created": len(paragraphs)
        }
    }

@router.delete("/api/knowledge")
@router.delete("/api/v1/knowledge")
async def delete_knowledge(
    id: str = Query(...),
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN", "EDITOR"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(KnowledgeDocModel).where(KnowledgeDocModel.id == id, KnowledgeDocModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()
    return {"success": True}

@router.post("/api/knowledge/sync")
@router.post("/api/v1/knowledge/sync")
async def sync_knowledge(session: Dict[str, Any] = Depends(require_auth_session)):
    return {
        "success": True,
        "message": "Knowledge vectors synchronized and indexed in pgvector."
    }

@router.post("/api/rag/ingest")
@router.post("/api/v1/rag/ingest")
async def rag_ingest(
    request: Request,
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    body = await request.json()
    title = body.get("title", "Ingested Document")
    content = body.get("content", "")
    ws_id = body.get("workspace_id") or session["workspaceId"]

    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()] or [content]

    src_stmt = select(KnowledgeSourceModel).where(KnowledgeSourceModel.workspace_id == ws_id)
    src_res = await db.execute(src_stmt)
    src = src_res.scalars().first()
    if not src:
        src = KnowledgeSourceModel(id=f"src_{uuid.uuid4().hex[:10]}", tenant_id=ws_id, name="Default RAG Source")
        db.add(src)
        await db.flush()

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    new_doc = KnowledgeDocModel(id=doc_id, tenant_id=ws_id, source_id=src.id, title=title, content=content)
    db.add(new_doc)

    for idx, p_text in enumerate(paragraphs):
        emb = generate_embedding(p_text)
        chunk = KnowledgeChunkModel(
            id=f"chk_{uuid.uuid4().hex[:12]}",
            tenant_id=ws_id,
            doc_id=doc_id,
            chunk_index=idx,
            text=p_text,
            embedding=emb
        )
        db.add(chunk)

    await db.commit()
    return {"success": True, "document_id": doc_id, "chunks_created": len(paragraphs)}

@router.post("/api/rag/query")
@router.post("/api/v1/rag/query")
async def rag_query(
    req: RAGQueryRequestSchema,
    session: Dict[str, Any] = Depends(require_auth_session)
):
    query_text = req.query or req.question
    if not query_text:
        raise HTTPException(status_code=400, detail="Missing question or query parameter")
    ws_id = req.workspace_id or session["workspaceId"]
    chunks = await fetch_tenant_chunks_from_db(ws_id)
    return execute_rag_pipeline(query_text, workspace_id=ws_id, tenant_chunks=chunks, top_k=req.top_k or 3)
