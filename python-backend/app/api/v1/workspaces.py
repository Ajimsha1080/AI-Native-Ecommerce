import uuid
import json
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ...db.database import get_db_session
from ...db.models import (
    WorkspaceModel, WorkspaceMemberModel, UserModel, AgentModel,
    ProductModel, OrderModel, KnowledgeSourceModel, ConversationModel, ApiKeyModel, AuditLogModel
)
from ..dependencies import require_auth_session, require_role

router = APIRouter(tags=["Workspaces & Settings"])

class UpdateSettingsRequest(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    security: Optional[Dict[str, Any]] = None
    retention_days: Optional[int] = None

class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: Optional[str] = "EDITOR"

class DeleteTenantRequest(BaseModel):
    confirmSlug: Optional[str] = None

@router.get("/api/settings")
@router.get("/api/v1/settings")
async def get_settings(
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(WorkspaceModel).where(WorkspaceModel.id == ws_id)
    res = await db.execute(stmt)
    ws = res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws_dict = {
        "id": ws.id,
        "name": ws.name,
        "slug": ws.slug,
        "tier": ws.tier,
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "settings": {
            "store_name": ws.name,
            "retention_days": 90,
            "security": {
                "rate_limit_rpm": 120,
                "allowed_origins": ["*"],
                "require_mfa": False
            }
        },
        "created_at": ws.created_at.isoformat() if ws.created_at else None,
        "updated_at": ws.updated_at.isoformat() if ws.updated_at else None
    }
    return {
        "success": True,
        "workspace": ws_dict,
        "settings": {
            "store_name": ws.name,
            "name": ws.name,
            "currency": "INR",
            "timezone": "Asia/Kolkata",
            "retention_days": 90,
            "security": {
                "rate_limit_rpm": 120,
                "allowed_origins": ["*"],
                "require_mfa": False
            }
        }
    }

@router.post("/api/settings")
@router.post("/api/v1/settings")
async def update_settings(
    req: UpdateSettingsRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(WorkspaceModel).where(WorkspaceModel.id == ws_id)
    res = await db.execute(stmt)
    ws = res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.name:
        ws.name = req.name.strip()
    await db.commit()

    return {"success": True, "workspace": {"id": ws.id, "name": ws.name, "slug": ws.slug}}

@router.get("/api/settings/members")
@router.get("/api/v1/settings/members")
async def list_members(
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(WorkspaceMemberModel).where(WorkspaceMemberModel.tenant_id == ws_id)
    res = await db.execute(stmt)
    memberships = res.scalars().all()

    members = []
    for m in memberships:
        u_stmt = select(UserModel).where(UserModel.id == m.user_id)
        u_res = await db.execute(u_stmt)
        user = u_res.scalar_one_or_none()
        if user and not (getattr(user, "is_super_admin", False) or user.role == "SUPERADMIN"):
            members.append({
                "id": m.id,
                "user_id": m.user_id,
                "name": user.name or "Workspace Member",
                "email": user.email,
                "role": m.role,
                "status": "ACTIVE",
                "is_super_admin": False,
                "created_at": m.created_at.isoformat() if m.created_at else None
            })

    return {"members": members}

@router.post("/api/settings/members")
@router.post("/api/v1/settings/members")
async def invite_member(
    req: InviteMemberRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    clean_email = req.email.lower().strip()
    clean_role = (req.role or "EDITOR").upper()

    # Check or create user
    u_stmt = select(UserModel).where(UserModel.email == clean_email)
    u_res = await db.execute(u_stmt)
    user = u_res.scalar_one_or_none()
    if not user:
        user = UserModel(
            id=f"usr_{uuid.uuid4().hex[:12]}",
            email=clean_email,
            name=clean_email.split("@")[0],
            role="VIEWER",
            password_hash="INVITED_PENDING_ACTIVATION"
        )
        db.add(user)
        await db.flush()

    # Check if already member
    m_stmt = select(WorkspaceMemberModel).where(
        WorkspaceMemberModel.tenant_id == ws_id,
        WorkspaceMemberModel.user_id == user.id
    )
    m_res = await db.execute(m_stmt)
    if m_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a member of this workspace")

    new_mem = WorkspaceMemberModel(
        id=f"wsm_{uuid.uuid4().hex[:10]}",
        tenant_id=ws_id,
        user_id=user.id,
        role=clean_role
    )
    db.add(new_mem)
    await db.commit()

    return {
        "success": True,
        "member": {
            "id": new_mem.id,
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "role": new_mem.role,
            "status": "ACTIVE"
        }
    }

@router.delete("/api/settings/members")
@router.delete("/api/v1/settings/members")
async def remove_member(
    id: str = Query(..., description="Membership ID"),
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(WorkspaceMemberModel).where(
        WorkspaceMemberModel.id == id,
        WorkspaceMemberModel.tenant_id == ws_id
    )
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "OWNER" and session["role"] != "OWNER":
        raise HTTPException(status_code=403, detail="Only workspace OWNER can remove another OWNER")

    await db.delete(member)
    await db.commit()
    return {"success": True}

@router.get("/api/workspaces")
@router.get("/api/v1/workspaces")
async def list_workspaces(
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    user_id = session["userId"]
    stmt = select(WorkspaceMemberModel).where(WorkspaceMemberModel.user_id == user_id)
    res = await db.execute(stmt)
    memberships = res.scalars().all()

    workspaces = []
    for m in memberships:
        w_stmt = select(WorkspaceModel).where(WorkspaceModel.id == m.tenant_id)
        w_res = await db.execute(w_stmt)
        w = w_res.scalar_one_or_none()
        if w:
            workspaces.append({
                "id": w.id,
                "name": w.name,
                "slug": w.slug,
                "tier": w.tier,
                "role": m.role
            })

    return {"workspaces": workspaces}

@router.get("/api/tenant/export")
@router.get("/api/v1/tenant/export")
async def export_tenant_data(
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    ws_stmt = select(WorkspaceModel).where(WorkspaceModel.id == ws_id)
    ws_res = await db.execute(ws_stmt)
    ws = ws_res.scalar_one_or_none()

    products_res = await db.execute(select(ProductModel).where(ProductModel.workspace_id == ws_id))
    orders_res = await db.execute(select(OrderModel).where(OrderModel.workspace_id == ws_id))
    agents_res = await db.execute(select(AgentModel).where(AgentModel.workspace_id == ws_id))

    bundle = {
        "export_version": "2.0.0",
        "workspace_id": ws_id,
        "workspace": {"id": ws.id, "name": ws.name, "slug": ws.slug, "tier": ws.tier} if ws else None,
        "products_count": len(products_res.scalars().all()),
        "orders_count": len(orders_res.scalars().all()),
        "agents_count": len(agents_res.scalars().all())
    }

    return Response(
        content=json.dumps(bundle, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=shopmate_export_{ws_id}.json"}
    )

@router.post("/api/tenant/delete")
@router.post("/api/v1/tenant/delete")
async def delete_tenant(
    req: DeleteTenantRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(WorkspaceModel).where(WorkspaceModel.id == ws_id)
    res = await db.execute(stmt)
    ws = res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.confirmSlug and req.confirmSlug != ws.slug:
        raise HTTPException(status_code=400, detail="Confirmation slug does not match workspace slug.")

    await db.delete(ws)
    await db.commit()

    return {
        "status": "DELETED",
        "workspace_id": ws_id,
        "message": "Workspace and all associated tenant data have been permanently deleted."
    }
