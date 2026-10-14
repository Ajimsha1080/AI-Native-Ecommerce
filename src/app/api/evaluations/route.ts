import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { runAgentEvaluations } from '@/lib/evaluations';
import { generateId } from '@/lib/utils';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const url = new URL(req.url);
  const agentId = url.searchParams.get('agent_id');
  const workspaceId = session.workspaceId;

  const [cases, runs] = await Promise.all([
    db.evaluationCases.findMany(workspaceId, agentId || undefined),
    db.evaluationRuns.findMany(workspaceId, agentId || undefined),
  ]);

  return NextResponse.json({ cases, runs });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const { action, agent_id, test_case } = body;
    const workspaceId = session.workspaceId;

    let targetAgentId = agent_id;
    if (!targetAgentId) {
      const agents = await db.agents.findMany(workspaceId);
      targetAgentId = agents[0]?.id || 'agent_shopmate_01';
    }

    if (action === 'RUN') {
      const run = await runAgentEvaluations(workspaceId, targetAgentId);
      return NextResponse.json({ success: true, run });
    }

    if (action === 'CREATE_CASE' && test_case) {
      const newCase = {
        id: generateId('evc'),
        agent_id: targetAgentId,
        workspace_id: workspaceId,
        name: test_case.name || 'Custom Test Case',
        user_input: test_case.user_input,
        expected_intent: test_case.expected_intent || 'PRODUCT_SEARCH',
        expected_tools: test_case.expected_tools || [],
        expected_keywords: test_case.expected_keywords || [],
        created_at: new Date().toISOString()
      };
      const created = await db.evaluationCases.create(workspaceId, newCase);
      return NextResponse.json({ success: true, case: created });
    }

    return NextResponse.json({ error: { message: 'Invalid action' } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Evaluation error' } }, { status: 500 });
  }
}
