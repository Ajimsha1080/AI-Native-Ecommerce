import { NextResponse } from 'next/server';
import { getAuthSession, createServiceJwt } from '@/lib/auth';
import { db } from '@/lib/db';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

async function resolveProductCards(responseText: string, userMessage: string, workspaceId: string, currentPayload?: any) {
  const userLower = (userMessage || '').toLowerCase();
  const respLower = (responseText || '').toLowerCase();

  // If action is adding/removing from cart or confirming cart action, do not attach product cards
  if (/\b(?:add .+ to (?:my )?cart|add to cart|added .+ to your (?:cart|bag)|added to cart|remove from cart)\b/i.test(userLower) ||
      /\b(?:added .+ to your (?:cart|bag)|has been added to your cart)\b/i.test(respLower)) {
    return null;
  }

  if (currentPayload?.type === 'PRODUCTS' && Array.isArray(currentPayload.data)) {
    return currentPayload;
  }

  const catalog = await db.commerceProducts.findMany(workspaceId);
  const matched: any[] = [];

  // Direct title matching with catalog products mentioned in response
  catalog.forEach(p => {
    const pTitle = p.title.toLowerCase();
    if (respLower.includes(pTitle)) {
      if (!matched.some(m => m.id === p.id)) matched.push(p);
    }
  });

  if (matched.length > 0) {
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const uniqueMatched: any[] = [];
    for (const p of matched) {
      const pTitle = p.title?.trim().toLowerCase();
      if (!seenIds.has(p.id) && !seenTitles.has(pTitle)) {
        seenIds.add(p.id);
        seenTitles.add(pTitle);
        uniqueMatched.push(p);
      }
    }
    return {
      type: 'PRODUCTS',
      data: uniqueMatched.slice(0, 6)
    };
  }

  return currentPayload || null;
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getAuthSession(req);
  let workspaceId = session?.workspaceId;
  if (!workspaceId) {
    const allWorkspaces = await db.workspaces.findMany();
    for (const ws of allWorkspaces) {
      const a = await db.agents.findById(ws.id, id);
      if (a) {
        workspaceId = ws.id;
        break;
      }
    }
    workspaceId = workspaceId || 'ws_acme_corp';
  }
  const userId = session?.user?.id || 'usr_guest_shopper';
  const userRole = session?.role || 'VIEWER';

  try {
    const body = await req.json();
    const message = body.message;
    const conversationId = body.conversationId || body.conversation_id;
    const channel = body.channel || 'PLAYGROUND';

    if (!message) {
      return NextResponse.json({ error: { message: 'Message cannot be empty' } }, { status: 400 });
    }

    const serviceToken = await createServiceJwt(workspaceId, userId, userRole);

    // Fail closed: Forward strictly to Python FastAPI AI & RAG Engine of Record
    try {
      const pythonRes = await fetch(`${PYTHON_BACKEND_URL}/api/v1/agents/${id}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceToken}`
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          workspace_id: workspaceId,
          channel: channel
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (pythonRes.ok) {
        const pythonData = await pythonRes.json();
        const finalPayload = await resolveProductCards(pythonData.response || '', message, workspaceId, pythonData.interactive_payload);
        const pagination = finalPayload?.pagination || pythonData.interactive_payload?.pagination || pythonData.metadata?.pagination;
        return NextResponse.json({
          ...pythonData,
          conversationId: pythonData.conversation_id || conversationId,
          conversation_id: pythonData.conversation_id || conversationId,
          message_id: pythonData.message_id || 'msg_' + Math.random().toString(36).substring(2, 9),
          response: pythonData.response,
          interactive_payload: finalPayload,
          metadata: {
            products: finalPayload?.type === 'PRODUCTS' ? finalPayload.data : undefined,
            order: finalPayload?.type === 'ORDER_TRACKING' || finalPayload?.type === 'ORDER' ? finalPayload.data : undefined,
            pagination: pagination || undefined,
          },
          trace: pythonData.trace
        });
      }

      const errText = await pythonRes.text();
      return NextResponse.json({ 
        error: { message: `AI Service error (${pythonRes.status}): ${errText}` } 
      }, { 
        status: pythonRes.status,
        headers: { 'Retry-After': '5' }
      });
    } catch (pyErr: any) {
      return NextResponse.json({
        error: { message: 'AI Agent Service is temporarily unavailable. Please retry shortly.' }
      }, {
        status: 503,
        headers: { 'Retry-After': '5' }
      });
    }

  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Execution error' } }, { status: 500 });
  }
}
