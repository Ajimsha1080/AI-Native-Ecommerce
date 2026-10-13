import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateMfaSecret, generateOtpauthUri, verifyTotpCode } from '@/lib/auth/mfa';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const secret = generateMfaSecret();
  const uri = generateOtpauthUri(session.user.email, secret);

  return NextResponse.json({
    secret,
    otpauth_url: uri,
    mfa_enabled: !!session.user.mfa_enabled
  });
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { secret, code, action } = await req.json();

  if (action === 'disable') {
    const user = db.users.find(u => u.id === session.user.id);
    if (user) {
      user.mfa_enabled = false;
      user.mfa_secret = undefined;
    }
    return NextResponse.json({ success: true, mfa_enabled: false });
  }

  if (!secret || !code) {
    return NextResponse.json({ error: { message: 'Secret and verification code are required' } }, { status: 400 });
  }

  const isValid = verifyTotpCode(secret, code);
  if (!isValid) {
    return NextResponse.json({ error: { message: 'Invalid verification code. Please check your authenticator app.' } }, { status: 400 });
  }

  const user = db.users.find(u => u.id === session.user.id);
  if (user) {
    user.mfa_secret = secret;
    user.mfa_enabled = true;
  }

  return NextResponse.json({
    success: true,
    mfa_enabled: true,
    message: 'Multi-factor authentication successfully enabled.'
  });
}
