import { createServiceJwt } from '../auth';
import { ExecutionTrace } from '@/types';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

export interface AgentRunParams {
  agent_id: string;
  workspace_id: string;
  conversation_id?: string;
  user_message: string;
  channel?: 'WEBSITE' | 'MOBILE' | 'API' | 'PLAYGROUND' | 'CUSTOM';
  customer_identifier?: string;
}

export interface AgentRunResponse {
  conversation_id: string;
  message_id: string;
  response_text: string;
  interactive_payload?: any;
  metadata?: any;
  trace: ExecutionTrace;
}

/**
 * Authenticated proxy executing the agent reasoning cycle via Python FastAPI Backend Engine.
 * Python FastAPI is the single source of truth for runtime, tools, and RAG.
 */
export async function runAgentCycle(params: AgentRunParams): Promise<AgentRunResponse> {
  const { agent_id, workspace_id, conversation_id, user_message, channel, customer_identifier } = params;

  if (!workspace_id) {
    throw new Error('workspace_id is required to invoke agent runtime');
  }

  const serviceToken = await createServiceJwt(workspace_id, 'agent-runtime-proxy');
  const response = await fetch(`${PYTHON_BACKEND_URL}/api/v1/agents/${agent_id}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceToken}`
    },
    body: JSON.stringify({
      message: user_message,
      conversation_id,
      workspace_id,
      channel: channel || 'PLAYGROUND',
      customer_identifier: customer_identifier || 'guest_user'
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python AI Agent Runtime error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    conversation_id: data.conversation_id,
    message_id: data.message_id,
    response_text: data.response,
    interactive_payload: data.interactive_payload,
    metadata: data.metadata,
    trace: data.trace
  };
}

/**
 * Proxies streaming agent responses from Python FastAPI SSE endpoint.
 */
export async function streamAgentCycle(params: AgentRunParams): Promise<Response> {
  const { agent_id, workspace_id, conversation_id, user_message, channel } = params;

  if (!workspace_id) {
    throw new Error('workspace_id is required for streaming agent runtime');
  }

  const serviceToken = await createServiceJwt(workspace_id, 'agent-runtime-stream-proxy');
  return await fetch(`${PYTHON_BACKEND_URL}/api/v1/agents/${agent_id}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceToken}`
    },
    body: JSON.stringify({
      message: user_message,
      conversation_id,
      workspace_id,
      channel: channel || 'PLAYGROUND'
    }),
    signal: AbortSignal.timeout(60000)
  });
}
