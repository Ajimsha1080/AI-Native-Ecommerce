import { NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth';
import { runAgentCycle } from '@/lib/agent-runtime';
import { db } from '@/lib/db';

async function resolveProductCards(responseText: string, userMessage: string, workspaceId: string, currentPayload?: any) {
  if (currentPayload?.type === 'PRODUCTS' && Array.isArray(currentPayload.data)) {
    return currentPayload;
  }

  const respLower = (responseText || '').toLowerCase();
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
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const origin = req.headers.get('Origin') || req.headers.get('origin') || req.headers.get('referer') || '';

  let workspaceId: string | null = null;
  let isPublicDeployment = false;

  // 1. Check for Bearer API Key or Public Deployment Token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();

    if (token.startsWith('pk_live_') || token.startsWith('dep_')) {
      // Public Deployment Key
      let dep = await db.deployments.findByPublicKey(token);
      if (!dep) {
        dep = await db.deployments.findById(token);
      }
      if (dep && dep.status === 'ACTIVE') {
        // Enforce allowed domains server-side
        if (dep.allowed_domains && !dep.allowed_domains.includes('*')) {
          const originHost = origin.replace(/^https?:\/\//, '').split('/')[0];
          const matched = dep.allowed_domains.some((domain: string) => {
            if (domain.startsWith('*.')) {
              const root = domain.slice(2);
              return originHost.endsWith(root);
            }
            return originHost === domain || domain === '*';
          });
          if (!matched && origin) {
            return NextResponse.json({
              error: { code: 'FORBIDDEN_ORIGIN', message: `Origin '${origin}' is not authorized for this deployment widget.` }
            }, { status: 403 });
          }
        }
        workspaceId = dep.workspace_id;
        isPublicDeployment = true;
      }
    } else {
      // Secret API Key
      const authResult = await verifyApiKey(token);
      if (authResult) {
        workspaceId = authResult.workspaceId;
      }
    }
  }

  if (!workspaceId) {
    return NextResponse.json({
      error: { code: 'UNAUTHORIZED', message: 'Valid Bearer API Key or Deployment Key required.' }
    }, { status: 401 });
  }

  try {
    const { message, conversation_id, customer_identifier } = await req.json();
    if (!message) {
      return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Field "message" is required.' } }, { status: 400 });
    }

    const result = await runAgentCycle({
      agent_id: id,
      workspace_id: workspaceId,
      user_message: message,
      conversation_id,
      customer_identifier: customer_identifier || (isPublicDeployment ? 'anonymous_shopper' : 'api_client'),
      channel: isPublicDeployment ? 'WEBSITE' : 'API'
    });

    const finalPayload = await resolveProductCards(result.response_text || '', message, workspaceId, result.interactive_payload);
    const pagination = finalPayload?.pagination || result.interactive_payload?.pagination || result.metadata?.pagination;

    return NextResponse.json({
      conversation_id: result.conversation_id,
      message_id: result.message_id,
      response: result.response_text,
      interactive_payload: finalPayload,
      metadata: {
        products: finalPayload?.type === 'PRODUCTS' ? finalPayload.data : undefined,
        order: finalPayload?.type === 'ORDER_TRACKING' ? finalPayload.data : undefined,
        pagination: pagination || undefined,
      },
      trace: {
        latency_ms: result.trace.latency_ms,
        tokens_used: result.trace.tokens_used,
        tools_called: (result.trace?.tool_executions || []).map(t => t.tool_name)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ 
      error: { code: 'SERVICE_UNAVAILABLE', message: 'AI Agent Service is temporarily unavailable. Please retry shortly.' } 
    }, { 
      status: 503,
      headers: { 'Retry-After': '5' }
    });
  }
}
