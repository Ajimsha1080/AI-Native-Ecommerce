import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local_ip';

    // 1. IP Rate Limiting (5 requests per 15 minutes)
    const ipLimit = await checkRateLimit(`forgot_pwd_ip:${clientIp}`, 5, 15 * 60);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: { message: `Too many password reset requests. Please retry in ${ipLimit.retryAfterSec} seconds.` } },
        { status: 429 }
      );
    }

    const { email } = await req.json().catch(() => ({}));
    if (!email) {
      return NextResponse.json({ error: { message: 'Email is required' } }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 2. Email-based rate limit
    const emailLimit = await checkRateLimit(`forgot_pwd_email:${cleanEmail}`, 3, 15 * 60);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: { message: `Too many password reset attempts for this email. Please retry in ${emailLimit.retryAfterSec} seconds.` } },
        { status: 429 }
      );
    }

    // 3. User lookup - ALWAYS return the same generic message to prevent email enumeration
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      user.reset_password_token = hashedToken;
      user.reset_password_expires_at = expires;
      user.updated_at = new Date().toISOString();
      db.saveImmediate();

      // Send email asynchronously with the raw token
      sendPasswordResetEmail(cleanEmail, rawToken).catch(err => {
        console.error('Failed to send password reset email:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: 'Failed to process password reset request' } }, { status: 500 });
  }
}
