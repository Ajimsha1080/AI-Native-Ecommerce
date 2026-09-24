import re
from typing import Dict, Any, Optional, List

# Multi-Tenant In-Memory Catalog & Order Store (Synced with Database)
TENANT_PRODUCTS = {
    "ws_acme_corp": [
        {
            "id": "prod_01",
            "workspace_id": "ws_acme_corp",
            "title": "AeroPulse Velocity Running Shoes",
            "category": "Footwear",
            "price": 149.99,
            "stock": 42,
            "description": "Ultra-breathable carbon-plated running shoes with responsive foam cushioning.",
            "in_stock": True
        },
        {
            "id": "prod_02",
            "workspace_id": "ws_acme_corp",
            "title": "StormShield All-Weather Trail Jacket",
            "category": "Outerwear",
            "price": 189.50,
            "stock": 18,
            "description": "3-layer GORE-TEX waterproof shell with reinforced storm seams.",
            "in_stock": True
        },
        {
            "id": "prod_03",
            "workspace_id": "ws_acme_corp",
            "title": "HydroPulse 32oz Insulated Flask",
            "category": "Accessories",
            "price": 34.00,
            "stock": 0,
            "description": "Double-wall vacuum insulated stainless steel bottle with leakproof lid.",
            "in_stock": False
        }
    ],
    "ws_tech_store": [
        {
            "id": "prod_tech_01",
            "workspace_id": "ws_tech_store",
            "title": "UltraBook Titanium 16 M3 Pro",
            "category": "Laptops",
            "price": 2199.00,
            "stock": 12,
            "description": "M3 Pro architecture with 32GB RAM, 1TB SSD, 120Hz Liquid Retina display.",
            "in_stock": True
        },
        {
            "id": "prod_tech_02",
            "workspace_id": "ws_tech_store",
            "title": "Chronos Smartwatch Gen 4",
            "category": "Wearables",
            "price": 399.00,
            "stock": 25,
            "description": "Sapphire glass, ECG monitoring, titanium bezel, 14-day battery reserve.",
            "in_stock": True
        }
    ]
}

TENANT_ORDERS = {
    "ws_acme_corp": {
        "#10482": {
            "order_number": "#10482",
            "workspace_id": "ws_acme_corp",
            "status": "DELIVERED",
            "carrier": "FedEx Express",
            "tracking_number": "FX-8941039821-US",
            "items": ["1x AeroPulse Velocity Running Shoes (Size US 10.5)"],
            "total_amount": 149.99,
            "masked_address": "742 Evergreen ***, Springfield, OR"
        }
    },
    "ws_tech_store": {
        "#20991": {
            "order_number": "#20991",
            "workspace_id": "ws_tech_store",
            "status": "IN_TRANSIT",
            "carrier": "UPS Next Day Air",
            "tracking_number": "1Z9999999999999999",
            "items": ["1x UltraBook Titanium 16"],
            "total_amount": 2199.00,
            "masked_address": "100 Market ***, San Francisco, CA"
        }
    }
}

# Valid Discount Codes configured per workspace
DISCOUNT_RULES = {
    "ws_acme_corp": {
        "WELCOME10": {"type": "PERCENTAGE", "value": 10.0, "max_discount": 30.0, "min_subtotal": 50.0},
        "SAVE20": {"type": "PERCENTAGE", "value": 20.0, "max_discount": 50.0, "min_subtotal": 100.0},
        "FLAT15": {"type": "FIXED", "value": 15.0, "max_discount": 15.0, "min_subtotal": 60.0}
    },
    "ws_tech_store": {
        "TECHNOVANEW": {"type": "PERCENTAGE", "value": 5.0, "max_discount": 100.0, "min_subtotal": 200.0}
    }
}

# ============================================================================
# TOOL DEFINITIONS & JSON SCHEMAS FOR LLM FUNCTION CALLING
# ============================================================================

