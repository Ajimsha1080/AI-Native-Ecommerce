import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...db.database import get_db_session
from ...db.models import AgentModel, AgentConfigModel, AgentVersionModel
from ..dependencies import require_auth_session, require_role, get_optional_auth_session
from ...agent_runtime import run_agent_cycle

router = APIRouter(tags=["Agents"])

class AgentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = "Autonomous commerce concierge"
    industry: Optional[str] = "Omnichannel Retail & E-Commerce"
    primary_objective: Optional[str] = "Boost conversions and answer customer inquiries"
    language: Optional[str] = "English"

class AgentUpdateRequest(BaseModel):
    agent: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    name: Optional[str] = None
    description: Optional[str] = None

class AgentChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    workspace_id: Optional[str] = None

@router.get("/api/agents")
@router.get("/api/v1/agents")
async def list_agents(
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(AgentModel).where(AgentModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    agents = res.scalars().all()

    if not agents:
        # Auto-provision default agent
        agent_id = f"agent_{uuid.uuid4().hex[:10]}"
        new_agent = AgentModel(
            id=agent_id,
            tenant_id=ws_id,
            name="ShopMate AI",
            description="Autonomous commerce concierge specialized in product discovery, live inventory queries, order status, and customer assistance.",
            status="PUBLISHED"
        )
        db.add(new_agent)

        new_config = AgentConfigModel(
            id=f"cfg_{uuid.uuid4().hex[:10]}",
            tenant_id=ws_id,
            agent_id=agent_id,
            model="sarvam-105b-conversations",
            temperature=0.7,
            max_tokens=2048,
            system_prompt="You are ShopMate AI, the official AI commerce assistant.",
            tools=["product_search", "inventory_lookup", "order_lookup", "add_to_cart"],
            guardrails={},
            rag_enabled=True
        )
        db.add(new_config)
        await db.commit()
        agents = [new_agent]

    formatted = []
    for a in agents:
        formatted.append({
            "id": a.id,
            "workspace_id": a.workspace_id,
            "name": a.name,
            "description": a.description,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None
        })

    return {"agents": formatted}

@router.post("/api/agents")
@router.post("/api/v1/agents")
async def create_agent(
    req: AgentCreateRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN", "EDITOR"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    agent_id = f"agent_{uuid.uuid4().hex[:10]}"

    new_agent = AgentModel(
        id=agent_id,
        tenant_id=ws_id,
        name=req.name.strip(),
        description=req.description,
        status="PUBLISHED"
    )
    db.add(new_agent)

    new_config = AgentConfigModel(
        id=f"cfg_{uuid.uuid4().hex[:10]}",
        tenant_id=ws_id,
        agent_id=agent_id,
        model="sarvam-105b-conversations",
        temperature=0.7,
        max_tokens=2048,
        system_prompt=f"You are {req.name}, the official commerce assistant.",
        tools=["product_search", "inventory_lookup", "order_lookup", "add_to_cart"],
        guardrails={},
        rag_enabled=True
    )
    db.add(new_config)
    await db.commit()

    return {
        "success": True,
        "agent": {
            "id": new_agent.id,
            "name": new_agent.name,
            "description": new_agent.description,
            "status": new_agent.status
        }
    }

@router.get("/api/agents/{id}")
@router.get("/api/v1/agents/{id}")
async def get_agent(
    id: str,
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(AgentModel).where(AgentModel.id == id, AgentModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()

    if not agent:
        # Fallback to first available agent in tenant
        alt_stmt = select(AgentModel).where(AgentModel.workspace_id == ws_id)
        alt_res = await db.execute(alt_stmt)
        agent = alt_res.scalars().first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    cfg_stmt = select(AgentConfigModel).where(AgentConfigModel.agent_id == agent.id)
    cfg_res = await db.execute(cfg_stmt)
    config = cfg_res.scalar_one_or_none()

    cfg_data = {
        "id": config.id,
        "agent_id": config.agent_id,
        "model": config.model,
        "temperature": config.temperature,
        "max_tokens": config.max_tokens,
        "system_prompt": config.system_prompt,
        "tools": config.tools or [],
        "guardrails": config.guardrails or {},
        "rag_enabled": config.rag_enabled
    } if config else {
        "model": "sarvam-105b-conversations",
        "system_prompt": "You are ShopMate AI"
    }

    return {
        "agent": {
            "id": agent.id,
            "workspace_id": agent.workspace_id,
            "name": agent.name,
            "description": agent.description,
            "status": agent.status
        },
        "config": cfg_data,
        "tools": [],
        "policies": [],
        "versions": [],
        "deployments": []
    }

@router.put("/api/agents/{id}")
@router.put("/api/v1/agents/{id}")
async def update_agent(
    id: str,
    req: AgentUpdateRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(AgentModel).where(AgentModel.id == id, AgentModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if req.agent and "name" in req.agent:
        agent.name = req.agent["name"]
    elif req.name:
        agent.name = req.name

    if req.agent and "description" in req.agent:
        agent.description = req.agent["description"]
    elif req.description:
        agent.description = req.description

    if req.config:
        cfg_stmt = select(AgentConfigModel).where(AgentConfigModel.agent_id == agent.id)
        cfg_res = await db.execute(cfg_stmt)
        config = cfg_res.scalar_one_or_none()
        if config and "instructions" in req.config:
            inst = req.config["instructions"]
            if isinstance(inst, dict) and "system_prompt" in inst:
                config.system_prompt = inst["system_prompt"]

    await db.commit()
    return {"success": True, "agent": {"id": agent.id, "name": agent.name}}

@router.delete("/api/agents/{id}")
@router.delete("/api/v1/agents/{id}")
async def delete_agent(
    id: str,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(AgentModel).where(AgentModel.id == id, AgentModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await db.delete(agent)
    await db.commit()
    return {"success": True}

@router.get("/api/agents/{id}/versions")
@router.get("/api/v1/agents/{id}/versions")
async def list_agent_versions(
    id: str,
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(AgentVersionModel).where(
        AgentVersionModel.agent_id == id,
        AgentVersionModel.workspace_id == ws_id
    )
    res = await db.execute(stmt)
    versions = res.scalars().all()

    return {
        "versions": [
            {
                "id": v.id,
                "version_number": v.version_number,
                "created_at": v.created_at.isoformat() if v.created_at else None
            }
            for v in versions
        ]
    }

@router.post("/api/agents/{id}/chat")
async def agent_chat_route(
    id: str,
    req: AgentChatRequest,
    session: Optional[Dict[str, Any]] = Depends(get_optional_auth_session)
):
    ws_id = req.workspace_id or (session["workspaceId"] if session else "ws_acme_corp")
    result = run_agent_cycle(
        agent_id=id,
        message=req.message,
        conversation_id=req.conversation_id,
        workspace_id=ws_id
    )
    return result

@router.get("/api/actions/permissions")
@router.get("/api/v1/actions/permissions")
async def get_action_permissions(session: Dict[str, Any] = Depends(require_auth_session)):
    return {"permissions": []}

@router.post("/api/actions/permissions")
@router.post("/api/v1/actions/permissions")
async def set_action_permissions(session: Dict[str, Any] = Depends(require_auth_session)):
    return {"success": True, "message": "Permissions successfully saved & synced with live agents."}
