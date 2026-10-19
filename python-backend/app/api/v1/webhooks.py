import hmac
import hashlib
import json
import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Response, HTTPException, Header, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...db.database import get_db_session
from ...db.models import ProcessedWebhookEventModel, OrderModel
from ...core.config import settings

logger = logging.getLogger("webhooks")
router = APIRouter(tags=["Webhooks"])

@router.post("/api/webhooks/razorpay")
@router.post("/api/v1/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db_session)
):
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8")

    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret:
        logger.error("Razorpay webhook rejected: RAZORPAY_WEBHOOK_SECRET is not configured on server")
        raise HTTPException(
            status_code=500,
            detail="Webhook endpoint misconfigured: RAZORPAY_WEBHOOK_SECRET is required"
        )

    if not x_razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing x-razorpay-signature header")

    # Timing-safe HMAC SHA-256 verification
    expected_sig = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, x_razorpay_signature):
        logger.warning("Razorpay webhook signature mismatch")
        raise HTTPException(status_code=400, detail="Signature verification failed")

    try:
        payload = json.loads(body_text)
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON payload")

    event_id = payload.get("event_id") or payload.get("payload", {}).get("payment", {}).get("entity", {}).get("id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing required webhook event identifier")

    # Idempotency check
    stmt = select(ProcessedWebhookEventModel).where(ProcessedWebhookEventModel.event_id == event_id)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        logger.info(f"Razorpay event {event_id} already processed, skipping duplicate")
        return {"status": "ok", "deduplicated": True}

    # Record event
    rec = ProcessedWebhookEventModel(
        id=f"pwh_{uuid.uuid4().hex[:12]}",
        tenant_id="system",
        event_id=event_id,
        provider="RAZORPAY"
    )
    db.add(rec)
    await db.commit()

    logger.info(f"Processed verified Razorpay Event: {payload.get('event')} ({event_id})")
    return {"status": "ok", "received": True}

@router.post("/api/webhooks/stripe")
@router.post("/api/v1/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db_session)
):
    body_bytes = await request.body()
    secret = settings.STRIPE_WEBHOOK_SECRET

    if not secret:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET is not configured on server")

    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        import stripe
        event = stripe.Webhook.construct_event(
            payload=body_bytes,
            sig_header=stripe_signature,
            secret=secret
        )
    except Exception as e:
        logger.warning(f"Stripe SDK signature verification failed: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid signature: {str(e)}")

    event_id = event.get("id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event id")

    # Idempotency check
    stmt = select(ProcessedWebhookEventModel).where(ProcessedWebhookEventModel.event_id == event_id)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        logger.info(f"Stripe event {event_id} already processed, skipping duplicate")
        return {"received": True, "deduplicated": True}

    rec = ProcessedWebhookEventModel(
        id=f"pwh_{uuid.uuid4().hex[:12]}",
        tenant_id="system",
        event_id=event_id,
        provider="STRIPE"
    )
    db.add(rec)
    await db.commit()

    logger.info(f"Processed verified Stripe Event: {event.get('type')} ({event_id})")
    return {"received": True}

@router.post("/api/webhooks")
@router.post("/api/v1/webhooks")
async def generic_webhook(request: Request):
    return {"status": "ok", "message": "Generic webhook acknowledged"}
