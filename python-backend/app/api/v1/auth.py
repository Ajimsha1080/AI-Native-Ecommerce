import uuid
import time
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from ...db.database import get_db_session
from ...db.models import UserModel, WorkspaceModel, WorkspaceMemberModel, AgentModel, AgentConfigModel
from ...core.security import (
    hash_password, verify_password, validate_password_policy,
    create_session_token, generate_mfa_secret, generate_otpauth_uri, verify_totp_code,
    generate_csrf_token
)
from ...core.redis_client import (
    check_login_lockout, record_failed_login, reset_login_lockout, revoke_session, check_rate_limit
)
from ...core.config import settings
from ..dependencies import get_optional_auth_session, require_auth_session

router = APIRouter(tags=["Authentication"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    mfa_code: Optional[str] = None

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    workspace_name: Optional[str] = None
    workspaceName: Optional[str] = None

class MfaActionRequest(BaseModel):
    secret: Optional[str] = None
    code: Optional[str] = None
    action: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

@router.post("/api/auth/login")
@router.post("/api/v1/auth/login")
async def login(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db_session)):
    clean_email = req.email.lower().strip()

    # 1. Rate limiting & Lockout defense
    is_locked, retry_sec = await check_login_lockout(clean_email)
    if is_locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts. Account temporarily locked for security. Please retry in {retry_sec} seconds."
        )

    # 2. Lookup user
    await db.execute(text("SELECT set_config('app.allow_user_lookup', 'true', true)"))
    stmt = select(UserModel).where(UserModel.email == clean_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        locked, lock_sec = await record_failed_login(clean_email)
        if locked:
            raise HTTPException(
                status_code=429,
                detail="Account locked for 15 minutes due to consecutive failed authentication attempts."
            )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 3. MFA Verification
    if user.mfa_enabled:
        if not req.mfa_code:
            return {
                "mfa_required": True,
                "email": user.email,
                "message": "Two-factor authentication code required."
            }
        if not user.mfa_secret or not verify_totp_code(user.mfa_secret, req.mfa_code):
            await record_failed_login(clean_email)
            raise HTTPException(status_code=401, detail="Invalid two-factor authentication code.")

    # Reset lockout on success
    await reset_login_lockout(clean_email)

    # 4. Resolve Workspace
    mem_stmt = select(WorkspaceMemberModel).where(WorkspaceMemberModel.user_id == user.id)
    mem_res = await db.execute(mem_stmt)
    membership = mem_res.scalar_one_or_none()
    
    workspace_id = membership.tenant_id if membership else "ws_acme_corp"

    # 5. Issue Session JWT & Set Cookie
    token = create_session_token(
        user_id=user.id,
        email=user.email,
        workspace_id=workspace_id,
        is_super_admin=getattr(user, "is_super_admin", False) or user.role == "SUPERADMIN"
    )

    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=7 * 24 * 3600,
        path="/"
    )

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "workspace_id": workspace_id,
            "avatar_url": getattr(user, "avatar_url", None),
            "is_super_admin": getattr(user, "is_super_admin", False) or user.role == "SUPERADMIN"
        },
        "workspace_id": workspace_id
    }

@router.post("/api/auth/signup")
@router.post("/api/v1/auth/signup")
async def signup(req: SignupRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db_session)):
    client_ip = request.client.host if request.client else "local_ip"
    
    # 1. IP rate limiting
    allowed, _, retry_sec = await check_rate_limit(f"signup_ip:{client_ip}", limit=10, window_sec=900)
    if not allowed:
        raise HTTPException(status_code=429, detail=f"Too many registration attempts. Please retry in {retry_sec} seconds.")

    clean_email = req.email.lower().strip()
    
    # 2. Enforce Password Policy
    valid, err_msg = validate_password_policy(req.password)
    if not valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # 3. Check duplicate user
    await db.execute(text("SELECT set_config('app.allow_user_lookup', 'true', true)"))
    stmt = select(UserModel).where(UserModel.email == clean_email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A user with this email address already exists.")

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    ws_id = f"ws_{uuid.uuid4().hex[:10]}"
    await db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": user_id})
    await db.execute(text("SELECT set_config('app.current_tenant', :tid, true)"), {"tid": ws_id})

    pwd_hash = hash_password(req.password)

    new_user = UserModel(
        id=user_id,
        email=clean_email,
        name=req.name.strip(),
        role="ADMIN",
        password_hash=pwd_hash,
        mfa_enabled=False
    )
    db.add(new_user)

    # 4. Create Workspace
    ws_name = (req.workspace_name or req.workspaceName or f"{req.name.strip()}'s Workspace").strip()
    slug_base = "".join(c if c.isalnum() else "-" for c in ws_name.lower()).strip("-")
    slug = f"{slug_base}-{ws_id[3:]}"

    new_workspace = WorkspaceModel(
        id=ws_id,
        name=ws_name,
        slug=slug,
        tier="ENTERPRISE"
    )
    db.add(new_workspace)

    # 5. Create Workspace Membership
    member = WorkspaceMemberModel(
        id=f"wsm_{uuid.uuid4().hex[:10]}",
        tenant_id=ws_id,
        user_id=user_id,
        role="OWNER"
    )
    db.add(member)

    # 6. Auto-provision default agent
    agent_id = f"agent_{uuid.uuid4().hex[:10]}"
    default_agent = AgentModel(
        id=agent_id,
        tenant_id=ws_id,
        name="ShopMate AI",
        description="Autonomous commerce concierge specialized in product discovery and customer assistance.",
        status="ACTIVE"
    )
    db.add(default_agent)

    default_config = AgentConfigModel(
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
    db.add(default_config)

    await db.commit()

    token = create_session_token(
        user_id=new_user.id,
        email=new_user.email,
        workspace_id=ws_id,
        is_super_admin=False
    )

    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=7 * 24 * 3600,
        path="/"
    )

    return {
        "success": True,
        "token": token,
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role,
            "workspace_id": ws_id,
            "is_super_admin": False
        },
        "workspace_id": ws_id
    }

