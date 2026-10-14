import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '../db';
import { User, WorkspaceRole } from '@/types';

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'aaas_session_token';

import { getEncryptionKey } from '../crypto/encryption';
import { validateSecretStrength, DISALLOWED_DEFAULT_SECRETS } from './secrets';
export { validateSecretStrength, DISALLOWED_DEFAULT_SECRETS } from './secrets';

// Session JWT Secret for End-User App Sessions
export function getSessionJwtSecret(): Uint8Array {
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV;
  const raw = process.env.SESSION_JWT_SECRET || process.env.JWT_SECRET;
  if (!raw) {
    if (appEnv === 'development') {
      // Strict default strictly for local development testing with 32+ bytes
      return new TextEncoder().encode('development_only_session_secret_32bytes_long!');
    }
    throw new Error(
      'Security Error: SESSION_JWT_SECRET is missing. Explicit APP_ENV=development is required to use local fallback secrets.'
    );
  }
  validateSecretStrength(raw, 'SESSION_JWT_SECRET');
  return new TextEncoder().encode(raw);
}

// Service-to-Service JWT Secret for Node <-> Python Backend Communication
export function getServiceJwtSecret(): Uint8Array {
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV;
  const raw = process.env.SERVICE_JWT_SECRET || process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_SECRET;
  if (!raw) {
    if (appEnv === 'development') {
      return new TextEncoder().encode('development_only_service_secret_32bytes_long!');
    }
    throw new Error(
      'Security Error: SERVICE_JWT_SECRET is missing. Explicit APP_ENV=development is required to use local fallback secrets.'
    );
  }
  validateSecretStrength(raw, 'SERVICE_JWT_SECRET');
  return new TextEncoder().encode(raw);
}

export function validateBootSecrets(): void {
  const sessionSec = getSessionJwtSecret();
  const serviceSec = getServiceJwtSecret();
  const encryptionKey = getEncryptionKey();

  // Distinct secrets invariant: SESSION_JWT_SECRET, SERVICE_JWT_SECRET, and ENCRYPTION_KEY must be distinct values
  const sessionStr = Buffer.from(sessionSec).toString('hex');
  const serviceStr = Buffer.from(serviceSec).toString('hex');
  const encryptionStr = Buffer.from(encryptionKey).toString('hex');

  if (sessionStr === serviceStr) {
    throw new Error('Security Error: SESSION_JWT_SECRET and SERVICE_JWT_SECRET must have distinct, independent values.');
  }
  if (sessionStr === encryptionStr || serviceStr === encryptionStr) {
    throw new Error('Security Error: ENCRYPTION_KEY must be distinct from JWT secrets.');
  }
}

// Distributed Login Rate Limiting & Lockout Store (backed by Redis)
export async function checkLoginRateLimit(identifier: string): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const { checkLoginLockout } = await import('../redis');
  const lockout = await checkLoginLockout(identifier);
  if (lockout.locked) {
    return { allowed: false, retryAfterSec: lockout.retryAfterSec };
  }
  return { allowed: true };
}

export async function recordFailedLoginAttempt(identifier: string): Promise<{ locked: boolean; lockedUntil?: number }> {
  const { recordFailedLogin } = await import('../redis');
  return await recordFailedLogin(identifier, 5, 900);
}

export async function resetLoginRateLimit(identifier: string): Promise<void> {
  const { resetLoginLockout } = await import('../redis');
  await resetLoginLockout(identifier);
}

export async function revokeUserSession(sessionId: string, ttlSec: number = 86400 * 7): Promise<void> {
  const { revokeSession } = await import('../redis');
  await revokeSession(sessionId, ttlSec);
}

export async function checkSessionRevoked(sessionId: string): Promise<boolean> {
  const { isSessionRevoked } = await import('../redis');
  return await isSessionRevoked(sessionId);
}

