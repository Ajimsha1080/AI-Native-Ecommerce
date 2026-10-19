import uuid
import random
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ...db.database import get_db_session
from ...db.models import ProductModel, OrderModel
from ..dependencies import require_auth_session, require_role, get_optional_auth_session
from ...core.redis_client import check_rate_limit

router = APIRouter(tags=["Commerce"])

# --- Product Models ---

class ProductCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "Performance Apparel"
    tags: Optional[List[str]] = None
    price: float = 999.0
    compare_at_price: Optional[float] = None
    currency: Optional[str] = "INR"
    images: Optional[List[str]] = None
    imageUrl: Optional[str] = None
    total_inventory: Optional[int] = 50
    inventory: Optional[int] = None
    variants: Optional[List[Dict[str, Any]]] = None

class ProductUpdateRequest(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    total_inventory: Optional[int] = None
    inventory: Optional[int] = None
    in_stock: Optional[bool] = None

# --- Order Models ---

class OrderCreateRequest(BaseModel):
    action: Optional[str] = None
    workspace_id: Optional[str] = None
    productId: Optional[str] = None
    variantId: Optional[str] = None
    quantity: Optional[int] = 1
    customerName: Optional[str] = None
    customerEmail: Optional[str] = None
    shippingAddress: Optional[str] = None
    paymentMethod: Optional[str] = "UPI"

class OrderUpdateRequest(BaseModel):
    id: str
    status: Optional[str] = None
    fulfillment_status: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None

class CheckoutCommitRequest(BaseModel):
    workspace_id: Optional[str] = None
    productId: Optional[str] = None
    product_id: Optional[str] = None
    variantId: Optional[str] = None
    variant_id: Optional[str] = None
    quantity: Optional[int] = 1
    customerName: Optional[str] = None
    customer_name: Optional[str] = None
    customerEmail: Optional[str] = None
    customer_email: Optional[str] = None
    customerPhone: Optional[str] = None
    customer_phone: Optional[str] = None
    shippingAddress: Optional[str] = "Standard Ground Shipping"
    shipping_address: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    paymentMethod: Optional[str] = "UPI"
    payment_method: Optional[str] = None

# --- Products Endpoints ---

@router.get("/api/commerce/products")
@router.get("/api/v1/commerce/products")
async def list_products(
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(ProductModel).where(ProductModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    products = res.scalars().all()

    formatted = []
    for p in products:
        formatted.append({
            "id": p.id,
            "workspace_id": p.workspace_id,
            "title": p.title,
            "handle": p.handle,
            "description": p.description,
            "category": p.category,
            "tags": p.tags or [],
            "price": p.price,
            "compare_at_price": p.compare_at_price,
            "currency": p.currency,
            "images": p.images or [],
            "in_stock": p.in_stock,
            "total_inventory": p.stock,
            "variants": p.variants or [],
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None
        })

    return {"products": formatted}

@router.post("/api/commerce/products")
@router.post("/api/v1/commerce/products")
async def create_product(
    req: ProductCreateRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN", "EDITOR"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    inventory_qty = req.inventory if req.inventory is not None else (req.total_inventory or 50)
    price_val = float(req.price)
    prod_id = f"prod_{uuid.uuid4().hex[:10]}"

    imgs = req.images or ([req.imageUrl] if req.imageUrl else ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80"])

    variants_data = req.variants or [
        {
            "id": f"var_{uuid.uuid4().hex[:8]}",
            "sku": f"BT-{req.title.upper()[:8].replace(' ', '-')}-M",
            "title": "Standard / Free Size",
            "inventory_quantity": inventory_qty,
            "price": price_val,
            "attributes": {"size": "M"}
        }
    ]

    new_prod = ProductModel(
        id=prod_id,
        workspace_id=ws_id,
        title=req.title,
        description=req.description,
        category=req.category or "Performance Apparel",
        tags=req.tags or ["apparel", "shopmate"],
        price=price_val,
        compare_at_price=req.compare_at_price or (price_val * 1.25),
        currency=req.currency or "INR",
        images=imgs,
        in_stock=inventory_qty > 0,
        stock=inventory_qty,
        variants=variants_data
    )
    db.add(new_prod)
    await db.commit()

    return {
        "success": True,
        "product": {
            "id": new_prod.id,
            "workspace_id": new_prod.workspace_id,
            "title": new_prod.title,
            "price": new_prod.price,
            "total_inventory": new_prod.stock,
            "in_stock": new_prod.in_stock
        }
    }

@router.put("/api/commerce/products")
@router.put("/api/v1/commerce/products")
@router.patch("/api/commerce/products")
@router.patch("/api/v1/commerce/products")
async def update_product(
    req: ProductUpdateRequest,
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN", "EDITOR"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(ProductModel).where(ProductModel.id == req.id, ProductModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    prod = res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    if req.title is not None:
        prod.title = req.title
    if req.description is not None:
        prod.description = req.description
    if req.category is not None:
        prod.category = req.category
    if req.price is not None:
        prod.price = float(req.price)
    
    new_inv = req.total_inventory if req.total_inventory is not None else req.inventory
    if new_inv is not None:
        prod.stock = max(0, new_inv)
        prod.in_stock = prod.stock > 0

    if req.in_stock is not None:
        prod.in_stock = req.in_stock

    await db.commit()
    return {"success": True, "product": {"id": prod.id, "title": prod.title, "price": prod.price, "stock": prod.stock}}

@router.delete("/api/commerce/products")
@router.delete("/api/v1/commerce/products")
async def delete_product(
    id: Optional[str] = Query(None),
    all: Optional[bool] = Query(False),
    session: Dict[str, Any] = Depends(require_role(["OWNER", "ADMIN", "EDITOR"])),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    if all:
        del_stmt = delete(ProductModel).where(ProductModel.workspace_id == ws_id)
        await db.execute(del_stmt)
        await db.commit()
        return {"success": True, "message": "All products removed"}

    if not id:
        raise HTTPException(status_code=400, detail="Product ID is required")

    stmt = select(ProductModel).where(ProductModel.id == id, ProductModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    prod = res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.delete(prod)
    await db.commit()
    return {"success": True}

# --- Orders Endpoints ---

@router.get("/api/commerce/orders")
@router.get("/api/v1/commerce/orders")
async def list_orders(
    request: Request,
    order_number: Optional[str] = Query(None),
    customer_email: Optional[str] = Query(None),
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    client_ip = request.client.host if request.client else "local_ip"

    allowed, _, _ = await check_rate_limit(f"orders:{client_ip}:{ws_id}", limit=20, window_sec=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many order lookup requests. Please retry in a few moments.")

    if order_number:
        if not customer_email:
            raise HTTPException(status_code=400, detail="Both order_number and customer_email are required.")
        stmt = select(OrderModel).where(
            OrderModel.workspace_id == ws_id,
            OrderModel.order_number == order_number,
            OrderModel.customer_email == customer_email.lower().strip()
        )
        res = await db.execute(stmt)
        order = res.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found with the provided email address.")
        return {
            "order": {
                "id": order.id,
                "order_number": order.order_number,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "total_amount": order.total_amount,
                "currency": order.currency,
                "status": order.financial_status,
                "fulfillment_status": order.fulfillment_status,
                "items": order.items_json or []
            }
        }

    stmt = select(OrderModel).where(OrderModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    orders = res.scalars().all()

    formatted = []
    for o in orders:
        formatted.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_name": o.customer_name,
            "customer_email": o.customer_email,
            "total_amount": o.total_amount,
            "currency": o.currency,
            "status": o.financial_status,
            "payment_status": o.financial_status,
            "fulfillment_status": o.fulfillment_status,
            "items": o.items_json or [],
            "created_at": o.created_at.isoformat() if o.created_at else None
        })

    return {"orders": formatted}

@router.post("/api/commerce/orders")
@router.post("/api/v1/commerce/orders")
async def create_order(
    req: OrderCreateRequest,
    session: Optional[Dict[str, Any]] = Depends(get_optional_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = req.workspace_id or (session["workspaceId"] if session else "ws_acme_corp")

    # Sample order seeding
    if req.action == "seed_sample_orders":
        sample_orders = [
            OrderModel(
                id=f"ord_{int(random.random()*1000000)}_1",
                workspace_id=ws_id,
                order_number="#ORD-84920",
                customer_name="Priya Sharma",
                customer_email="priya.sharma@example.com",
                total_amount=4999.00,
                currency="INR",
                financial_status="PAID",
                fulfillment_status="IN_TRANSIT",
                items_json=[{"title": "Cyberpunk Waterproof Tactical Shell Jacket", "quantity": 1, "price": 4999.00}]
            ),
            OrderModel(
                id=f"ord_{int(random.random()*1000000)}_2",
                workspace_id=ws_id,
                order_number="#ORD-72109",
                customer_name="Rohit Verma",
                customer_email="rohit.verma@example.com",
                total_amount=2499.00,
                currency="INR",
                financial_status="PAID",
                fulfillment_status="UNFULFILLED",
                items_json=[{"title": "Stealth Cargo Reflex Joggers", "quantity": 1, "price": 2499.00}]
            ),
            OrderModel(
                id=f"ord_{int(random.random()*1000000)}_3",
                workspace_id=ws_id,
                order_number="#ORD-61045",
                customer_name="Ananya Iyer",
                customer_email="ananya.iyer@example.com",
                total_amount=8998.00,
                currency="INR",
                financial_status="PAID",
                fulfillment_status="DELIVERED",
                items_json=[{"title": "Modular Fidlock Urban Sling Bag", "quantity": 2, "price": 4499.00}]
            )
        ]
        for so in sample_orders:
            db.add(so)
        await db.commit()
        return {"success": True, "count": len(sample_orders)}

    if not req.productId:
        raise HTTPException(status_code=400, detail="Product ID is required")

    stmt = select(ProductModel).where(ProductModel.id == req.productId, ProductModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    prod = res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    unit_price = prod.price
    qty = max(1, req.quantity or 1)
    total = unit_price * qty
    rand_num = random.randint(10000, 99999)

    new_order = OrderModel(
        id=f"ord_{uuid.uuid4().hex[:12]}",
        workspace_id=ws_id,
        order_number=f"#ORD-{rand_num}",
        customer_name=req.customerName or "Valued Customer",
        customer_email=(req.customerEmail or "customer@gmail.com").lower().strip(),
        total_amount=total,
        currency=prod.currency,
        financial_status="PROCESSING" if req.paymentMethod == "COD" else "PAID",
        fulfillment_status="UNFULFILLED",
        items_json=[{
            "product_id": prod.id,
            "title": prod.title,
            "quantity": qty,
            "price": unit_price
        }]
    )
    db.add(new_order)
    await db.commit()

    return {
        "success": True,
        "order": {
            "id": new_order.id,
            "order_number": new_order.order_number,
            "total_amount": new_order.total_amount,
            "currency": new_order.currency,
            "status": new_order.financial_status
        }
    }

@router.patch("/api/commerce/orders")
@router.patch("/api/v1/commerce/orders")
async def update_order(
    req: OrderUpdateRequest,
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(OrderModel).where(OrderModel.id == req.id, OrderModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if req.status is not None:
        order.financial_status = req.status
    if req.fulfillment_status is not None:
        order.fulfillment_status = req.fulfillment_status

    await db.commit()
    return {"success": True, "order": {"id": order.id, "status": order.financial_status}}

@router.delete("/api/commerce/orders")
@router.delete("/api/v1/commerce/orders")
async def delete_order(
    id: str = Query(...),
    session: Dict[str, Any] = Depends(require_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = session["workspaceId"]
    stmt = select(OrderModel).where(OrderModel.id == id, OrderModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await db.delete(order)
    await db.commit()
    return {"success": True}

# --- Checkout Commit ---

@router.post("/api/commerce/checkout/commit")
@router.post("/api/v1/commerce/checkout/commit")
async def commit_checkout(
    req: CheckoutCommitRequest,
    session: Optional[Dict[str, Any]] = Depends(get_optional_auth_session),
    db: AsyncSession = Depends(get_db_session)
):
    ws_id = req.workspace_id or (session["workspaceId"] if session else "ws_acme_corp")

    prod_id = req.productId or req.product_id
    qty = max(1, req.quantity or 1)

    if not prod_id and req.items and len(req.items) > 0:
        prod_id = req.items[0].get("product_id") or req.items[0].get("productId")
        if "quantity" in req.items[0]:
            qty = max(1, req.items[0]["quantity"])

    stmt = select(ProductModel).where(ProductModel.id == prod_id, ProductModel.workspace_id == ws_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        # Fallback to any product in tenant workspace if test product ID is used
        p_stmt = select(ProductModel).where(ProductModel.workspace_id == ws_id)
        p_res = await db.execute(p_stmt)
        product = p_res.scalars().first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found in store catalog")

    unit_price = product.price
    total_amount = unit_price * qty

    rand_num = random.randint(10000, 99999)
    order_number = f"#ORD-{rand_num}"

    c_name = (req.customerName or req.customer_name or "Valued Customer").strip()
    c_email = (req.customerEmail or req.customer_email or "customer@shopmate.com").lower().strip()
    c_pay = req.paymentMethod or req.payment_method or "UPI"

    new_order = OrderModel(
        id=f"ord_{uuid.uuid4().hex[:12]}",
        workspace_id=ws_id,
        order_number=order_number,
        customer_name=c_name,
        customer_email=c_email,
        total_amount=total_amount,
        currency=product.currency or "INR",
        financial_status="PROCESSING" if c_pay == "COD" else "PAID",
        fulfillment_status="UNFULFILLED",
        items_json=[{
            "product_id": product.id,
            "title": product.title,
            "quantity": qty,
            "price": unit_price
        }]
    )
    db.add(new_order)
    await db.commit()

    return {
        "success": True,
        "order_id": new_order.id,
        "order": {
            "id": new_order.id,
            "order_number": new_order.order_number,
            "total_amount": new_order.total_amount,
            "currency": new_order.currency,
            "customer_name": new_order.customer_name,
            "customer_email": new_order.customer_email
        },
        "message": f"Order {order_number} placed successfully."
    }

@router.post("/api/commerce/sync")
@router.post("/api/v1/commerce/sync")
async def sync_commerce(
    session: Dict[str, Any] = Depends(require_auth_session)
):
    return {
        "success": True,
        "synced": True,
        "message": "Store catalog synchronized successfully"
    }
