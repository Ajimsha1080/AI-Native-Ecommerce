import { NextResponse } from 'next/server';
import { getAuthSession, createServiceJwt } from '@/lib/auth';
import { executeRAGPipeline } from '@/lib/rag';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { question, top_k, min_score, agent_id } = await req.json();
    if (!question) {
      return NextResponse.json({ error: { message: 'Question parameter is required' } }, { status: 400 });
    }

    const workspaceId = session.workspaceId;
    const serviceToken = await createServiceJwt(workspaceId, session.user.id, session.role);

    // 1. Python FastAPI 12-Stage RAG Engine
    try {
      const pythonRes = await fetch(`${PYTHON_BACKEND_URL}/api/v1/rag/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceToken}`
        },
        body: JSON.stringify({
          question,
          workspace_id: workspaceId,
          top_k: top_k || 3,
          min_score: min_score || 0.20
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (pythonRes.ok) {
        const pythonData = await pythonRes.json();
        return NextResponse.json(pythonData);
      }
    } catch (pyErr) {
      // Embedded fallback when external Python daemon is offline
    }

    // 2. Embedded 12-Stage RAG Engine
    const result = await executeRAGPipeline(workspaceId, question, {
      topK: top_k || 3,
      minScore: min_score || 0.20,
      agentId: agent_id
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'RAG Query Failed' } }, { status: 500 });
  }
}
