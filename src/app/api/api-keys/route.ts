import { NextResponse } from 'next/server';
import { getAuthSession, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { ApiKey } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const keys = db.api_keys.filter(k => k.workspace_id === session.workspaceId);
  return NextResponse.json({ api_keys: keys, apiKeys: keys });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { name, permissions } = await req.json();
    const rawSecret = 'ak_live_' + generateId('sec') + '_' + Math.random().toString(36).substring(2, 12);
    const prefix = rawSecret.substring(0, 16);
    const hashed = await hashPassword(rawSecret);

    const apiKey: ApiKey = {
      id: generateId('key'),
      workspace_id: session.workspaceId,
      name: name || 'Production REST Key',
      key_prefix: prefix,
      hashed_key: hashed,
      permissions: permissions || ['agent.chat', 'commerce.read'],
      created_at: new Date().toISOString()
    };

    db.api_keys.push(apiKey);
    db.saveImmediate();

    return NextResponse.json({
      success: true,
      api_key: apiKey,
      secret_key: rawSecret,
      secretKey: rawSecret
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'API Key generation failed' } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const idx = db.api_keys.findIndex(k => k.id === id && k.workspace_id === session.workspaceId);
  if (idx >= 0) {
    db.api_keys.splice(idx, 1);
    db.saveImmediate();
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: { message: 'API key not found' } }, { status: 404 });
}