TOOL_DEFINITIONS = [
    {
        "name": "search_products",
        "description": "Search for products in the catalog by keyword query or category.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query or keywords (e.g. 'running shoes', 'jacket')"},
                "category": {"type": "string", "description": "Optional category filter"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_product_details",
        "description": "Fetch complete specifications, pricing, and stock status for a specific product ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string", "description": "Unique identifier of the product"}
            },
            "required": ["product_id"]
        }
    },
    {
        "name": "check_inventory",
        "description": "Check real-time stock availability and inventory counts for a product.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string", "description": "Unique identifier of the product"}
            },
            "required": ["product_id"]
        }
    },
    {
        "name": "calculate_cart",
        "description": "Compute exact line items, subtotal, server-verified discounts, shipping, tax, and total amount. Never invent arithmetic.",
        "parameters": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "description": "List of cart items with product_id and quantity",
                    "items": {
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "string"},
                            "quantity": {"type": "integer", "minimum": 1}
                        },
                        "required": ["product_id", "quantity"]
                    }
                },
                "discount_code": {"type": "string", "description": "Optional coupon code to apply"}
            },
            "required": ["items"]
        }
    },
    {
        "name": "apply_discount",
        "description": "Validate and compute discount amount for a given coupon code and subtotal against server policy.",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Coupon or promo code string"},
                "subtotal": {"type": "number", "description": "Current order subtotal before discount"}
            },
            "required": ["code", "subtotal"]
        }
    },
    {
        "name": "lookup_order",
        "description": "Look up an order by order number with masked PII and tracking info.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_number": {"type": "string", "description": "Order number, e.g. #10482"}
            },
            "required": ["order_number"]
        }
    }
]

# ============================================================================
# SERVER-SIDE DETERMINISTIC TOOL EXECUTIONS
# ============================================================================

def search_products(workspace_id: str, query: str, category: Optional[str] = None) -> Dict[str, Any]:
    prods = TENANT_PRODUCTS.get(workspace_id, [])
    stopwords = {"show", "catalog", "products", "product", "item", "items", "what", "have", "your", "list", "store", "all", "our", "the", "for"}
    raw_words = [w.lower() for w in re.sub(r'[^a-zA-Z0-9\s]', ' ', query).split() if len(w) > 2]
    q_words = [w for w in raw_words if w not in stopwords]

    scored_matches = []
    for p in prods:
        if category and p.get("category", "").lower() != category.lower():
            continue
        title_desc = f"{p['title']} {p.get('description', '')} {p.get('category', '')}".lower()
        score = sum(1 for w in q_words if w in title_desc) if q_words else 1
        if score > 0 or not q_words:
            scored_matches.append((score, p))
            
    scored_matches.sort(key=lambda x: x[0], reverse=True)
    matches = [p for _, p in scored_matches]

    if not matches and prods:
        matches = prods[:3]

    return {
        "count": len(matches),
        "products": matches
    }

def get_product_details(workspace_id: str, product_id: str) -> Dict[str, Any]:
    prods = TENANT_PRODUCTS.get(workspace_id, [])
    for p in prods:
        if p["id"] == product_id:
            return {"found": True, "product": p}
    return {"found": False, "error": f"Product '{product_id}' not found in catalog"}

def check_inventory(workspace_id: str, product_id: str) -> Dict[str, Any]:
    prods = TENANT_PRODUCTS.get(workspace_id, [])
    for p in prods:
        if p["id"] == product_id or p["title"].lower() == product_id.lower():
            return {
                "product_id": p["id"],
                "title": p["title"],
                "in_stock": p["stock"] > 0,
                "stock_count": p["stock"],
                "status": "IN_STOCK" if p["stock"] > 0 else "OUT_OF_STOCK"
            }
    return {"found": False, "error": f"Product '{product_id}' not found"}

def apply_discount(workspace_id: str, code: str, subtotal: float) -> Dict[str, Any]:
    clean_code = code.strip().upper()
    rules = DISCOUNT_RULES.get(workspace_id, {})
    rule = rules.get(clean_code)

    if not rule:
        return {
            "valid": False,
            "code": clean_code,
            "discount_amount": 0.0,
            "message": f"Coupon code '{clean_code}' is invalid or expired."
        }

    if subtotal < rule["min_subtotal"]:
        return {
            "valid": False,
            "code": clean_code,
            "discount_amount": 0.0,
            "message": f"Coupon '{clean_code}' requires a minimum subtotal of ${rule['min_subtotal']:.2f}."
        }

    if rule["type"] == "PERCENTAGE":
        raw_discount = round(subtotal * (rule["value"] / 100.0), 2)
        capped_discount = min(raw_discount, rule["max_discount"])
    else:
        capped_discount = min(rule["value"], rule["max_discount"])

    capped_discount = min(capped_discount, subtotal)

    return {
        "valid": True,
        "code": clean_code,
        "discount_type": rule["type"],
        "discount_value": rule["value"],
        "discount_amount": round(capped_discount, 2),
        "message": f"Successfully applied promo code '{clean_code}' saving ${capped_discount:.2f}."
    }

