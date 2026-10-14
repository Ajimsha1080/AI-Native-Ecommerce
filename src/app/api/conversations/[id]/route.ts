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

  const conv = await db.conversations.findById(session.workspaceId, id);
  if (!conv) return NextResponse.json({ error: { message: 'Conversation not found' } }, { status: 404 });

  const messages = await db.messages.findMany(session.workspaceId, id);
  const traces = await db.executions.findMany(session.workspaceId, id);

  return NextResponse.json({ conversation: conv, messages, traces });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const conv = await db.conversations.findById(session.workspaceId, id);
    if (!conv) return NextResponse.json({ error: { message: 'Conversation not found' } }, { status: 404 });

    let newStatus = conv.status;
    if (body.status !== undefined) {
      const parsedStatus = statusEnum.safeParse(body.status);
      if (!parsedStatus.success) {
        return NextResponse.json({
          error: { message: `Invalid status '${body.status}'. Allowed values: OPEN, RESOLVED, ESCALATED, CLOSED, ACTIVE, ARCHIVED.` }
        }, { status: 400 });
      }
      newStatus = parsedStatus.data as any;
    }
    const updatedConv = await db.conversations.create(session.workspaceId, {
      ...conv,
      status: newStatus,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, conversation: updatedConv });
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
    const conv = await db.conversations.findById(session.workspaceId, id);
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

    await db.messages.create(session.workspaceId, newMsg);
    await db.conversations.create(session.workspaceId, {
      ...conv,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to create message' } }, { status: 500 });
  }
}

