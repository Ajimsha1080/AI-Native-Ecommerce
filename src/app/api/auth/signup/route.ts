import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSessionToken, validatePasswordPolicy, AUTH_COOKIE_NAME } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { name, email, password, workspace_name } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: { message: 'Name, email, and password are required' } }, { status: 400 });
    }

    // Enforce Password Security Policy
    const policyResult = validatePasswordPolicy(password);
    if (!policyResult.valid) {
      return NextResponse.json({ error: { message: policyResult.error } }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return NextResponse.json({ error: { message: 'A user with this email address already exists.' } }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userId = generateId('usr');
    const newUser = {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      password_hash: passwordHash,
      is_super_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.users.push(newUser);

    const wsId = generateId('ws');
    const wsName = workspace_name ? workspace_name.trim() : `${name.trim()}'s Workspace`;
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
      workspace_id: wsId
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
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