def calculate_cart(workspace_id: str, items: List[Dict[str, Any]], discount_code: Optional[str] = None) -> Dict[str, Any]:
    prods = {p["id"]: p for p in TENANT_PRODUCTS.get(workspace_id, [])}
    line_items = []
    subtotal = 0.0

    for item in items:
        pid = item.get("product_id")
        qty = int(item.get("quantity", 1))
        if qty <= 0:
            continue
        prod = prods.get(pid)
        if not prod:
            # Try finding by title
            for p in prods.values():
                if p["title"].lower() == str(pid).lower():
                    prod = p
                    break
        if not prod:
            return {"error": f"Product '{pid}' not found in store catalog."}

        unit_price = float(prod["price"])
        item_total = round(unit_price * qty, 2)
        subtotal = round(subtotal + item_total, 2)

        line_items.append({
            "product_id": prod["id"],
            "title": prod["title"],
            "unit_price": unit_price,
            "quantity": qty,
            "total_price": item_total,
            "in_stock": prod["stock"] >= qty
        })

    # Discount evaluation
    discount_info = {"valid": False, "discount_amount": 0.0}
    if discount_code:
        discount_info = apply_discount(workspace_id, discount_code, subtotal)

    discount_amount = discount_info.get("discount_amount", 0.0)
    discounted_subtotal = max(0.0, round(subtotal - discount_amount, 2))

    # Shipping policy: Free shipping on orders over $75, otherwise $5.99
    shipping = 0.0 if discounted_subtotal >= 75.0 or discounted_subtotal == 0.0 else 5.99
    # Tax rate: 8.25%
    tax = round(discounted_subtotal * 0.0825, 2)
    grand_total = round(discounted_subtotal + shipping + tax, 2)

    return {
        "currency": "USD",
        "line_items": line_items,
        "item_count": sum(li["quantity"] for li in line_items),
        "subtotal": subtotal,
        "discount_applied": discount_info,
        "discounted_subtotal": discounted_subtotal,
        "shipping_amount": shipping,
        "tax_amount": tax,
        "grand_total": grand_total
    }

def lookup_order(workspace_id: str, order_number: str) -> Dict[str, Any]:
    clean_num = order_number.strip()
    if not clean_num.startswith("#"):
        clean_num = f"#{clean_num}"

    tenant_orders = TENANT_ORDERS.get(workspace_id, {})
    order = tenant_orders.get(clean_num)

    if order:
        return {
            "found": True,
            "order": order
        }
    return {
        "found": False,
        "error": f"Order '{clean_num}' not found in store records."
    }

def execute_typed_tool(tool_name: str, arguments: Dict[str, Any], workspace_id: str) -> Dict[str, Any]:
    if not workspace_id:
        raise ValueError("workspace_id is required for tool execution")

    if tool_name == "search_products":
        return search_products(workspace_id, arguments.get("query", ""), arguments.get("category"))
    elif tool_name == "get_product_details":
        return get_product_details(workspace_id, arguments.get("product_id", ""))
    elif tool_name == "check_inventory":
        return check_inventory(workspace_id, arguments.get("product_id", ""))
    elif tool_name == "calculate_cart":
        return calculate_cart(workspace_id, arguments.get("items", []), arguments.get("discount_code"))
    elif tool_name == "apply_discount":
        return apply_discount(workspace_id, arguments.get("code", ""), float(arguments.get("subtotal", 0.0)))
    elif tool_name == "lookup_order":
        return lookup_order(workspace_id, arguments.get("order_number", ""))
    else:
        return {"error": f"Unknown tool '{tool_name}'"}
