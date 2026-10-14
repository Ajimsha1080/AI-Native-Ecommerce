import pytest
from app.llm import LLMClient
from app.tools import execute_typed_tool

def test_llm_client_fails_closed_when_unconfigured(monkeypatch):
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ALLOW_TEST_DETERMINISTIC_LLM", raising=False)
    monkeypatch.setenv("LLM_PROVIDER", "unconfigured")
    
    client = LLMClient()
    assert client.is_configured() is False
    with pytest.raises(RuntimeError) as exc:
        client.call_model([{"role": "user", "content": "hello"}], [])
    assert "LLM runtime is not configured or available" in str(exc.value)


def test_tool_execution_catalog_search():
    # Test built-in typed tool with workspace_id
    result = execute_typed_tool("search_products", {"query": "shirt"}, workspace_id="ws_acme_corp")
    assert result is not None
    assert "products" in result

def test_tool_execution_unknown_tool():
    result = execute_typed_tool("non_existent_tool_xyz", {}, workspace_id="ws_acme_corp")
    assert "error" in str(result).lower() or "Unknown" in str(result)

def test_evaluations_endpoint(client, create_test_token):
    token = create_test_token(workspace_id="ws_eval_test", role="ADMIN")
    response = client.post(
        "/api/v1/evaluations/run",
        json={"agent_id": "ag_01"},
        headers={"Authorization": f"Bearer {token}"}
    )
    # Returns 404 for non-existent agent or 200 with eval metrics
    assert response.status_code in [200, 404]
