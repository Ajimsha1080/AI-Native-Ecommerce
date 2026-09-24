import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getWorkspaceUsage, PLAN_LIMITS } from '@/lib/billing/limits';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  const workspace = db.workspaces.find(w => w.id === session.workspaceId);
  const usageData = getWorkspaceUsage(session.workspaceId);

  return NextResponse.json({
    plan: usageData.plan,
    subscription_status: workspace?.subscription_status || 'active',
    has_stripe_customer: Boolean(workspace?.stripe_customer_id),
    usage: usageData.usage,
    available_plans: Object.keys(PLAN_LIMITS)
  });
}
