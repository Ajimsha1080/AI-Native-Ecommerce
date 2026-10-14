import { NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Message } from '@/types';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const allConversations = await db.conversations.findMany(session.workspaceId);
  const conversations = allConversations.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { conversation_id, message, action } = await req.json();
    const conv = await db.conversations.findById(session.workspaceId, conversation_id);
    if (!conv) return NextResponse.json({ error: { message: 'Conversation not found' } }, { status: 404 });

    if (action === 'HUMAN_REPLY' && message) {
      if (!requireRole(session, ['OWNER', 'ADMIN'])) {
        return NextResponse.json({ error: { message: 'Forbidden: Only Owner or Admin can send operator messages as HUMAN.' } }, { status: 403 });
      }

      const humanMsg: Message = {
        id: generateId('msg'),
        conversation_id: conv.id,
        workspace_id: session.workspaceId,
        role: 'HUMAN',
        content: message,
        metadata: {
          operator_id: session.user.id,
          operator_name: session.user.name || 'Support Agent',
          channel: 'STAFF_CONSOLE'
        },
        created_at: new Date().toISOString()
      };
      await db.messages.create(session.workspaceId, humanMsg);
      await db.conversations.create(session.workspaceId, {
        ...conv,
        updated_at: new Date().toISOString()
      });
      return NextResponse.json({ success: true, message: humanMsg });
    }

    if (action === 'RESOLVE') {
      const updatedConv = await db.conversations.create(session.workspaceId, {
        ...conv,
        status: 'RESOLVED',
        updated_at: new Date().toISOString()
      });
      return NextResponse.json({ success: true, conversation: updatedConv });
    }

    return NextResponse.json({ error: { message: 'Invalid action' } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Operation failed' } }, { status: 500 });
  }
}

