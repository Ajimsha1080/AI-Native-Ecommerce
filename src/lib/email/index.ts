import { getRedisClient } from '@/lib/redis';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailDeliveryStatus = 'PENDING' | 'RETRYING' | 'SENT' | 'DEAD_LETTER' | 'FAILED';

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

// Redis persistent queue keys
const EMAIL_QUEUE_KEY = 'email:queue:pending';
const EMAIL_DLQ_KEY = 'email:queue:dead_letter';
const EMAIL_STATUS_PREFIX = 'email:record:';

/**
 * Validate that RESEND_API_KEY is present in production environments.
 * Fails boot if unset.
 */
export function validateEmailBootConfig(): void {
  const isProd = process.env.APP_ENV === 'production' || (process.env.NODE_ENV === 'production' && process.env.APP_ENV !== 'development');
  if (isProd && (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('PLACEHOLDER'))) {
    throw new Error('FATAL: RESEND_API_KEY is required in production environment');
  }
}

/**
 * Persists an email job in Redis queue.
 */
export async function enqueueEmail(options: SendEmailOptions, maxAttempts: number = 3): Promise<QueuedEmail> {
  const redis = getRedisClient();
  const queueId = `email_q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const record: QueuedEmail = {
    id: queueId,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    status: 'PENDING',
    attempts: 0,
    maxAttempts,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await redis.set(`${EMAIL_STATUS_PREFIX}${queueId}`, JSON.stringify(record), 'EX', 86400 * 7);
    await redis.lpush(EMAIL_QUEUE_KEY, JSON.stringify(record));
  } catch (err: any) {
    console.error(`[EMAIL_QUEUE_ERROR] Failed to persist email to Redis queue: ${err.message}`);
  }

  return record;
}

/**
 * Processes a single email job from queue against Resend API with exponential retries and dead-letter queue.
 */
export async function processEmailJob(record: QueuedEmail): Promise<EmailDispatchResult> {
  const redis = getRedisClient();
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'ShopMate AI <support@aaas-platform.com>';

  const isProd = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
  if (!resendApiKey || resendApiKey.includes('PLACEHOLDER')) {
    if (isProd) {
      throw new Error('Cannot send transactional email: RESEND_API_KEY is missing in production');
    }
    record.status = 'FAILED';
    record.lastError = 'RESEND_API_KEY is not configured. Email dispatch aborted in development.';
    record.updatedAt = Date.now();
    try {
      await redis.set(`${EMAIL_STATUS_PREFIX}${record.id}`, JSON.stringify(record), 'EX', 86400 * 7);
    } catch {}
    return {
      success: false,
      status: 'FAILED',
      error: record.lastError
    };
  }

  record.attempts += 1;
  record.updatedAt = Date.now();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [record.to],
        subject: record.subject,
        html: record.html,
        text: record.text || record.html.replace(/<[^>]+>/g, ' ')
      }),
      signal: AbortSignal.timeout(10000)
    });

    const data = await res.json();
    if (res.ok && data.id) {
      record.status = 'SENT';
      record.updatedAt = Date.now();
      try {
        await redis.set(`${EMAIL_STATUS_PREFIX}${record.id}`, JSON.stringify(record), 'EX', 86400 * 7);
      } catch {}
      return {
        success: true,
        id: data.id,
        status: 'SENT'
      };
    }

    record.lastError = data.message || `Resend API returned HTTP ${res.status}`;
  } catch (err: any) {
    record.lastError = err.message || 'Network error reaching Resend API';
  }

  // Handle retry or Dead Letter Queue (DLQ)
  if (record.attempts < record.maxAttempts) {
    record.status = 'RETRYING';
    record.updatedAt = Date.now();
    try {
      await redis.set(`${EMAIL_STATUS_PREFIX}${record.id}`, JSON.stringify(record), 'EX', 86400 * 7);
      // Exponential backoff delay before re-enqueuing
      setTimeout(async () => {
        try {
          await redis.lpush(EMAIL_QUEUE_KEY, JSON.stringify(record));
        } catch {}
      }, Math.pow(2, record.attempts) * 500);
    } catch {}

    return {
      success: false,
      status: 'RETRYING',
      error: record.lastError
    };
  } else {
    record.status = 'DEAD_LETTER';
    record.updatedAt = Date.now();
    try {
      await redis.set(`${EMAIL_STATUS_PREFIX}${record.id}`, JSON.stringify(record), 'EX', 86400 * 30);
      await redis.lpush(EMAIL_DLQ_KEY, JSON.stringify(record));
    } catch {}

    console.error(`[EMAIL_DLQ_ALERT] Email ${record.id} to ${record.to} exceeded ${record.maxAttempts} attempts and was moved to DEAD-LETTER QUEUE: ${record.lastError}`);

    return {
      success: false,
      status: 'DEAD_LETTER',
      error: record.lastError
    };
  }
}

/**
 * Worker tick: pops and processes pending email jobs from Redis.
 */
export async function processEmailQueue(batchSize: number = 5): Promise<number> {
  const redis = getRedisClient();
  let processed = 0;

  for (let i = 0; i < batchSize; i++) {
    try {
      const raw = await redis.rpop(EMAIL_QUEUE_KEY);
      if (!raw) break;
      const job: QueuedEmail = JSON.parse(raw);
      await processEmailJob(job);
      processed++;
    } catch (err: any) {
      console.error(`[EMAIL_WORKER_ERROR] Error draining email queue: ${err.message}`);
      break;
    }
  }

  return processed;
}

/**
 * Dispatches a transactional email via Redis queue with retries and dead-letter.
 */
export async function sendTransactionalEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
  const job = await enqueueEmail(options);
  return await processEmailJob(job);
}

/**
 * Fetch delivery status from Redis by queue ID.
 */
export async function getEmailDeliveryStatus(queueId: string): Promise<QueuedEmail | null> {
  const redis = getRedisClient();
  try {
    const raw = await redis.get(`${EMAIL_STATUS_PREFIX}${queueId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch emails currently in the Dead Letter Queue (DLQ).
 */
export async function getDeadLetterEmails(limit: number = 50): Promise<QueuedEmail[]> {
  const redis = getRedisClient();
  try {
    const items = await redis.lrange(EMAIL_DLQ_KEY, 0, limit - 1);
    return items.map(item => JSON.parse(item));
  } catch {
    return [];
  }
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
