import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: { message: 'Verification token is required' } }, { status: 400 });
    }

    const user = db.users.find(u => u.verification_token === token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid or expired verification token' } }, { status: 400 });
    }

    if (user.verification_token_expires_at) {
      const expires = new Date(user.verification_token_expires_at).getTime();
      if (Date.now() > expires) {
        return NextResponse.json({ error: { message: 'Verification token has expired. Please request a new one.' } }, { status: 400 });
      }
    }

    user.email_verified = true;
    user.verification_token = undefined;
    user.verification_token_expires_at = undefined;
    user.updated_at = new Date().toISOString();

    db.saveImmediate();

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

    const user = db.users.find(u => u.verification_token === token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid or expired verification token' } }, { status: 400 });
    }

    if (user.verification_token_expires_at) {
      const expires = new Date(user.verification_token_expires_at).getTime();
      if (Date.now() > expires) {
        return NextResponse.json({ error: { message: 'Verification token has expired. Please request a new one.' } }, { status: 400 });
      }
    }

    user.email_verified = true;
    user.verification_token = undefined;
    user.verification_token_expires_at = undefined;
    user.updated_at = new Date().toISOString();

    db.saveImmediate();

    return NextResponse.json({
      success: true,
      message: 'Email successfully verified. You can now log in.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: 'Failed to verify email' } }, { status: 500 });
  }
}
