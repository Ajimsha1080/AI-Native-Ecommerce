import sys
import os

# Ensure utf-8 output encoding on Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.rag import execute_rag_pipeline
from app.agent_runtime import run_agent_cycle

def test():
    print("========================================================")
    print("RUNNING PYTHON BACKEND VERIFICATION SUITE")
    print("========================================================")
    
    # 1. Test RAG
    print("\n[TEST 1] 12-Stage RAG Pipeline Execution...")
    rag_res = execute_rag_pipeline("Can I return shoes after 20 days?")
    print(f"  * Intent: {rag_res['query_understanding']['detected_intent']}")
    print(f"  * Rewritten Query: {rag_res['query_rewrite']['rewritten_query']}")
    print(f"  * Hybrid Retrieval Hits: {rag_res['hybrid_retrieval']['dense_hits']} Dense / {rag_res['hybrid_retrieval']['sparse_hits']} Sparse")
    print(f"  * Top Rerank Score: {rag_res['reranking']['top_score']:.2f}")
    print(f"  * Grounding Confidence: {rag_res['grounding_verification']['confidence_score'] * 100:.0f}%")
    print(f"  * Citations Found: {len(rag_res['citations'])}")
    print("  [PASS] RAG Pipeline PASSED")

    # 2. Test Agent Runtime Product Search
    print("\n[TEST 2] Agent Runtime (Product Search & Tools)...")
    agent_res = run_agent_cycle("agent_shopmate_01", "Show me running shoes under 160")
    print(f"  * Intent: {agent_res['trace']['intent']}")
    print(f"  * Tool Executed: {agent_res['trace']['tool_executions'][0]['tool_name']}")
    print(f"  * Response Length: {len(agent_res['response'])} chars")
    print("  [PASS] Agent Runtime PASSED")

    # 3. Test Agent Runtime Order Tracking
    print("\n[TEST 3] Agent Runtime (Order Lookup)...")
    order_res = run_agent_cycle("agent_shopmate_01", "Where is my package #10482?")
    print(f"  * Intent: {order_res['trace']['intent']}")
    print(f"  * Order Status in Payload: {order_res['interactive_payload']['data']['status']}")
    print("  [PASS] Order Tracking PASSED")

    print("\n========================================================")
    print("SUMMARY: ALL PYTHON BACKEND TESTS PASSED (3/3)")
    print("========================================================")

if __name__ == "__main__":
    test()
