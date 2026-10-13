export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailDeliveryStatus = 'PENDING' | 'RETRYING' | 'SENT' | 'FAILED';

export interface QueuedEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  status: EmailDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EmailDispatchResult {
  success: boolean;
  id?: string;
  status: EmailDeliveryStatus;
  error?: string;
}

// In-memory audit queue for dispatched emails and delivery status tracking
const emailDeliveryQueue = new Map<string, QueuedEmail>();

/**
 * Validate that RESEND_API_KEY is present in production environments.
 * Fails boot if unset.
 */
export function validateEmailBootConfig(): void {
  const isProd = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
  if (isProd && (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('PLACEHOLDER'))) {
    throw new Error('FATAL: RESEND_API_KEY is required in production environment');
  }
}

/**
 * Dispatches a transactional email via Resend API with an automated retry queue.
 * Never fabricates success without verified dispatch through the provider.
 */
export async function sendTransactionalEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'ShopMate AI <support@aaas-platform.com>';

  const isProd = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
  if (!resendApiKey || resendApiKey.includes('PLACEHOLDER')) {
    if (isProd) {
      throw new Error('Cannot send transactional email: RESEND_API_KEY is missing in production');
    }
    return {
      success: false,
      status: 'FAILED',
      error: 'RESEND_API_KEY is not configured. Email dispatch aborted.'
    };
  }

  const queueId = `email_q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const record: QueuedEmail = {
    id: queueId,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 3,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  emailDeliveryQueue.set(queueId, record);

  let lastError = 'Unknown transmission error';

  while (record.attempts < record.maxAttempts) {
    record.attempts += 1;
    record.updatedAt = Date.now();
    if (record.attempts > 1) {
      record.status = 'RETRYING';
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, record.attempts - 1) * 300));
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]+>/g, ' ')
        }),
        signal: AbortSignal.timeout(10000)
      });

      const data = await res.json();
      if (res.ok && data.id) {
        record.status = 'SENT';
        record.updatedAt = Date.now();
        return {
          success: true,
          id: data.id,
          status: 'SENT'
        };
      }

      lastError = data.message || `Resend API returned status ${res.status}`;
      record.lastError = lastError;
    } catch (err: any) {
      lastError = err.message || 'Network error reaching Resend API';
      record.lastError = lastError;
    }
  }

  record.status = 'FAILED';
  record.updatedAt = Date.now();
  console.error(`Failed to deliver email to ${options.to} after ${record.maxAttempts} attempts: ${lastError}`);
  return {
    success: false,
    status: 'FAILED',
    error: lastError
  };
}

export function getEmailDeliveryStatus(queueId: string): QueuedEmail | undefined {
  return emailDeliveryQueue.get(queueId);
}

export async function sendVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyLink = `${appUrl}/auth/verify-email?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #4f46e5;">Verify Your ShopMate AI Account</h2>
      <p>Hello ${name},</p>
      <p>Thank you for signing up for the ShopMate AI-Native E-Commerce Platform. Please confirm your email address by clicking the link below:</p>
      <p style="margin: 24px 0;">
        <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verify Email Address
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours. If you did not sign up, please ignore this email.</p>
    </div>
  `;

  const res = await sendTransactionalEmail({
    to: email,
    subject: 'Confirm your ShopMate AI Account',
    html
  });

  return res.success;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/auth/reset-password?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #4f46e5;">Password Reset Request</h2>
      <p>We received a request to reset your ShopMate AI account password.</p>
      <p style="margin: 24px 0;">
        <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">This single-use password reset link will expire in 1 hour. If you did not request this, no action is needed.</p>
    </div>
  `;

  const res = await sendTransactionalEmail({
    to: email,
    subject: 'Reset your ShopMate AI Password',
    html
  });

  return res.success;
}
