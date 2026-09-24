import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Message } from '@/types';

const statusEnum = z.enum(['OPEN', 'RESOLVED', 'ESCALATED', 'CLOSED', 'ACTIVE', 'ARCHIVED']);

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const conv = db.conversations.find(c => c.id === id && c.workspace_id === session.workspaceId);
  if (!conv) return NextResponse.json({ error: { message: 'Conversation not found' } }, { status: 404 });

  const messages = db.messages.filter(m => m.conversation_id === id);
  const traces = db.executions.filter(e => e.conversation_id === id);

  return NextResponse.json({ conversation: conv, messages, traces });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const conv = db.conversations.find(c => c.id === id && c.workspace_id === session.workspaceId);
    if (!conv) return NextResponse.json({ error: { message: 'Conversation not found' } }, { status: 404 });

    if (body.status !== undefined) {
      const parsedStatus = statusEnum.safeParse(body.status);
      if (!parsedStatus.success) {
        return NextResponse.json({
          error: { message: `Invalid status '${body.status}'. Allowed values: OPEN, RESOLVED, ESCALATED, CLOSED, ACTIVE, ARCHIVED.` }
        }, { status: 400 });
      }
      conv.status = parsedStatus.data as any;
    }
    if (body.escalation_reason !== undefined) {
      conv.escalation_reason = typeof body.escalation_reason === 'string' ? body.escalation_reason.slice(0, 500) : '';
    }
    conv.updated_at = new Date().toISOString();

    db.scheduleSave();
    return NextResponse.json({ success: true, conversation: conv });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to update conversation' } }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const conv = db.conversations.find(c => c.id === id && c.workspace_id === session.workspaceId);
    if (!conv) return NextResponse.json({ error: { message: 'Conversation not found' } }, { status: 404 });

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: { message: 'Message content is required' } }, { status: 400 });
    }

    const requestedRole = (body.role || '').toUpperCase();
    let role: Message['role'] = 'USER';

    if (requestedRole === 'HUMAN') {
      if (!requireRole(session, ['OWNER', 'ADMIN'])) {
        return NextResponse.json({ error: { message: 'Forbidden: Only Owner or Admin can send operator messages as HUMAN.' } }, { status: 403 });
      }
      role = 'HUMAN';
    } else if (requestedRole === 'ASSISTANT') {
      role = 'ASSISTANT';
    } else {
      role = 'USER';
    }

    const newMsg: Message = {
      id: generateId('msg'),
      conversation_id: id,
      workspace_id: session.workspaceId,
      role,
      content: body.content,
      metadata: role === 'HUMAN'
        ? { operator_id: session.user.id, operator_name: session.user.name || 'Staff Agent' }
        : undefined,
      created_at: new Date().toISOString()
    };

    db.messages.push(newMsg);
    conv.message_count = (conv.message_count || 0) + 1;
    conv.updated_at = new Date().toISOString();

    db.scheduleSave();
    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to create message' } }, { status: 500 });
  }
}

