import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: { message: 'Verification token is required' } }, { status: 400 });
    }

    const redis = getRedisClient();
    const userId = await redis.get(`email_verify:${token}`);
    if (!userId) {
      return NextResponse.json({ error: { message: 'Invalid or expired verification token' } }, { status: 400 });
    }

    await db.users.update(userId, { email_verified: true } as any);
    await redis.del(`email_verify:${token}`);

    return NextResponse.json({
      success: true,
      message: 'Email successfully verified. You can now log in.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: 'Failed to verify email' } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: { message: 'Verification token is required' } }, { status: 400 });
    }

    const redis = getRedisClient();
    const userId = await redis.get(`email_verify:${token}`);
    if (!userId) {
      return NextResponse.json({ error: { message: 'Invalid or expired verification token' } }, { status: 400 });
    }

    await db.users.update(userId, { email_verified: true } as any);
    await redis.del(`email_verify:${token}`);

    return NextResponse.json({
      success: true,
      message: 'Email successfully verified. You can now log in.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: 'Failed to verify email' } }, { status: 500 });
  }
}
