import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local_ip';

    // 1. IP Rate Limiting
    const ipLimit = await checkRateLimit(`reset_pwd_ip:${clientIp}`, 10, 15 * 60);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: { message: `Too many password reset attempts. Please retry in ${ipLimit.retryAfterSec} seconds.` } },
        { status: 429 }
      );
    }

    const { token, password } = await req.json().catch(() => ({}));
    if (!token || !password) {
      return NextResponse.json({ error: { message: 'Token and new password are required' } }, { status: 400 });
    }

    // 2. Validate password policy
    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      return NextResponse.json({ error: { message: policy.error } }, { status: 400 });
    }

    // 3. Hash incoming raw token and look up user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = db.users.find(u => u.reset_password_token === hashedToken);

    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid or expired password reset token' } }, { status: 400 });
    }

    if (user.reset_password_expires_at) {
      const expires = new Date(user.reset_password_expires_at).getTime();
      if (Date.now() > expires) {
        return NextResponse.json({ error: { message: 'Password reset token has expired. Please request a new one.' } }, { status: 400 });
      }
    }

    // 4. Update password and invalidate reset token
    const newHash = await hashPassword(password);
    user.password_hash = newHash;
    user.reset_password_token = undefined;
    user.reset_password_expires_at = undefined;
    user.updated_at = new Date().toISOString();

    db.saveImmediate();

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated. You can now log in with your new password.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: 'Failed to reset password' } }, { status: 500 });
  }
}
