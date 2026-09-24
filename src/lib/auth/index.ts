import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '../db';
import { seedDatabaseIfEmpty } from '../db/seed';
import { User, WorkspaceRole } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super_secret_jwt_key_enterprise_grade_aaas_platform_2026'
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: {
  userId: string;
  email: string;
  workspaceId?: string;
  isSuperAdmin?: boolean;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function createServiceJwt(workspaceId: string, userId: string = 'service_node', role: string = 'ADMIN'): Promise<string> {
  return new SignJWT({
    workspace_id: workspaceId,
    workspaceId: workspaceId,
    sub: userId,
    userId: userId,
    role: role,
    isSuperAdmin: role === 'SUPERADMIN' || role === 'OWNER'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<{
  userId: string;
  email: string;
  workspaceId?: string;
  isSuperAdmin?: boolean;
} | null> {

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as any;
  } catch (e) {
    return null;
  }
}

export async function getAuthSession(req?: Request): Promise<{
  user: User;
  workspaceId: string;
  role: WorkspaceRole;
} | null> {
  await seedDatabaseIfEmpty();

  let token: string | null = null;
  if (req) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/aaas_session_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload && payload.userId) {
      const user = db.users.find(u => u.id === payload.userId);
      if (user) {
        const workspaceId = payload.workspaceId || db.workspaces[0]?.id || 'ws_acme_corp';
        const member = db.workspace_members.find(
          m => m.workspace_id === workspaceId && m.user_id === user.id
        );
        const role: WorkspaceRole = user.is_super_admin ? 'OWNER' : (member?.role || 'VIEWER');
        return { user, workspaceId, role };
      }
    }
  }

  // Fallback demo user
  const defaultUser = db.users[0];
  const defaultWorkspace = db.workspaces[0];
  if (defaultUser && defaultWorkspace) {
    return {
      user: defaultUser,
      workspaceId: defaultWorkspace.id,
      role: 'OWNER'
    };
  }
  return null;
}

export async function verifyApiKey(key: string): Promise<{
  workspaceId: string;
  permissions: string[];
} | null> {
  await seedDatabaseIfEmpty();
  if (!key) return null;

  for (const stored of db.api_keys) {
    if (key.startsWith(stored.key_prefix)) {
      return {
        workspaceId: stored.workspace_id,
        permissions: stored.permissions
      };
    }
  }
  return null;
}
