import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSessionToken } from '@/lib/auth';
import { seedDatabaseIfEmpty } from '@/lib/db/seed';
import { generateId } from '@/lib/utils';

export async function POST(req: Request) {
  await seedDatabaseIfEmpty();
  try {
    const { name, email, password, workspace_name } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: { message: 'Name, email, and password are required' } }, { status: 400 });
    }

    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: { message: 'User with this email already exists' } }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userId = generateId('usr');
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      name,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.users.push(newUser);

    const wsId = generateId('ws');
    const wsName = workspace_name || (name + "'s Store");
    const newWorkspace = {
      id: wsId,
      name: wsName,
      slug: wsName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      plan: 'FREE' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.workspaces.push(newWorkspace);

    db.workspace_members.push({
      id: generateId('wsm'),
      workspace_id: wsId,
      user_id: userId,
      role: 'OWNER',
      created_at: new Date().toISOString()
    });

    db.saveImmediate();

    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      workspaceId: wsId
    });

    const response = NextResponse.json({
      success: true,
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      workspace_id: wsId,
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
    return NextResponse.json({ error: { message: err.message || 'Signup failed' } }, { status: 500 });
  }
}
