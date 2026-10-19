import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...db.database import get_db_session
from ...db.models import ConversationModel, MessageModel, ExecutionTraceModel
from ..dependencies import require_auth_session

router = APIRouter(tags=["Conversations"])

class ConversationActionRequest(BaseModel):
    conversation_id: str
    message: Optional[str] = None
    action: Optional[str] = None

class ConversationPatchRequest(BaseModel):
    status: Optional[str] = None

@router.get("/api/conversations")
@router.get("/api/v1/conversations")
async def list_conversations(
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = (
        select(ConversationModel)
        .where(ConversationModel.workspace_id == ws_id)
        .order_by(ConversationModel.updated_at.desc())
    )
    res = await db.execute(stmt)
    convs = res.scalars().all()

    formatted = []
    for c in convs:
        formatted.append({
            "id": c.id,
            "workspace_id": c.workspace_id,
            "agent_id": c.agent_id,
            "customer_id": c.customer_id,
            "channel": c.channel,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None
        })

    return {"conversations": formatted}

@router.post("/api/conversations")
@router.post("/api/v1/conversations")
async def handle_conversation_action(
    req: ConversationActionRequest,
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(ConversationModel).where(
        ConversationModel.id == req.conversation_id,
        ConversationModel.workspace_id == ws_id
    )
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if req.action == "HUMAN_REPLY" and req.message:
        msg = MessageModel(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            workspace_id=ws_id,
            conversation_id=conv.id,
            sender="HUMAN",
            content=req.message,
            trace_json={"operator_id": session["userId"]}
        )
        db.add(msg)
        await db.commit()
        return {
            "success": True,
            "message": {
                "id": msg.id,
                "role": "HUMAN",
                "content": msg.content,
                "created_at": msg.created_at.isoformat() if msg.created_at else None
            }
        }

    if req.action == "RESOLVE":
        conv.status = "RESOLVED"
        await db.commit()
        return {"success": True, "conversation": {"id": conv.id, "status": conv.status}}

    return {"success": True}

@router.get("/api/conversations/{id}")
@router.get("/api/v1/conversations/{id}")
async def get_conversation(
    id: str,
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(ConversationModel).where(
        ConversationModel.id == id,
        ConversationModel.workspace_id == ws_id
    )
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_stmt = (
        select(MessageModel)
        .where(MessageModel.conversation_id == id, MessageModel.workspace_id == ws_id)
        .order_by(MessageModel.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    messages = msg_res.scalars().all()

    formatted_msgs = []
    for m in messages:
        formatted_msgs.append({
            "id": m.id,
            "role": m.sender.lower(),
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })

    return {
        "conversation": {
            "id": conv.id,
            "status": conv.status,
            "agent_id": conv.agent_id
        },
        "messages": formatted_msgs,
        "traces": []
    }

@router.patch("/api/conversations/{id}")
@router.patch("/api/v1/conversations/{id}")
async def update_conversation_status(
    id: str,
    req: ConversationPatchRequest,
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(ConversationModel).where(
        ConversationModel.id == id,
        ConversationModel.workspace_id == ws_id
    )
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if req.status:
        conv.status = req.status.upper()
        await db.commit()

    return {"success": True, "conversation": {"id": conv.id, "status": conv.status}}
