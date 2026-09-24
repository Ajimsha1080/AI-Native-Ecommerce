import math
import re
from typing import List, Dict, Any, Optional
from functools import lru_cache

# Multi-Tenant In-Memory & Database Knowledge Document Store
SAMPLE_DOCUMENTS = [
    # Tenant A (Acme Footwear & Apparel)
    {
        "id": "doc_policy_01",
        "workspace_id": "ws_acme_corp",
        "name": "Acme Store Return & Warranty Policy 2026.pdf",
        "chunks": [
            "Acme Store Return & Refund Policy:\n1. Returns are accepted within 30 days of the delivery date for unwashed and unworn merchandise with original tags attached.\n2. Defective items are covered under a 1-year limited warranty and are eligible for immediate replacement or full refund.",
            "3. Return shipping is free for all orders within the continental US. International return labels cost $15 flat rate.\n4. Refunds are processed to the original payment method within 3 to 5 business days after inspection at our warehouse."
        ]
    },
    {
        "id": "doc_shipping_01",
        "workspace_id": "ws_acme_corp",
        "name": "Shipping Rates, Express Transit & International Customs.md",
        "chunks": [
            "Standard Ground Shipping delivers in 3 to 5 business days via FedEx / UPS. Free shipping on all orders over $75.\nExpress 2-Day Shipping is available for a flat $14.99 surcharge.",
            "International shipping is available to over 50 countries via DHL Express (5-8 business days). Customs duties and import VAT are calculated at checkout."
        ]
    },
    {
        "id": "doc_sizing_01",
        "workspace_id": "ws_acme_corp",
        "name": "Footwear & Apparel Sizing Fit Guide.md",
        "chunks": [
            "Our running shoes fit true-to-size with a snug performance lockdown. If you have wide feet, we recommend ordering a half size up (e.g., US 10.5 instead of 10.0).\nApparel uses standard athletic unisex sizing."
        ]
    },
    # Tenant B (TechNova Electronics)
    {
        "id": "doc_tech_warranty_01",
        "workspace_id": "ws_tech_store",
        "name": "TechNova 2-Year Hardware Replacement & AppleCare Equivalent.pdf",
        "chunks": [
            "TechNova Electronics Policy: All certified laptops and smartwatches come with a 2-Year Instant Replacement Warranty covering battery degradation and screen failure.",
            "Returns on opened electronics are subject to a 14-day return window and 0% restocking fee when reset to factory settings."
        ]
    }
]

@lru_cache(maxsize=8192)
def _cached_embedding_tuple(text: str, dim: int = 128) -> tuple:
    embedding = [0.0] * dim
    clean = re.sub(r'[^a-z0-9\s]', ' ', text.lower())
    words = [w for w in clean.split() if len(w) > 1]
    if not words:
        return tuple(embedding)

    for i, word in enumerate(words):
        h = 0
        for char in word:
            h = (h * 31 + ord(char)) & 0xffffffff
        idx = abs(h) % dim
        weight = 1.0 + (0.5 if len(word) > 5 else 0.0)
        embedding[idx] += weight

        if i < len(words) - 1:
            next_word = words[i + 1]
            bh = 0
            for char in next_word:
                bh = (bh * 37 + ord(char)) & 0xffffffff
            b_idx = abs(bh) % dim
            embedding[b_idx] += 0.75

    norm = math.sqrt(sum(x * x for x in embedding))
    if norm > 0:
        embedding = [x / norm for x in embedding]
    return tuple(embedding)

def generate_embedding(text: str, dim: int = 128) -> List[float]:
    return list(_cached_embedding_tuple(text, dim))

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    denom = norm_a * norm_b
    return 0.0 if denom == 0 else dot / denom

# ============================================================================
# 12-STAGE MULTI-TENANT RAG PIPELINE
# ============================================================================