@router.get("/api/auth/me")
@router.get("/api/v1/auth/me")
async def get_me(session: Optional[Dict[str, Any]] = Depends(get_optional_auth_session), db: AsyncSession = Depends(get_db_session)):
    if not session:
        return {"authenticated": False, "user": None}

    user = session["user"]
    ws_id = session["workspaceId"]

    # Fetch current workspace
    ws_stmt = select(WorkspaceModel).where(WorkspaceModel.id == ws_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()

    # Fetch all user memberships
    mem_stmt = select(WorkspaceMemberModel).where(WorkspaceMemberModel.user_id == user.id)
    mem_res = await db.execute(mem_stmt)
    memberships = mem_res.scalars().all()

    workspaces_list = []
    for m in memberships:
        w_stmt = select(WorkspaceModel).where(WorkspaceModel.id == m.tenant_id)
        w_res = await db.execute(w_stmt)
        w = w_res.scalar_one_or_none()
        if w:
            workspaces_list.append({
                "id": w.id,
                "name": w.name,
                "slug": w.slug,
                "tier": w.tier,
                "role": m.role
            })

    ws_data = {
        "id": workspace.id,
        "name": workspace.name,
        "slug": workspace.slug,
        "tier": workspace.tier
    } if workspace else None

    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": session.get("role", user.role if hasattr(user, "role") else "OWNER"),
            "workspace_id": ws_id,
            "avatar_url": getattr(user, "avatar_url", None),
            "is_super_admin": session.get("isSuperAdmin", False),
            "workspaceName": workspace.name if workspace else "Ajimsha M"
        },
        "workspace": ws_data,
        "workspace_id": ws_id,
        "role": session.get("role", "OWNER"),
        "workspaces": workspaces_list or ([ws_data] if ws_data else [])
    }

@router.post("/api/auth/logout")
@router.post("/api/v1/auth/logout")
async def logout(response: Response, session: Optional[Dict[str, Any]] = Depends(get_optional_auth_session)):
    if session and session.get("sessionId"):
        await revoke_session(session["sessionId"])

    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value="",
        max_age=0,
        path="/"
    )
    return {"success": True}

@router.get("/api/auth/csrf")
@router.get("/api/v1/auth/csrf")
async def get_csrf(response: Response):
    token = generate_csrf_token()
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=token,
        httponly=False,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        path="/",
        max_age=86400
    )
    return {"csrfToken": token}

@router.get("/api/auth/mfa")
@router.get("/api/v1/auth/mfa")
async def get_mfa_details(session: Dict[str, Any] = Depends(require_auth_session)):
    user = session["user"]
    secret = generate_mfa_secret()
    uri = generate_otpauth_uri(user.email, secret)
    return {
        "secret": secret,
        "otpauth_url": uri,
        "mfa_enabled": bool(user.mfa_enabled)
    }

@router.post("/api/auth/mfa")
@router.post("/api/v1/auth/mfa")
async def configure_mfa(
    req: MfaActionRequest,
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    user = session["user"]
    if req.action == "disable":
        user.mfa_enabled = False
        user.mfa_secret = None
        await db.commit()
        return {"success": True, "mfa_enabled": False}

    if not req.secret or not req.code:
        raise HTTPException(status_code=400, detail="Secret and verification code are required")

    if not verify_totp_code(req.secret, req.code):
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check your authenticator app.")

    user.mfa_secret = req.secret
    user.mfa_enabled = True
    await db.commit()

    return {
        "success": True,
        "mfa_enabled": True,
        "message": "Multi-factor authentication successfully enabled."
    }
