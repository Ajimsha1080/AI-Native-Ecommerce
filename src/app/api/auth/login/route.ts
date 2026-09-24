import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSessionToken } from '@/lib/auth';
import { seedDatabaseIfEmpty } from '@/lib/db/seed';

export async function POST(req: Request) {
  await seedDatabaseIfEmpty();
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: { message: 'Email and password are required' } }, { status: 400 });
    }

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid email or password' } }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: { message: 'Invalid email or password' } }, { status: 401 });
    }

    const membership = db.workspace_members.find(m => m.user_id === user.id);
    const workspaceId = membership ? membership.workspace_id : db.workspaces[0]?.id;

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      workspaceId,
      isSuperAdmin: user.is_super_admin
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, is_super_admin: user.is_super_admin },
      workspace_id: workspaceId,
      token
    });

    response.cookies.set('aaas_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600,
      path: '/'
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Login failed' } }, { status: 500 });
  }
}
