import os
import jwt
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends

JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("INTERNAL_SERVICE_SECRET") or "super_secret_jwt_key_enterprise_grade_aaas_platform_2026"
ALLOWED_ALGORITHMS = ["HS256"]

def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=ALLOWED_ALGORITHMS)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Service token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid service token: {str(e)}")

def verify_service_jwt(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Strict Service-to-Service JWT Verification.
    Derives workspace_id ONLY from verified token claims.
    Never accepts unverified client-supplied tenancy.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header with Bearer service token is required"
        )
    
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)
    
    workspace_id = payload.get("workspace_id") or payload.get("workspaceId")
    if not workspace_id:
        raise HTTPException(
            status_code=401,
            detail="Forbidden: JWT missing required 'workspace_id' claim"
        )
    
    return {
        "workspace_id": workspace_id,
        "user_id": payload.get("userId") or payload.get("sub") or "service_system",
        "role": payload.get("role", "MEMBER"),
        "is_super_admin": payload.get("isSuperAdmin", False)
    }

def require_admin_auth(claims: Dict[str, Any] = Depends(verify_service_jwt)) -> Dict[str, Any]:
    """Requires verified admin privileges or super-admin claims."""
    if not claims.get("is_super_admin") and claims.get("role") not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin or Owner role required"
        )
    return claims