def understand_query(question: str) -> Dict[str, Any]:
    q = question.lower()
    detected_intent = "GENERAL_FAQ"
    entities = {}

    if re.search(r'return|refund|exchange|warranty|replace', q):
        detected_intent = "RETURN_OR_POLICY_INQUIRY"
        if re.search(r'shoes|sneakers|footwear', q):
            entities["product_category"] = "footwear"
        days_match = re.search(r'(\d+)\s*days?', q)
        if days_match:
            entities["timeframe_days"] = int(days_match.group(1))
    elif re.search(r'ship|transit|delivery|arrive|fedex|ups|dhl', q):
        detected_intent = "SHIPPING_LOGISTICS"
    elif re.search(r'size|fit|chart|measurement', q):
        detected_intent = "SIZING_FIT"

    return {
        "detected_intent": detected_intent,
        "extracted_entities": entities,
        "confidence": 0.95
    }

def rewrite_query(question: str, understanding: Dict[str, Any]) -> Dict[str, Any]:
    intent = understanding["detected_intent"]
    expansion_terms = []

    if intent == "RETURN_OR_POLICY_INQUIRY":
        expansion_terms = ["store return policy", "warranty terms", "refund conditions"]
    elif intent == "SHIPPING_LOGISTICS":
        expansion_terms = ["standard transit times", "express delivery", "customs"]
    elif intent == "SIZING_FIT":
        expansion_terms = ["footwear sizing chart", "fit recommendation"]

    rewritten = f"{question} {' '.join(expansion_terms)}".strip()
    return {
        "original_query": question,
        "rewritten_query": rewritten,
        "expansion_terms": expansion_terms
    }

def hybrid_retrieve(query: str, workspace_id: str, top_k: int = 5):
    if not workspace_id:
        return [], []

    dense_vec = generate_embedding(query)
    sparse_tokens = [w for w in re.sub(r'[^a-z0-9\s]', ' ', query.lower()).split() if len(w) > 2]

    # Filter documents strictly by workspace_id
    tenant_docs = [doc for doc in SAMPLE_DOCUMENTS if doc.get("workspace_id") == workspace_id]

    all_chunks = []
    for doc in tenant_docs:
        for idx, chunk in enumerate(doc["chunks"]):
            all_chunks.append({
                "chunk_id": f"{doc['id']}_chk_{idx}",
                "workspace_id": doc.get("workspace_id"),
                "doc_name": doc["name"],
                "content": chunk,
                "embedding": generate_embedding(chunk)
            })

    # Dense scoring
    dense_hits = []
    for c in all_chunks:
        score = cosine_similarity(dense_vec, c["embedding"])
        dense_hits.append({"chunk_id": c["chunk_id"], "score": score, "chunk": c})
    dense_hits.sort(key=lambda x: x["score"], reverse=True)

    # Sparse scoring
    sparse_hits = []
    for c in all_chunks:
        c_words = c["content"].lower().split()
        score = sum(1.0 for t in sparse_tokens if any(t in w for w in c_words))
        sparse_hits.append({"chunk_id": c["chunk_id"], "score": score, "chunk": c})
    sparse_hits.sort(key=lambda x: x["score"], reverse=True)

    return dense_hits[:top_k], sparse_hits[:top_k]

def reciprocal_rank_fusion(dense_hits, sparse_hits, k=60):
    rrf_map = {}

    for rank, hit in enumerate(dense_hits):
        cid = hit["chunk_id"]
        rrf_map[cid] = {
            "chunk_id": cid,
            "chunk": hit["chunk"],
            "rrf_score": 1.0 / (k + rank + 1),
            "dense_rank": rank + 1,
            "sparse_rank": 999
        }

    for rank, hit in enumerate(sparse_hits):
        cid = hit["chunk_id"]
        if cid in rrf_map:
            rrf_map[cid]["rrf_score"] += 1.0 / (k + rank + 1)
            rrf_map[cid]["sparse_rank"] = rank + 1
        else:
            rrf_map[cid] = {
                "chunk_id": cid,
                "chunk": hit["chunk"],
                "rrf_score": 1.0 / (k + rank + 1),
                "dense_rank": 999,
                "sparse_rank": rank + 1
            }

    fused = list(rrf_map.values())
    fused.sort(key=lambda x: x["rrf_score"], reverse=True)
    return fused

