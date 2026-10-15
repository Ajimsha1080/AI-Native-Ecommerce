import re
import math
from functools import lru_cache
from typing import List, Dict, Any

@lru_cache(maxsize=4096)
def generate_deterministic_aligned_vector(text: str, dim: int = 1536) -> List[float]:
    """Test fixture: Generates a 1536-dimensional L2-normalized vector for offline test runs."""
    embedding = [0.0] * dim
    clean = re.sub(r'[^a-z0-9\s]', ' ', text.lower())
    words = [w for w in clean.split() if len(w) > 1]
    if not words:
        return embedding

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
    return embedding

def deterministic_test_llm_call(messages: List[Dict[str, str]], tools: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Test fixture: Deterministic tool-calling / LLM mock for unit testing."""
    user_msg = messages[-1]["content"] if messages else ""
    user_lower = user_msg.lower()
    if any(w in user_lower for w in ["shoe", "jacket", "shirt", "search", "find", "product"]):
        return {
            "content": "Searching store catalog for matching items.",
            "tool_calls": [{
                "id": "tc_test_search",
                "tool_name": "search_products",
                "arguments": {"query": user_msg}
            }],
            "provider": "test_deterministic"
        }
    return {
        "content": f"Test deterministic response for: {user_msg}",
        "tool_calls": [],
        "provider": "test_deterministic"
    }
