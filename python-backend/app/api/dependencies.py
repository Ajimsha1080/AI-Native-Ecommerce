from typing import Optional, Dict, Any, List
from fastapi import Request, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from ..db.database import get_db_session
from ..db.models import UserModel, WorkspaceMemberModel, WorkspaceModel
from ..core.security import verify_session_token
from ..core.redis_client import is_session_revoked
from ..core.config import settings

async def get_optional_auth_session(
    request: Request,
    db: AsyncSession = Depends(get_db_session)
) -> Optional[Dict[str, Any]]:
    """
    Extracts session token from cookie (aaas_session_token) or Authorization header.
    Validates token and sets PostgreSQL RLS context.
    """
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return None

    payload = verify_session_token(token)
    if not payload:
        return None

    session_id = payload.get("sessionId") or payload.get("jti")
    if session_id and await is_session_revoked(session_id):
        return None

    user_id = payload.get("userId") or payload.get("sub")
    if not user_id:
        return None

    # Set user context for RLS lookup
    await db.execute(text("SELECT set_config('app.allow_user_lookup', 'true', true)"))
    await db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": user_id})

    # Fetch user from database
    user_stmt = select(UserModel).where(UserModel.id == user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if not user:
        return None

    workspace_id = payload.get("workspaceId") or payload.get("workspace_id")
    # If workspace not in token, find primary workspace membership
    role = "MEMBER"
    if not workspace_id:
        mem_stmt = select(WorkspaceMemberModel).where(WorkspaceMemberModel.user_id == user_id)
        mem_res = await db.execute(mem_stmt)
        mem = mem_res.scalar_one_or_none()
        if mem:
            workspace_id = mem.tenant_id
            role = mem.role
        else:
            # Fallback to first available workspace
            ws_stmt = select(WorkspaceModel).limit(1)
            ws_res = await db.execute(ws_stmt)
            ws = ws_res.scalar_one_or_none()
            workspace_id = ws.id if ws else "ws_acme_corp"
    else:
        mem_stmt = select(WorkspaceMemberModel).where(
            WorkspaceMemberModel.user_id == user_id,
            WorkspaceMemberModel.tenant_id == workspace_id
        )
        mem_res = await db.execute(mem_stmt)
        mem = mem_res.scalar_one_or_none()
        if mem:
            role = mem.role
        elif user.role == "SUPERADMIN" or getattr(user, "is_super_admin", False):
            role = "OWNER"

    # Set PostgreSQL RLS transaction-local tenant context
    await db.execute(
        text("SELECT set_config('app.current_tenant', :tenant, true)"),
        {"tenant": workspace_id}
    )
    await db.execute(
        text("SELECT set_config('app.current_user_id', :user_id, true)"),
        {"user_id": user_id}
    )

    return {
        "user": user,
        "userId": user_id,
        "email": user.email,
        "workspaceId": workspace_id,
        "role": role,
        "isSuperAdmin": getattr(user, "is_super_admin", False) or user.role == "SUPERADMIN"
    }

async def require_auth_session(
    session_data: Optional[Dict[str, Any]] = Depends(get_optional_auth_session)
) -> Dict[str, Any]:
    """Requires authenticated user session."""
    if not session_data:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return session_data

def require_role(allowed_roles: List[str]):
    """Enforces specific workspace roles."""
    async def role_checker(session_data: Dict[str, Any] = Depends(require_auth_session)) -> Dict[str, Any]:
        if session_data.get("isSuperAdmin"):
            return session_data
        role = session_data.get("role", "MEMBER").upper()
        clean_allowed = [r.upper() for r in allowed_roles]
        if role not in clean_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: Insufficient permissions. Requires one of {clean_allowed}"
            )
        return session_data
    return role_checker
