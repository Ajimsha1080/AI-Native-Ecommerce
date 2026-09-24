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

  const cases = db.evaluation_cases.filter(c => c.workspace_id === session.workspaceId && (!agentId || c.agent_id === agentId));
  const runs = db.evaluation_runs.filter(r => r.workspace_id === session.workspaceId && (!agentId || r.agent_id === agentId));

  return NextResponse.json({ cases, runs });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { action, agent_id, test_case } = await req.json();

    if (action === 'RUN' && agent_id) {
      const run = await runAgentEvaluations(session.workspaceId, agent_id);
      return NextResponse.json({ success: true, run });
    }

    if (action === 'CREATE_CASE' && test_case) {
      const newCase = {
        id: generateId('evc'),
        agent_id: test_case.agent_id,
        workspace_id: session.workspaceId,
        name: test_case.name,
        user_input: test_case.user_input,
        expected_intent: test_case.expected_intent || 'PRODUCT_SEARCH',
        expected_tools: test_case.expected_tools || [],
        expected_keywords: test_case.expected_keywords || [],
        created_at: new Date().toISOString()
      };
      db.evaluation_cases.push(newCase);
      db.saveImmediate();
      return NextResponse.json({ success: true, case: newCase });
    }

    return NextResponse.json({ error: { message: 'Invalid action' } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Evaluation error' } }, { status: 500 });
  }
}
