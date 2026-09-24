import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { runAgentCycle } from '@/lib/agent-runtime';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const message = body.message;
    const conversationId = body.conversationId || body.conversation_id;
    const channel = body.channel || 'PLAYGROUND';
    const workspaceId = session.workspaceId || 'ws_acme_corp';

    if (!message) {
      return NextResponse.json({ error: { message: 'Message cannot be empty' } }, { status: 400 });
    }

    // 1. Direct connection to Python FastAPI AI & RAG Engine (http://127.0.0.1:8000)
    try {
      const pythonRes = await fetch(`http://127.0.0.1:8000/api/v1/agents/${id}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any).token || 'demo_token'}`
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          workspace_id: workspaceId,
          channel: channel
        }),
        signal: AbortSignal.timeout(3500)
      });

      if (pythonRes.ok) {
        const pythonData = await pythonRes.json();
        return NextResponse.json({
          ...pythonData,
          conversationId: pythonData.conversation_id || conversationId,
          conversation_id: pythonData.conversation_id || conversationId,
          message_id: pythonData.message_id || 'msg_' + Math.random().toString(36).substring(2, 9),
          response: pythonData.response,
          interactive_payload: pythonData.interactive_payload,
          metadata: {
            products: pythonData.interactive_payload?.type === 'PRODUCTS' ? pythonData.interactive_payload.data : undefined,
            order: pythonData.interactive_payload?.type === 'ORDER' ? pythonData.interactive_payload.data : undefined,
          },
          trace: pythonData.trace
        });
      }
    } catch (pyErr) {
      // Graceful fallback to TypeScript Engine if Python service is unreachable or timing out
    }

    // 2. High-Performance TypeScript Runtime Execution
    const result = await runAgentCycle({
      agent_id: id,
      workspace_id: workspaceId,
      user_message: message,
      conversation_id: conversationId,
      channel: channel
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Chat error' } }, { status: 500 });
  }
}