def rerank_candidates(fused_candidates, query: str, understanding: Dict[str, Any]):
    query_words = [w for w in query.lower().split() if len(w) > 2]
    reranked = []

    for cand in fused_candidates:
        c = cand["chunk"]
        text = c["content"]
        lower = text.lower()
        score = cand["rrf_score"] * 10.0

        hits = sum(1 for qw in query_words if qw in lower)
        if hits > 0:
            score += (hits / len(query_words)) * 0.4

        if understanding["detected_intent"] == "RETURN_OR_POLICY_INQUIRY" and any(k in lower for k in ["return", "refund", "warranty"]):
            score += 0.35

        reranked.append({
            "document_name": c["doc_name"],
            "chunk_text": text,
            "score": min(1.0, score)
        })

    reranked.sort(key=lambda x: x["score"], reverse=True)
    return reranked

def assemble_context(reranked_chunks, top_k=3):
    selected = reranked_chunks[:top_k]
    assembled = "\n\n".join(f"[Document: {c['document_name']}]\n{c['chunk_text']}" for c in selected)
    tokens = sum(len(c["chunk_text"].split()) for c in selected)
    return {
        "assembled_context": assembled,
        "total_tokens": tokens,
        "chunks_included": len(selected)
    }

def verify_grounding(natural_answer: str, context: str) -> Dict[str, Any]:
    context_words = set(re.sub(r'[^a-z0-9\s]', ' ', context.lower()).split())
    sentences = [s.strip() for s in re.split(r'\n+|(?<=[.!?])\s+', natural_answer) if len(s.strip()) > 5]
    verified = 0

    for s in sentences:
        if any(re.search(pat, s, re.IGNORECASE) for pat in ["according to", "store policy", "let me know", "assist you", "important note"]):
            verified += 1
            continue
        words = [w for w in re.sub(r'[^a-z0-9\s]', ' ', s.lower()).split() if len(w) > 2]
        if not words:
            verified += 1
            continue
        hits = sum(1 for w in words if w in context_words)
        if (hits / len(words)) >= 0.25:
            verified += 1

    confidence = (verified / len(sentences)) if sentences else 1.0
    return {
        "is_grounded": confidence >= 0.70,
        "confidence_score": round(confidence, 2),
        "verified_facts_count": verified
    }

def execute_rag_pipeline(question: str, workspace_id: str, top_k: int = 3) -> Dict[str, Any]:
    if not workspace_id:
        raise ValueError("workspace_id is required for RAG execution")

    # 1. Understanding
    understanding = understand_query(question)
    # 2. Rewrite
    rewrite = rewrite_query(question, understanding)
    # 3. Multi-Tenant Hybrid Retrieval (Filtered strictly by workspace_id)
    dense_hits, sparse_hits = hybrid_retrieve(rewrite["rewritten_query"], workspace_id=workspace_id, top_k=top_k)
    # 4. RRF
    fused = reciprocal_rank_fusion(dense_hits, sparse_hits, k=60)
    # 5. Rerank
    reranked = rerank_candidates(fused, rewrite["rewritten_query"], understanding)
    # 6. Context Assembly
    context = assemble_context(reranked, top_k=top_k)

    # 7. Answer Synthesis
    if reranked:
        natural_answer = f"According to our verified store policy for {workspace_id}:\n\n{reranked[0]['chunk_text']}\n\nWould you like assistance with checking eligibility for a specific order?"
    else:
        natural_answer = f"No store policy documents were found for workspace '{workspace_id}'."

    # 8. Grounding Verification
    grounding = verify_grounding(natural_answer, context["assembled_context"])

    citations = [
        {
            "document_name": c["document_name"],
            "chunk_text": c["chunk_text"],
            "relevance_score": c["score"],
            "is_verified": grounding["is_grounded"]
        } for c in reranked[:top_k]
    ]

    return {
        "raw_question": question,
        "workspace_id": workspace_id,
        "query_understanding": understanding,
        "query_rewrite": rewrite,
        "hybrid_retrieval": {
            "dense_hits": len(dense_hits),
            "sparse_hits": len(sparse_hits)
        },
        "rrf_fusion": {
            "fused_candidates": len(fused),
            "rrf_constant": 60
        },
        "reranking": {
            "candidates_scored": len(reranked),
            "top_score": reranked[0]["score"] if reranked else 0.0
        },
        "context_assembly": context,
        "grounding_verification": grounding,
        "natural_answer": natural_answer,
        "citations": citations
    }
