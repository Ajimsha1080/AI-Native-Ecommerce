import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'HEALTHY',
    service: 'frontend-nextjs',
    timestamp: new Date().toISOString()
  });
}
