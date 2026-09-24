import { NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth';
import { runAgentCycle } from '@/lib/agent-runtime';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  let apiKey = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim();
  }

  const authResult = await verifyApiKey(apiKey);
  if (!authResult) {
    return NextResponse.json({
      error: { code: 'UNAUTHORIZED', message: 'Valid Bearer API Key required.' }
    }, { status: 401 });
  }

  try {
    const { message, conversation_id, customer_identifier } = await req.json();
    if (!message) {
      return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Field "message" is required.' } }, { status: 400 });
    }

    const result = await runAgentCycle({
      agent_id: id,
      workspace_id: authResult.workspaceId,
      user_message: message,
      conversation_id,
      customer_identifier,
      channel: 'API'
    });

    return NextResponse.json({
      conversation_id: result.conversation_id,
      message_id: result.message_id,
      response: result.response_text,
      interactive_payload: result.interactive_payload,
      trace: {
        latency_ms: result.trace.latency_ms,
        tokens_used: result.trace.tokens_used,
        tools_called: result.trace.tool_executions.map(t => t.tool_name)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'RUNTIME_ERROR', message: err.message || 'Execution failed.' } }, { status: 500 });
  }
}
