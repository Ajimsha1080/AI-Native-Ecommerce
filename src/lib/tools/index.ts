import { createServiceJwt } from '../auth';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

export interface ToolCallRequest {
  tool_id: string;
  parameters: Record<string, any>;
  workspace_id: string;
  agent_id: string;
  conversation_id: string;
}

export interface ToolCallResult {
  tool_id: string;
  status: 'SUCCESS' | 'FAILED' | 'CONFIRMATION_REQUIRED' | 'APPROVAL_REQUIRED' | 'PERMISSION_DENIED';
  message: string;
  data?: any;
  interactive_payload?: {
    type: 'PRODUCTS' | 'ORDER_TRACKING' | 'CONFIRMATION' | 'QUICK_REPLIES' | 'CART_SUMMARY';
    data: any;
  };
  latency_ms: number;
}

/**
 * Authenticated proxy executing tools via the Python FastAPI Backend Engine.
 * Python FastAPI is the single source of truth for tool definitions and execution.
 */
export async function executeTool(request: ToolCallRequest): Promise<ToolCallResult> {
  const startTime = Date.now();
  const { tool_id, parameters, workspace_id, agent_id, conversation_id } = request;

  if (!workspace_id) {
    throw new Error('workspace_id is required for tool execution');
  }

  const serviceToken = await createServiceJwt(workspace_id, 'tool-execution-proxy');
  const response = await fetch(`${PYTHON_BACKEND_URL}/api/v1/tools/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceToken}`
    },
    body: JSON.stringify({
      tool_id,
      parameters,
      workspace_id,
      agent_id,
      conversation_id
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      tool_id,
      status: 'FAILED',
      message: `Tool execution failed on backend (${response.status}): ${errorText}`,
      latency_ms: Date.now() - startTime
    };
  }

  const data = await response.json();
  return {
    tool_id: data.tool_id || tool_id,
    status: data.status || 'SUCCESS',
    message: data.message || 'Execution completed',
    data: data.data,
    interactive_payload: data.interactive_payload,
    latency_ms: data.latency_ms ?? (Date.now() - startTime)
  };
}
