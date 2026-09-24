import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAuditEvent } from '@/lib/audit';

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
      settings: ws.settings || {
        retention_days: 90,
        security: {
          rate_limit_rpm: 120,
          allowed_origins: ['*'],
          require_mfa: false
        }
      },
      created_at: ws.created_at,
      updated_at: ws.updated_at
    }
  });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  if (!requireRole(session, ['OWNER', 'ADMIN'])) {
    return NextResponse.json({ error: { message: 'Forbidden: Admin or Owner role required to update settings' } }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, currency, timezone, security, retention_days } = body;
    const ws = db.workspaces.find(w => w.id === session.workspaceId);
    if (!ws) {
      return NextResponse.json({ error: { message: 'Workspace not found' } }, { status: 404 });
    }

    if (name) ws.name = name.trim();
    if (!ws.settings) ws.settings = {};
    if (currency) (ws.settings as any).currency = currency;
    if (timezone) (ws.settings as any).timezone = timezone;
    if (retention_days !== undefined) ws.settings.retention_days = Number(retention_days);
    if (security) {
      ws.settings.security = {
        ...ws.settings.security,
        ...security
      };
    }
    ws.updated_at = new Date().toISOString();

    recordAuditEvent({
      workspace_id: session.workspaceId,
      action: 'SETTINGS_UPDATED',
      resource_type: 'WORKSPACE',
      resource_id: ws.id,
      actor_user_id: session.user.id,
      actor_email: session.user.email
    });

    db.saveImmediate();

    return NextResponse.json({
      success: true,
      workspace: {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        plan: ws.plan,
        settings: ws.settings,
        updated_at: ws.updated_at
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to update settings' } }, { status: 500 });
  }
}

