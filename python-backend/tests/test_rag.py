import pytest
from app.rag import (
    generate_embedding,
    cosine_similarity,
    reciprocal_rank_fusion,
    assemble_context,
    verify_grounding
)

def test_generate_embedding_dimensions():
    emb = generate_embedding("Return window for unworn items")
    assert isinstance(emb, list)
    assert len(emb) == 1536
    # Vector must be normalized: sum of squares ≈ 1.0
    magnitude = sum(x * x for x in emb)
    assert abs(magnitude - 1.0) < 0.05

def test_cosine_similarity():
    emb1 = generate_embedding("shipping policy within Europe")
    emb2 = generate_embedding("shipping policy within Europe")
    sim_same = cosine_similarity(emb1, emb2)
    assert abs(sim_same - 1.0) < 0.001

    emb3 = generate_embedding("completely unrelated banana fruit salad recipe")
    sim_diff = cosine_similarity(emb1, emb3)
    assert sim_diff < sim_same

def test_rrf_fusion():
    dense_hits = [
        {"chunk_id": "c1", "chunk": {"content": "Doc 1", "doc_name": "D1"}},
        {"chunk_id": "c2", "chunk": {"content": "Doc 2", "doc_name": "D2"}},
    ]
    sparse_hits = [
        {"chunk_id": "c2", "chunk": {"content": "Doc 2", "doc_name": "D2"}},
        {"chunk_id": "c3", "chunk": {"content": "Doc 3", "doc_name": "D3"}},
    ]
    fused = reciprocal_rank_fusion(dense_hits, sparse_hits, k=60)
    assert len(fused) == 3
    # c2 appeared in both dense and sparse, so it must be top ranked
    assert fused[0]["chunk_id"] == "c2"

def test_assemble_context():
    chunks = [
        {"document_name": "Returns.pdf", "chunk_text": "Returns accepted within 30 days."},
        {"document_name": "Shipping.pdf", "chunk_text": "Standard shipping takes 3-5 days."}
    ]
    context = assemble_context(chunks, top_k=2)
    assert context["chunks_included"] == 2
    assert "<<<UNTRUSTED_CATALOG_DATA>>>" in context["assembled_context"]
    assert "Returns accepted within 30 days." in context["assembled_context"]

def test_verify_grounding():
    context = "Our standard return window is 30 days with original tags intact."
    grounded_answer = "According to our store policy, the return window is 30 days with original tags intact."
    res = verify_grounding(grounded_answer, context, has_retrieved_chunks=True)
    assert res["is_grounded"] is True

    # Empty retrieved chunks with acknowledgement
    safe_answer = "I do not have that information on file in our store policy."
    res_empty = verify_grounding(safe_answer, "", has_retrieved_chunks=False)
    assert res_empty["is_grounded"] is True
