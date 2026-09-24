import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

const PLAN_LIMITS: Record<string, { messages: number; chunks: number; agents: number }> = {
  'FREE': { messages: 500, chunks: 50, agents: 1 },
  'STARTER': { messages: 5000, chunks: 1000, agents: 3 },
  'GROWTH': { messages: 50000, chunks: 5000, agents: 15 },
  'BUSINESS': { messages: 150000, chunks: 20000, agents: 50 },
  'ENTERPRISE': { messages: 500000, chunks: 50000, agents: 100 }
};

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const workspace = db.workspaces.find(w => w.id === session.workspaceId);
  const plan = workspace?.plan || 'GROWTH';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS['GROWTH'];

  const messageCount = db.messages.filter(m => m.workspace_id === session.workspaceId).length;
  const chunkCount = db.knowledge_chunks.filter(c => c.workspace_id === session.workspaceId).length;
  const agentCount = db.agents.filter(a => a.workspace_id === session.workspaceId && a.status !== 'ARCHIVED').length;

  return NextResponse.json({
    plan,
    usage: {
      messages: {
        used: messageCount,
        limit: limits.messages,
        percentage: Math.min(100, Math.round((messageCount / limits.messages) * 100))
      },
      chunks: {
        used: chunkCount,
        limit: limits.chunks,
        percentage: Math.min(100, Math.round((chunkCount / limits.chunks) * 100))
      },
      agents: {
        used: agentCount,
        limit: limits.agents,
        percentage: Math.min(100, Math.round((agentCount / limits.agents) * 100))
      }
    }
  });
}
