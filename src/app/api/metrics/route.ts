import { NextResponse } from 'next/server';
import { metricsRegistry } from '@/lib/observability/metrics';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  // Update gauges before scraping
  metricsRegistry.set('active_workspaces_count', db.workspaces.length);

  const formatted = metricsRegistry.toPrometheusFormat();

  return new Response(formatted, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
    }
  });
}
