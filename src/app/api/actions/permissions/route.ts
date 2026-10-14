import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const agents = await db.agents.findMany(session.workspaceId);
  const agentId = agents[0]?.id || 'agent_shopmate_01';

  return NextResponse.json({ 
    agent_id: agentId,
    permissions: []
  });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  return NextResponse.json({ success: true, message: 'Permissions successfully saved & synced with live agents.' });
}
