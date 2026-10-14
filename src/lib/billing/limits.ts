import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { UsageEvent } from '@/types';

export interface PlanLimitConfig {
  messages: number;
  chunks: number;
  agents: number;
}

export const PLAN_LIMITS: Record<string, PlanLimitConfig> = {
  'FREE': { messages: 500, chunks: 50, agents: 1 },
  'STARTER': { messages: 5000, chunks: 1000, agents: 3 },
  'GROWTH': { messages: 50000, chunks: 5000, agents: 15 },
  'BUSINESS': { messages: 150000, chunks: 20000, agents: 50 },
  'ENTERPRISE': { messages: 500000, chunks: 50000, agents: 100 }
};

export async function getWorkspaceLimits(workspaceId: string): Promise<{ plan: string; limits: PlanLimitConfig }> {
  const ws = await db.workspaces.findById(workspaceId);
  const plan = (ws?.tier || ws?.plan || 'GROWTH').toUpperCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS['GROWTH'];
  return { plan, limits };
}

export async function getWorkspaceUsage(workspaceId: string) {
  const { plan, limits } = await getWorkspaceLimits(workspaceId);

  const rawMessagesCount = await db.messages.count(workspaceId);
  const rawChunksCount = await db.knowledgeChunks.count(workspaceId);
  const rawAgents = await db.agents.findMany(workspaceId);
  const agentCount = rawAgents.filter(a => a.status !== 'ARCHIVED').length;

  return {
    plan,
    usage: {
      messages: {
        used: rawMessagesCount,
        limit: limits.messages,
        percentage: Math.min(100, Math.round((rawMessagesCount / limits.messages) * 100))
      },
      chunks: {
        used: rawChunksCount,
        limit: limits.chunks,
        percentage: Math.min(100, Math.round((rawChunksCount / limits.chunks) * 100))
      },
      agents: {
        used: agentCount,
        limit: limits.agents,
        percentage: Math.min(100, Math.round((agentCount / limits.agents) * 100))
      }
    }
  };
}

export async function recordUsage(workspaceId: string, eventType: UsageEvent['event_type'], quantity: number = 1, metadata?: Record<string, any>) {
  await db.usageEvents.create(workspaceId, {
    id: generateId('use'),
    workspace_id: workspaceId,
    event_type: eventType,
    quantity,
    metadata,
    created_at: new Date().toISOString()
  });
}

export async function enforceQuota(
  workspaceId: string, 
  resourceType: 'messages' | 'chunks' | 'agents', 
  additionalCount: number = 1
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const { plan, limits } = await getWorkspaceLimits(workspaceId);
  const usage = await getWorkspaceUsage(workspaceId);
  const current = usage.usage[resourceType].used;
  const limit = limits[resourceType];

  if (current + additionalCount > limit) {
    return {
      allowed: false,
      response: NextResponse.json({
        error: {
          code: 'PAYMENT_REQUIRED',
          message: `Workspace quota exceeded for ${resourceType}. Current usage: ${current}/${limit}. Please upgrade your plan.`,
          resource: resourceType,
          current,
          limit,
          plan,
          upgrade_url: '/billing'
        }
      }, { status: 402 })
    };
  }

  return { allowed: true };
}
