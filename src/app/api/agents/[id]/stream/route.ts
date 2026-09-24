import { getAuthSession, createServiceJwt } from '@/lib/auth';
import { runAgentCycle } from '@/lib/agent-runtime';

export const runtime = 'nodejs';
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) {
    return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const message = body.message;
    const conversationId = body.conversationId || body.conversation_id;
    const channel = body.channel || 'PLAYGROUND';
    const workspaceId = session.workspaceId;

    if (!message) {
      return new Response(JSON.stringify({ error: { message: 'Message cannot be empty' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const serviceToken = await createServiceJwt(workspaceId, session.user.id, session.role);

    // 1. Python FastAPI Real-time SSE stream proxy
    try {
      const pythonRes = await fetch(`${PYTHON_BACKEND_URL}/api/v1/agents/${id}/chat/stream`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceToken}`
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          workspace_id: workspaceId,
          channel
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (pythonRes.ok && pythonRes.body) {
        return new Response(pythonRes.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive'
          }
        });
      }
    } catch {
      // Local fallback generator if external daemon is unavailable
    }

    // 2. High performance streaming generator
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Emit intent understanding stage
          controller.enqueue(
            encoder.encode(
              `event: stage\ndata: ${JSON.stringify({
                stage: 'INTENT_UNDERSTANDING',
                intent: 'PRODUCT_SEARCH'
              })}\n\n`
            )
          );

          await new Promise((r) => setTimeout(r, 20));

          // Run full cycle
          const result = await runAgentCycle({
            agent_id: id,
            user_message: message,
            workspace_id: workspaceId,
            conversation_id: conversationId,
            channel
          });

          // Emit RAG stage if citations found
          if (result.trace?.retrieved_citations?.length > 0) {
            controller.enqueue(
              encoder.encode(
                `event: stage\ndata: ${JSON.stringify({
                  stage: 'RAG_RETRIEVAL',
                  citations: result.trace.retrieved_citations.length
                })}\n\n`
              )
            );
            await new Promise((r) => setTimeout(r, 20));
          }

          // Stream tokens
          const words = (result.response_text || '').split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
            controller.enqueue(
              encoder.encode(`event: token\ndata: ${JSON.stringify({ token: chunk })}\n\n`)
            );
            await new Promise((r) => setTimeout(r, 15));
          }

          // Done event with full response payload
          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({
                ...result,
                response: result.response_text,
                conversationId: result.conversation_id,
                metadata: {
                  products: result.interactive_payload?.type === 'PRODUCTS' ? result.interactive_payload.data : undefined,
                  order: result.interactive_payload?.type === 'ORDER_TRACKING' ? result.interactive_payload.data : undefined
                }
              })}\n\n`
            )
          );


          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message || 'Stream error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
