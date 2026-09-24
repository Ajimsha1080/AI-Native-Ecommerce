import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Message } from '@/types';

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

    if (body.status) {
      conv.status = body.status;
    }
    if (body.escalation_reason !== undefined) {
      conv.escalation_reason = body.escalation_reason;
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

    const newMsg: Message = {
      id: generateId('msg'),
      conversation_id: id,
      workspace_id: session.workspaceId,
      role: (body.role?.toUpperCase() === 'HUMAN' ? 'HUMAN' : body.role?.toUpperCase() === 'USER' ? 'USER' : 'ASSISTANT'),
      content: body.content,
      metadata: body.metadata || { humanHandoff: true, operator: 'Staff Agent' },
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
