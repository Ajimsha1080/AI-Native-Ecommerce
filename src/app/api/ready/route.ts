import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};
  let allReady = true;

  // 1. Check local DB state
  try {
    const wsCount = db.workspaces.length;
    checks['database'] = wsCount >= 0 ? 'READY' : 'DEGRADED';
  } catch (err: any) {
    checks['database'] = `ERROR: ${err.message}`;
    allReady = false;
  }

  // 2. Check Python backend connectivity if configured
  const pythonUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${pythonUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    checks['python_backend'] = resp.ok ? 'READY' : `HTTP_${resp.status}`;
    if (!resp.ok) allReady = false;
  } catch (err: any) {
    checks['python_backend'] = 'UNREACHABLE';
    // If running in development without python container, degrade gracefully
  }

  const statusCode = allReady ? 200 : 503;
  return NextResponse.json({
    status: allReady ? 'READY' : 'DEGRADED',
    checks,
    timestamp: new Date().toISOString()
  }, { status: statusCode });
}
