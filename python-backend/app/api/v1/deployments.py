import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...db.database import get_db_session
from ...db.models import DeploymentModel, AgentModel, AgentConfigModel
from ..dependencies import require_auth_session, require_role

router = APIRouter(tags=["Deployments"])

class CreateDeploymentRequest(BaseModel):
    agent_id: str
    channel: Optional[str] = "WEBSITE"
    environment: Optional[str] = "PRODUCTION"
    allowed_domains: Optional[List[str]] = None

class UpdateDeploymentRequest(BaseModel):
    id: str
    status: Optional[str] = None
    channel: Optional[str] = None
    environment: Optional[str] = None
    allowed_domains: Optional[List[str]] = None

@router.get("/api/deployments")
@router.get("/api/v1/deployments")
async def list_deployments(
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(DeploymentModel).where(DeploymentModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    deployments = res.scalars().all()

    formatted = []
    for d in deployments:
        formatted.append({
            "id": d.id,
            "workspace_id": d.workspace_id,
            "agent_id": d.agent_id,
            "channel": d.channel,
            "environment": d.environment,
            "public_key": d.public_key,
            "status": d.status,
            "created_at": d.created_at.isoformat() if d.created_at else None
        })

    return {"deployments": formatted}

@router.post("/api/deployments")
@router.post("/api/v1/deployments")
async def create_deployment(
    req: CreateDeploymentRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN", "EDITOR"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    new_dep = DeploymentModel(
        id=f"dep_{uuid.uuid4().hex[:10]}",
        workspace_id=ws_id,
        agent_id=req.agent_id,
        agent_version_id="v1.0",
        channel=req.channel or "WEBSITE",
        environment=req.environment or "PRODUCTION",
        public_key=f"pk_live_{uuid.uuid4().hex[:16]}",
        status="ACTIVE"
    )
    db.add(new_dep)
    await db.commit()

    return {
        "success": True,
        "deployment": {
            "id": new_dep.id,
            "public_key": new_dep.public_key,
            "status": new_dep.status
        }
    }

@router.get("/api/deployments/resolve")
@router.get("/api/v1/deployments/resolve")
async def resolve_deployment(
    key: Optional[str] = Query(None),
    id: Optional[str] = Query(None),
    public_key: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    lookup_key = key or id or public_key
    if not lookup_key:
        raise HTTPException(status_code=400, detail="Deployment key is required")

    stmt = select(DeploymentModel).where(
        (DeploymentModel.public_key == lookup_key) | (DeploymentModel.id == lookup_key)
    )
    res = await db.execute(stmt)
    dep = res.scalar_one_or_none()
    if not dep or dep.status != "ACTIVE":
        raise HTTPException(status_code=404, detail="Deployment not found or inactive")

    agent_stmt = select(AgentModel).where(AgentModel.id == dep.agent_id)
    agent_res = await db.execute(agent_stmt)
    agent = agent_res.scalar_one_or_none()

    return {
        "deployment": {
            "id": dep.id,
            "public_key": dep.public_key,
            "agent_id": dep.agent_id,
            "channel": dep.channel,
            "environment": dep.environment,
            "status": dep.status
        },
        "agent": {
            "id": agent.id if agent else dep.agent_id,
            "name": agent.name if agent else "ShopMate Concierge",
            "description": agent.description if agent else "AI commerce assistant"
        },
        "welcome_message": "Hello! I am your AI store concierge. How may I assist you today?"
    }
