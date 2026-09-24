import { NextResponse } from 'next/server';
import { getAuthSession, requireRole, generateSecureApiKey, ALLOWED_API_KEY_PERMISSIONS } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { ApiKey } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const keys = db.api_keys
    .filter(k => k.workspace_id === session.workspaceId)
    .map(k => ({
      id: k.id,
      workspace_id: k.workspace_id,
      name: k.name,
      key_prefix: k.key_prefix,
      permissions: k.permissions,
      last_used_at: k.last_used_at,
      created_at: k.created_at
      // hashed_key intentionally redacted for security
    }));

  return NextResponse.json({ api_keys: keys, apiKeys: keys });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to generate API Keys' } }, { status: 403 });
  }

  try {
    const { name, permissions } = await req.json();
    const validatedPermissions = Array.isArray(permissions) && permissions.length > 0
      ? permissions.filter((p: string) => ALLOWED_API_KEY_PERMISSIONS.includes(p))
      : ['execute:agent', 'read:catalog'];

    const { rawKey, keyPrefix, hashedKey } = generateSecureApiKey('ak_live');

    const apiKey: ApiKey = {
      id: generateId('key'),
      workspace_id: session.workspaceId,
      name: name || 'Production REST API Key',
      key_prefix: keyPrefix,
      hashed_key: hashedKey,
      permissions: validatedPermissions,
      created_at: new Date().toISOString()
    };

    db.api_keys.push(apiKey);
    db.saveImmediate();

    return NextResponse.json({
      success: true,
      api_key: {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        permissions: apiKey.permissions,
        created_at: apiKey.created_at
      },
      secret_key: rawKey,
      secretKey: rawKey,
      warning: 'Please copy this secret key now. You will not be able to view it again.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'API Key generation failed' } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to revoke API Keys' } }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const idx = db.api_keys.findIndex(k => k.id === id && k.workspace_id === session.workspaceId);
  if (idx >= 0) {
    db.api_keys.splice(idx, 1);
    db.saveImmediate();
    return NextResponse.json({ success: true, message: 'API Key revoked successfully.' });
  }
  return NextResponse.json({ error: { message: 'API Key not found' } }, { status: 404 });
}
