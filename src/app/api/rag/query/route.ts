import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { executeRAGPipeline } from '@/lib/rag';

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { question, top_k, min_score, agent_id } = await req.json();
    if (!question) {
      return NextResponse.json({ error: { message: 'Question parameter is required' } }, { status: 400 });
    }

    const workspaceId = session.workspaceId || 'ws_acme_corp';

    // 1. Try Python FastAPI 12-Stage RAG Engine (http://127.0.0.1:8000/api/v1/rag/query)
    try {
      const pythonRes = await fetch('http://127.0.0.1:8000/api/v1/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          workspace_id: workspaceId,
          top_k: top_k || 3,
          min_score: min_score || 0.20
        }),
        signal: AbortSignal.timeout(3000)
      });

      if (pythonRes.ok) {
        const pythonData = await pythonRes.json();
        return NextResponse.json(pythonData);
      }
    } catch (pyErr) {
      // Fallback to internal TypeScript RAG Engine
    }

    // 2. High-Performance TypeScript 12-Stage RAG Engine
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
