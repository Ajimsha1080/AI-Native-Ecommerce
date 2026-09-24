import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/utils/rate-limiter';

export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const { allowed } = checkRateLimit(`deploy_resolve:${ip}`, { limit: 60, intervalMs: 60000 });
  if (!allowed) {
    return NextResponse.json({
      error: { code: 'RATE_LIMITED', message: 'Too many deployment resolution requests. Please try again in a minute.' }
    }, { status: 429 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key') || url.searchParams.get('id') || url.searchParams.get('public_key');

  if (!key) {
    return NextResponse.json({
      error: { code: 'BAD_REQUEST', message: 'Parameter "key" or "id" is required.' }
    }, { status: 400 });
  }

  const deployment = db.deployments.find(d => (d.public_key === key || d.id === key) && d.status === 'ACTIVE');
  if (!deployment) {
    return NextResponse.json({
      error: { code: 'DEPLOYMENT_NOT_FOUND', message: 'Deployment not found or inactive.' }
    }, { status: 404 });
  }

  // Check Origin / Referer against allowed domains if configured
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  if (origin && deployment.allowed_domains && !deployment.allowed_domains.includes('*')) {
    const originHost = origin.replace(/^https?:\/\//, '').split('/')[0];
    const matched = deployment.allowed_domains.some(domain => {
      if (domain.startsWith('*.')) {
        const root = domain.slice(2);
        return originHost.endsWith(root);
      }
      return originHost === domain || domain === '*';
    });
    if (!matched) {
      return NextResponse.json({
        error: { code: 'FORBIDDEN_ORIGIN', message: `Origin '${origin}' is not authorized for this deployment widget.` }
      }, { status: 403 });
    }
  }

  // Safe public payload (do not expose private fields or api keys)
  const agent = db.agents.find(a => a.id === deployment.agent_id);
  const config = db.agent_configs.find(c => c.agent_id === deployment.agent_id);

  return NextResponse.json({
    deployment: {
      id: deployment.id,
      public_key: deployment.public_key,
      agent_id: deployment.agent_id,
      channel: deployment.channel,
      environment: deployment.environment,
      status: deployment.status
    },
    agent: agent ? {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      language: agent.language,
      avatar_url: config?.identity?.avatar_url || ''
    } : null,
    appearance: config?.appearance || null,
    welcome_message: config?.identity?.greeting || 'Hello! I am your AI store concierge. How may I assist you today?'
  });
}
