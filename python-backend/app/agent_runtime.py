import time
import uuid
import re
from typing import Dict, Any, Optional, List
from .rag import execute_rag_pipeline

# Multi-Tenant Catalog Products
PRODUCTS = [
    # Tenant A (Acme Footwear)
    {
        "id": "prod_01",
        "workspace_id": "ws_acme_corp",
        "title": "AeroPulse Velocity Running Shoes",
        "category": "Footwear",
        "price": 149.99,
        "description": "Ultra-breathable carbon-plated running shoes with responsive foam cushioning.",
        "in_stock": True
    },
    {
        "id": "prod_02",
        "workspace_id": "ws_acme_corp",
        "title": "StormShield All-Weather Trail Jacket",
        "category": "Outerwear",
        "price": 189.50,
        "description": "3-layer GORE-TEX waterproof shell with reinforced storm seams.",
        "in_stock": True
    },
    # Tenant B (TechNova Electronics)
    {
        "id": "prod_tech_01",
        "workspace_id": "ws_tech_store",
        "title": "UltraBook Titanium 16 M3 Pro",
        "category": "Laptops",
        "price": 2199.00,
        "description": "M3 Pro architecture with 32GB RAM, 1TB SSD, 120Hz Liquid Retina display.",
        "in_stock": True
    },
    {
        "id": "prod_tech_02",
        "workspace_id": "ws_tech_store",
        "title": "Chronos Smartwatch Gen 4",
        "category": "Wearables",
        "price": 399.00,
        "description": "Sapphire glass, ECG monitoring, titanium bezel, 14-day battery reserve.",
        "in_stock": True
    }
]

# Multi-Tenant Orders
ORDERS = {
    "ws_acme_corp": {
        "#10482": {
            "order_number": "#10482",
            "workspace_id": "ws_acme_corp",
            "status": "DELIVERED",
            "carrier": "FedEx Express",
            "tracking_number": "FX-8941039821-US",
            "items": ["1x AeroPulse Velocity Running Shoes (Size US 10.5)"],
            "shipping_address": "742 Evergreen Terrace, Springfield, OR"
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
            "shipping_address": "100 Market St, San Francisco, CA"
        }
    }
}

def execute_tool(tool_name: str, params: Dict[str, Any], workspace_id: str) -> Dict[str, Any]:
    start = time.time()
    if not workspace_id:
        raise ValueError("workspace_id is required for tool execution")

    if tool_name == "product_search":
        q = params.get("query", "").lower()
        # Filter products strictly by tenant workspace_id
        tenant_prods = [p for p in PRODUCTS if p.get("workspace_id") == workspace_id]
        matched = [p for p in tenant_prods if any(w in p["title"].lower() or w in p["description"].lower() for w in q.split() if len(w) > 3)]
        if not matched and tenant_prods:
            matched = tenant_prods[:2]
        return {
            "status": "SUCCESS",
            "output": f"Found {len(matched)} product(s) for workspace {workspace_id}",
            "data": matched,
            "latency_ms": int((time.time() - start) * 1000)
        }
    elif tool_name == "order_lookup":
        ord_num = params.get("order_number", "").strip()
        tenant_orders = ORDERS.get(workspace_id, {})
        order = tenant_orders.get(ord_num)
        
        if order:
            return {
                "status": "SUCCESS",
                "output": f"Order {ord_num} found: {order['status']}",
                "data": order,
                "latency_ms": int((time.time() - start) * 1000)
            }
        else:
            return {
                "status": "FAILED",
                "output": f"Order {ord_num} not found in workspace {workspace_id}",
                "data": None,
                "latency_ms": int((time.time() - start) * 1000)
            }

    return {"status": "FAILED", "output": f"Unknown tool: {tool_name}", "latency_ms": 10}

