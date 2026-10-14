import { getAuthSession, createServiceJwt } from '@/lib/auth';

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

    // Python FastAPI Real-time SSE stream proxy (Fail closed)
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
        signal: AbortSignal.timeout(30000)
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

      const errText = await pythonRes.text();
      return new Response(JSON.stringify({ 
        error: { message: `AI Service stream error (${pythonRes.status}): ${errText}` } 
      }), {
        status: pythonRes.status,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': '5'
        }
      });
    } catch (pyErr: any) {
      return new Response(JSON.stringify({
        error: { message: 'AI Agent Streaming Service is temporarily unavailable. Please retry shortly.' }
      }), {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': '5'
        }
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message || 'Stream error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
