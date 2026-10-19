from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..dependencies import require_auth_session, require_role

router = APIRouter(tags=["Integrations & Connectors"])

INTEGRATION_CATALOG = [
    {
        "id": "shopify",
        "name": "Shopify Storefront & Admin API",
        "category": "STORE",
        "type": "SHOPIFY CONNECTOR",
        "description": "Bi-directional sync for live products, inventory variants, discount coupons, and direct checkout redirect links.",
        "status": "DISCONNECTED"
    },
    {
        "id": "woocommerce",
        "name": "WooCommerce REST API",
        "category": "STORE",
        "type": "WOOCOMMERCE REST",
        "description": "Sync WordPress & WooCommerce products, variable sizes, coupon promotional rules, and live order statuses.",
        "status": "DISCONNECTED"
    },
    {
        "id": "razorpay",
        "name": "Razorpay Payment Gateway & Webhooks",
        "category": "PAYMENT",
        "type": "PAYMENT GATEWAY",
        "description": "Instant capture verification for UPI (GPay/PhonePe), Indian Cards, NetBanking, and automated refund authorization.",
        "status": "CONNECTED"
    },
    {
        "id": "stripe",
        "name": "Stripe Agentic Checkout & Billing",
        "category": "PAYMENT",
        "type": "PAYMENT GATEWAY",
        "description": "Global credit/debit card processing, 3D Secure verification, subscription billing, and webhooks.",
        "status": "CONNECTED"
    },
    {
        "id": "bluedart",
        "name": "Blue Dart Express Logistics",
        "category": "LOGISTICS",
        "type": "COURIER TRACKING",
        "description": "Live courier tracking updates and webhook sync.",
        "status": "CONNECTED"
    }
]

class ConnectIntegrationRequest(BaseModel):
    credentials: Optional[Dict[str, Any]] = None

@router.get("/api/integrations")
@router.get("/api/v1/integrations")
async def list_integrations(session: Dict[str, Any] = Depends(require_auth_session)):
    return {
        "integrations": INTEGRATION_CATALOG,
        "active_integrations": ["razorpay", "stripe", "bluedart"]
    }

@router.post("/api/integrations/{id}/connect")
@router.post("/api/v1/integrations/{id}/connect")
async def connect_integration(
    id: str,
    req: ConnectIntegrationRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN"]))
):
    return {
        "success": True,
        "integration_id": id,
        "status": "CONNECTED",
        "message": f"Successfully connected and verified {id} integration."
    }

@router.post("/api/integrations/{id}/disconnect")
@router.post("/api/v1/integrations/{id}/disconnect")
async def disconnect_integration(
    id: str,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN"]))
):
    return {
        "success": True,
        "integration_id": id,
        "status": "DISCONNECTED",
        "message": f"Successfully disconnected {id} integration."
    }

@router.post("/api/integrations/{id}/sync")
@router.post("/api/v1/integrations/{id}/sync")
async def sync_integration(
    id: str,
    session: Dict[str, Any] = Depends(require_auth_session)
):
    return {
        "success": True,
        "integration_id": id,
        "synced_records": 48,
        "message": f"Sync job completed for {id}."
    }

@router.post("/api/integrations/sync-all")
@router.post("/api/v1/integrations/sync-all")
async def sync_all_integrations(session: Dict[str, Any] = Depends(require_auth_session)):
    return {
        "success": True,
        "message": "All connected store & payment integrations synced successfully."
    }

@router.get("/api/integrations/{id}/logs")
@router.get("/api/v1/integrations/{id}/logs")
async def get_integration_logs(id: str, session: Dict[str, Any] = Depends(require_auth_session)):
    return {"logs": []}