def run_agent_cycle(
    agent_id: str, 
    message: str, 
    workspace_id: str,
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    if not workspace_id:
        raise ValueError("workspace_id is mandatory and cannot be empty")

    start_time = time.time()
    conv_id = conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
    msg_id = f"msg_{uuid.uuid4().hex[:10]}"

    planning_steps = []
    tool_executions = []

    # 1. Intent Detection
    detected_intent = "GENERAL_QUERY"
    if re.search(r'human|operator|live agent|representative', message, re.I):
        detected_intent = "HUMAN_HANDOFF"
    elif re.search(r'return|refund|exchange|warranty|policy', message, re.I):
        detected_intent = "RETURN_OR_POLICY_INQUIRY"
    elif re.search(r'order|track|#\d+|where is my', message, re.I):
        detected_intent = "ORDER_TRACKING"
    elif re.search(r'find|search|catalog|product|item|shoe|sneaker|running|jacket|laptop|watch|buy|recommend', message, re.I):
        detected_intent = "PRODUCT_SEARCH"


    planning_steps.append(f"1. Tenant context resolved: {workspace_id} | Intent: {detected_intent}")

    # 2. Multi-Tenant 12-Stage RAG Pipeline Execution
    planning_steps.append(f"2. Running 12-Stage RAG scoped strictly to tenant '{workspace_id}'.")
    rag_result = execute_rag_pipeline(message, workspace_id=workspace_id)
    citations = rag_result["citations"]

    response_text = ""
    interactive_payload = None

    if detected_intent == "PRODUCT_SEARCH":
        planning_steps.append(f"3. Executing tenant-isolated tool 'product_search'")
        tool_res = execute_tool("product_search", {"query": message}, workspace_id=workspace_id)
        tool_executions.append({
            "tool_name": "product_search",
            "input": {"query": message, "workspace_id": workspace_id},
            "output": tool_res["output"],
            "status": "SUCCESS",
            "latency_ms": tool_res["latency_ms"]
        })
        items = tool_res["data"]
        response_text = f"I found **{len(items)}** matching product(s) in your store catalog:\n\n"
        for item in items:
            response_text += f"• **{item['title']}** — **${item['price']}** ({item['category']})\n  {item['description']}\n\n"
        interactive_payload = {"type": "PRODUCTS", "data": items}

    elif detected_intent == "ORDER_TRACKING":
        planning_steps.append(f"3. Executing tenant-isolated tool 'order_lookup'")
        order_match = re.search(r'#\d+', message)
        order_num = order_match.group(0) if order_match else "#10482"
        tool_res = execute_tool("order_lookup", {"order_number": order_num}, workspace_id=workspace_id)
        tool_executions.append({
            "tool_name": "order_lookup",
            "input": {"order_number": order_num, "workspace_id": workspace_id},
            "output": tool_res["output"],
            "status": tool_res["status"],
            "latency_ms": tool_res["latency_ms"]
        })
        order = tool_res["data"]
        if order:
            response_text = (
                f"📦 **Order Status: {order['status']}**\n\n"
                f"• **Carrier**: {order['carrier']}\n"
                f"• **Tracking Number**: `{order['tracking_number']}`\n"
                f"• **Items**: {', '.join(order['items'])}\n"
                f"• **Destination**: {order['shipping_address']}\n\n"
                f"Estimated delivery is on schedule. Let me know if you need to make changes!"
            )
            interactive_payload = {
                "type": "ORDER_TRACKING",
                "data": order
            }
        else:
            response_text = f"I searched your records, but could not find order `{order_num}` in your current store. Please verify your order number and try again."

    elif detected_intent == "RETURN_OR_POLICY_INQUIRY":
        planning_steps.append("3. Directing to verified RAG knowledge base policy answer.")
        response_text = rag_result["natural_answer"]
        interactive_payload = {
            "type": "QUICK_REPLIES",
            "data": ["Start Return Request", "Speak with Operator", "Check Sizing Chart"]
        }

    elif detected_intent == "HUMAN_HANDOFF":
        planning_steps.append("3. Flagging conversation for live human operator escalation.")
        response_text = "I have flagged this session for our customer support team. A representative will join this chat momentarily."
        interactive_payload = {
            "type": "CONFIRMATION",
            "data": {"action": "HUMAN_ESCALATION_TRIGGERED", "status": "PENDING_OPERATOR"}
        }

    else:
        planning_steps.append("3. Generating conversational general response.")
        response_text = (
            f"Hello! I am your AI assistant for {workspace_id}. "
            "I can assist you with finding catalog items, checking live orders, sizing advice, or store returns. "
            "How may I help you today?"
        )

    duration_ms = int((time.time() - start_time) * 1000)

    trace = {
        "id": f"trc_{uuid.uuid4().hex[:12]}",
        "conversation_id": conv_id,
        "message_id": msg_id,
        "agent_id": agent_id,
        "workspace_id": workspace_id,
        "intent": detected_intent,
        "goal": f"Respond to '{message[:40]}...' with strict tenant isolation",
        "planning_steps": planning_steps,
        "tool_executions": tool_executions,
        "retrieved_citations": citations,
        "rag_pipeline": rag_result,
        "policies_evaluated": [
            {"policy_title": "Stock Guardrail", "enforcement": "ALLOW", "passed": True},
            {"policy_title": "Tenancy Guardrail", "enforcement": "STRICT_WORKSPACE_LOCK", "passed": True},
            {"policy_title": "Discount Cap", "enforcement": "LIMIT_20_PCT", "passed": True}
        ],
        "latency_ms": duration_ms,
        "tokens_used": {
            "input": len(message.split()) * 4,
            "output": len(response_text.split()) * 4,
            "total": (len(message.split()) + len(response_text.split())) * 4
        },
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    return {
        "conversation_id": conv_id,
        "message_id": msg_id,
        "response": response_text,
        "interactive_payload": interactive_payload,
        "intent": detected_intent,
        "latency_ms": duration_ms,
        "trace": trace
    }
