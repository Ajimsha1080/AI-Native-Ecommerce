import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const ws = db.workspaces.find(w => w.id === session.workspaceId);
  if (!ws) {
    return NextResponse.json({ error: { message: 'Workspace not found' } }, { status: 404 });
  }

  return NextResponse.json({
    workspace: {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      plan: ws.plan,
      currency: (ws.settings as any)?.currency || 'USD',
      timezone: (ws.settings as any)?.timezone || 'America/New_York',
      created_at: ws.created_at,
      updated_at: ws.updated_at
    }
  });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { name, currency, timezone } = await req.json();
    const ws = db.workspaces.find(w => w.id === session.workspaceId);
    if (!ws) {
      return NextResponse.json({ error: { message: 'Workspace not found' } }, { status: 404 });
    }

    if (name) ws.name = name.trim();
    if (!ws.settings) ws.settings = {};
    (ws.settings as any).currency = currency || 'USD';
    (ws.settings as any).timezone = timezone || 'America/New_York';
    ws.updated_at = new Date().toISOString();

    db.saveImmediate();

    return NextResponse.json({
      success: true,
      workspace: {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        plan: ws.plan,
        currency: (ws.settings as any).currency,
        timezone: (ws.settings as any).timezone,
        updated_at: ws.updated_at
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to update settings' } }, { status: 500 });
  }
}
