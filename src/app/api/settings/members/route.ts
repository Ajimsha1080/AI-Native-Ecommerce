import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { recordAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const rawMembers = await db.workspace_members.findMany(session.workspaceId);
  const members = (await Promise.all(
    rawMembers.map(async (m) => {
      const user = await db.users.findById(m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        name: user?.name || 'Workspace Member',
        email: user?.email || 'member@store.com',
        role: m.role,
        status: 'ACTIVE',
        is_super_admin: Boolean(user?.is_super_admin),
        created_at: m.created_at
      };
    })
  )).filter(m => !m.is_super_admin);

  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to invite members' } }, { status: 403 });
  }

  try {
    const { email, role } = await req.json();
    if (!email) return NextResponse.json({ error: { message: 'Email is required' } }, { status: 400 });

    const cleanEmail = email.toLowerCase().trim();
    const cleanRole = (role || 'EDITOR').toUpperCase();

    // Check if user already exists
    let user = await db.users.findByEmail(cleanEmail);
    if (!user) {
      user = await db.users.create({
        id: generateId('usr'),
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: 'VIEWER',
        password_hash: 'INVITED_PENDING_ACTIVATION',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    const existingMember = await db.workspace_members.findMember(session.workspaceId, user.id);
    if (existingMember) {
      return NextResponse.json({ error: { message: 'User is already a member of this workspace' } }, { status: 400 });
    }

    const newMember = await db.workspace_members.create(session.workspaceId, {
      id: generateId('wsm'),
      workspace_id: session.workspaceId,
      user_id: user.id,
      role: (cleanRole === 'ADMIN' ? 'ADMIN' : cleanRole === 'OWNER' ? 'OWNER' : cleanRole === 'VIEWER' ? 'VIEWER' : 'EDITOR') as any,
      created_at: new Date().toISOString()
    });

    recordAuditEvent({
      workspace_id: session.workspaceId,
      action: 'MEMBER_INVITED',
      resource_type: 'WORKSPACE_MEMBER',
      resource_id: newMember.id,
      actor_user_id: session.user.id,
      actor_email: session.user.email,
      metadata: { invited_email: cleanEmail, role: newMember.role }
    });

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: newMember.role,
        status: 'INVITED',
        created_at: newMember.created_at
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Invitation failed' } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to remove members' } }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: { message: 'Member ID required' } }, { status: 400 });

  const members = await db.workspace_members.findMany(session.workspaceId);
  const member = members.find(m => m.id === id);
  if (!member) return NextResponse.json({ error: { message: 'Member not found' } }, { status: 404 });

  if (member.role === 'OWNER') {
    const ownerCount = members.filter(m => m.role === 'OWNER').length;
    if (ownerCount <= 1) {
      return NextResponse.json({ error: { message: 'Cannot remove the last Owner of the workspace.' } }, { status: 400 });
    }
  }

  await db.workspace_members.delete(session.workspaceId, id);
  recordAuditEvent({
    workspace_id: session.workspaceId,
    action: 'MEMBER_REMOVED',
    resource_type: 'WORKSPACE_MEMBER',
    resource_id: id,
    actor_user_id: session.user.id,
    actor_email: session.user.email
  });

  return NextResponse.json({ success: true });
}
