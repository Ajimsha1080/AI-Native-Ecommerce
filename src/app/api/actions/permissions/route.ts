import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const agent = db.agents.find(a => a.workspace_id === session.workspaceId);
  const agentId = agent?.id || 'agent_shopmate_01';

  const permissions = db.tool_permissions.filter(p => p.agent_id === agentId);

  return NextResponse.json({ 
    agent_id: agentId,
    permissions: permissions.length > 0 ? permissions : db.tool_permissions
  });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { actions } = await req.json();
    const agents = db.agents.filter(a => a.workspace_id === session.workspaceId);
    
    if (Array.isArray(actions)) {
      for (const agent of agents) {
        for (const act of actions) {
          const existing = db.tool_permissions.find(
            p => p.agent_id === agent.id && p.tool_id === act.id
          );
          if (existing) {
            existing.is_enabled = act.enabled !== false;
            existing.permission_mode = act.requiresApproval ? 'REQUIRES_CONFIRMATION' : 'ALLOWED';
          } else {
            db.tool_permissions.push({
              id: `perm_${agent.id}_${act.id}`,
              agent_id: agent.id,
              tool_id: act.id,
              is_enabled: act.enabled !== false,
              permission_mode: act.requiresApproval ? 'REQUIRES_CONFIRMATION' : 'ALLOWED'
            });
          }
        }
      }
      db.scheduleSave();
    }

    return NextResponse.json({ success: true, message: 'Permissions successfully saved & synced with live agents.' });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to save permissions' } }, { status: 500 });
  }
}
