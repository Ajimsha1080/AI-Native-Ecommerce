import { createServiceJwt } from '../auth';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

export interface EvaluationRunResult {
  success: boolean;
  agent_id: string;
  workspace_id: string;
  total_cases: number;
  passed_cases: number;
  pass_rate: number;
  avg_latency_ms: number;
  results: Array<{
    case_id: string;
    case_name: string;
    passed: boolean;
    score: number;
    latency_ms?: number;
    error?: string;
  }>;
}

/**
 * Authenticated proxy running agent evaluation test cases via Python FastAPI Backend Engine.
 * Python FastAPI is the single source of truth for evaluation executions.
 */
export async function runAgentEvaluations(workspaceId: string, agentId: string): Promise<EvaluationRunResult> {
  if (!workspaceId) {
    throw new Error('workspaceId is required for agent evaluation runs');
  }

  const serviceToken = await createServiceJwt(workspaceId, 'evaluations-proxy');
  const response = await fetch(`${PYTHON_BACKEND_URL}/api/v1/evaluations/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceToken}`
    },
    body: JSON.stringify({
      agent_id: agentId,
      workspace_id: workspaceId
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python Evaluation Engine error (${response.status}): ${errorText}`);
  }

  return await response.json();
}
