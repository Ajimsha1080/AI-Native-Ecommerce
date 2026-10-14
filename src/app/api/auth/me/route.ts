import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const workspace = await db.workspaces.findById(session.workspaceId);
  const memberships = await db.workspace_members.findByUser(session.user.id);
  const allWorkspaces = (await Promise.all(memberships.map(async m => {
    const ws = await db.workspaces.findById(m.workspace_id);
    return ws ? { ...ws, role: m.role } : null;
  }))).filter(Boolean);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatar_url: session.user.avatar_url,
      is_super_admin: session.user.is_super_admin,
      workspaceName: workspace?.name || 'Ajimsha M'
    },
    workspace,
    role: session.role,
    workspaces: allWorkspaces.length > 0 ? allWorkspaces : [workspace]
  });
}
