import { getAuthSession } from '@/lib/auth';
import { runAgentCycle } from '@/lib/agent-runtime';

export const runtime = 'nodejs';

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
    const workspaceId = session.workspaceId || 'ws_acme_corp';

    if (!message) {
      return new Response(JSON.stringify({ error: { message: 'Message cannot be empty' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();

    // 1. Try Python FastAPI Real-time SSE stream
    try {
      const pythonRes = await fetch(`http://127.0.0.1:8000/api/v1/agents/${id}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          workspace_id: workspaceId,
          channel
        }),
        signal: AbortSignal.timeout(3000)
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
      // Fallback to TS streaming generator
    }

    // 2. High performance TypeScript streaming generator
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send stage event
          controller.enqueue(encoder.encode(`event: stage\ndata: ${JSON.stringify({ stage: 'REASONING_START' })}\n\n`));

          const result = await runAgentCycle({
            agent_id: id,
            workspace_id: workspaceId,
            user_message: message,
            conversation_id: conversationId,
            channel
          });

          // Stream words
          const responseText = result.response_text || '';
          const words = responseText.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
            controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ token: chunk })}\n\n`));
            await new Promise(r => setTimeout(r, 12));
          }

          // Send done event
          controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
            ...result,
            response: result.response_text
          })}\n\n`));
          controller.close();
        } catch (err: any) {
          controller.error(err);
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