export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one numeric digit.' };
  }
  if (!/[A-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter or special character.' };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: {
  userId: string;
  email: string;
  workspaceId?: string;
  isSuperAdmin?: boolean;
  sessionId?: string;
}): Promise<string> {
  const secret = getSessionJwtSecret();
  const jti = payload.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return new SignJWT({ ...payload, sessionId: jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('aaas-auth')
    .setAudience('aaas-app')
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function createServiceJwt(
  workspaceId: string,
  userId: string = 'service_node',
  role: string = 'ADMIN'
): Promise<string> {
  const secret = getServiceJwtSecret();
  return new SignJWT({
    workspace_id: workspaceId,
    workspaceId: workspaceId,
    sub: userId,
    userId: userId,
    role: role,
    isSuperAdmin: role === 'SUPERADMIN'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('aaas-node')
    .setAudience('aaas-python')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{
  userId: string;
  email: string;
  workspaceId?: string;
  isSuperAdmin?: boolean;
  sessionId?: string;
} | null> {
  try {
    const secret = getSessionJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'aaas-auth',
      audience: 'aaas-app',
      clockTolerance: 60
    });
    const sessionId = (payload.jti as string) || (payload.sessionId as string);
    if (sessionId) {
      const revoked = await checkSessionRevoked(sessionId);
      if (revoked) return null;
    }
    return payload as any;
  } catch (e) {
    return null;
  }
}

export async function verifyServiceJwt(token: string): Promise<{
  workspace_id: string;
  userId: string;
  role: string;
  isSuperAdmin?: boolean;
} | null> {
  try {
    const secret = getServiceJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'aaas-node',
      audience: 'aaas-python',
      clockTolerance: 60
    });
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
  let token: string | null = null;
  if (req) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const regex = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`);
      const match = cookieHeader.match(regex);
      if (match) {
        token = match[1];
      }
    }
  }

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload && payload.userId) {
      const user = await db.users.findById(payload.userId);
      if (user) {
        if (payload.workspaceId) {
          // Explicit workspace membership check
          const member = await db.workspace_members.findMember(payload.workspaceId, user.id);
          if (member || user.is_super_admin) {
            const role: WorkspaceRole = user.is_super_admin ? 'OWNER' : (member?.role || 'VIEWER');
            return { user, workspaceId: payload.workspaceId, role };
          }
          // Non-member trying to access target workspace -> strictly return null (401/403)
          return null;
        }

        // If no workspace specified in token, find the user's primary membership
        const userMemberships = await db.workspace_members.findByUser(user.id);
        const userMembership = userMemberships[0];
        if (userMembership) {
          return {
            user,
            workspaceId: userMembership.workspace_id,
            role: user.is_super_admin ? 'OWNER' : userMembership.role
          };
        }

        if (user.is_super_admin) {
          const allWorkspaces = await db.workspaces.findMany();
          if (allWorkspaces.length > 0) {
            return {
              user,
              workspaceId: allWorkspaces[0].id,
              role: 'OWNER'
            };
          }
        }
      }
    }
  }

  return null;
}

export function requireRole(
  session: any,
  allowedRoles: WorkspaceRole[]
): boolean {
  if (!session) return false;
  if (session.user?.is_super_admin || session.role === 'OWNER') return true;
  if (session.role && allowedRoles.includes(session.role)) return true;
  return false;
}

export const ALLOWED_API_KEY_PERMISSIONS = [
  'read:catalog',
  'write:catalog',
  'read:orders',
  'write:orders',
  'execute:agent',
  'read:knowledge',
  'write:knowledge',
  'admin'
];

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateSecureApiKey(prefix: string = 'ak_live'): { rawKey: string; keyPrefix: string; hashedKey: string } {
  const randomHex = crypto.randomBytes(24).toString('hex');
  const rawKey = `${prefix}_${randomHex}`;
  const keyPrefix = rawKey.substring(0, 12);
  const hashedKey = hashApiKey(rawKey);
  return { rawKey, keyPrefix, hashedKey };
}

export async function verifyApiKey(key: string): Promise<{
  workspaceId: string;
  permissions: string[];
} | null> {
  if (!key) return null;

  const keyHash = hashApiKey(key);
  const stored = await db.api_keys.findByKeyHash(keyHash);
  if (stored) {
    return {
      workspaceId: stored.workspace_id,
      permissions: stored.permissions || ['read:catalog', 'write:catalog', 'read:orders', 'write:orders', 'execute:agent']
    };
  }
  return null;
}
