import crypto from 'crypto';

export interface RazorpayOrderOptions {
  amount: number; // in Rupees / standard currency units
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface RazorpayOrderResponse {
  id: string;
  entity: 'order';
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
  key_id: string;
}

export interface PaymentLinkOptions {
  amount: number;
  currency?: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  callback_url?: string;
}

export interface PaymentLinkResponse {
  id: string;
  short_url: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'expired';
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string;
  };
  created_at: number;
}

export class RazorpayPaymentService {
  private keyId: string;
  private keySecret: string;
  private merchantRazorpayMe: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.merchantRazorpayMe = process.env.RAZORPAY_ME_URL || '';
  }

  public getKeyId(): string {
    return this.keyId;
  }

  public getMerchantHandle(): string {
    return this.merchantRazorpayMe;
  }

  public isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  /**
   * Create a new Razorpay Order (for Checkout / Popup / Agent session).
   * Fails closed: Never fabricates a mock order ID. Returns 502/503 on missing keys or gateway error.
   */
  async createOrder(options: RazorpayOrderOptions): Promise<RazorpayOrderResponse & { payment_url?: string }> {
    if (!this.keyId || !this.keySecret) {
      const err = new Error('Razorpay service unavailable: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured');
      (err as any).statusCode = 503;
      throw err;
    }

    const amountInPaise = Math.round(options.amount * 100);
    const currency = options.currency || 'INR';
    const receipt = options.receipt || `rcpt_${Date.now()}`;
    const notes = options.notes || {};

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    let res: Response;
    try {
      res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt,
          notes
        }),
        signal: AbortSignal.timeout(15000)
      });
    } catch (fetchErr: any) {
      const err = new Error(`Razorpay gateway unreachable: ${fetchErr.message || 'Connection failed'}`);
      (err as any).statusCode = 502;
      throw err;
    }

    if (!res.ok) {
      const errorText = await res.text();
      const err = new Error(`Razorpay API error (${res.status}): ${errorText}`);
      (err as any).statusCode = 502;
      throw err;
    }

    const data = await res.json();
    return {
      ...data,
      key_id: this.keyId,
      payment_url: this.merchantRazorpayMe || undefined
    };
  }

  /**
   * Create an autonomous Agentic Payment Link via Razorpay API.
   * Fails closed: Never fabricates a mock link.
   */
  async createPaymentLink(options: PaymentLinkOptions): Promise<PaymentLinkResponse> {
    if (!this.keyId || !this.keySecret) {
      const err = new Error('Razorpay service unavailable: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured');
      (err as any).statusCode = 503;
      throw err;
    }

    const amountInPaise = Math.round(options.amount * 100);
    const currency = options.currency || 'INR';
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    let res: Response;
    try {
      res = await fetch('https://api.razorpay.com/v1/payment_links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          description: options.description,
          customer: options.customer,
          notes: options.notes,
          callback_url: options.callback_url,
          callback_method: 'get'
        }),
        signal: AbortSignal.timeout(15000)
      });
    } catch (fetchErr: any) {
      const err = new Error(`Razorpay gateway unreachable: ${fetchErr.message || 'Connection failed'}`);
      (err as any).statusCode = 502;
      throw err;
    }

    if (!res.ok) {
      const errorText = await res.text();
      const err = new Error(`Razorpay Payment Link API error (${res.status}): ${errorText}`);
      (err as any).statusCode = 502;
      throw err;
    }

    const data = await res.json();
    return {
      id: data.id,
      short_url: data.short_url,
      amount: options.amount,
      currency,
      status: data.status,
      description: options.description,
      customer: options.customer,
      created_at: data.created_at
    };
  }

  /**
   * Verify HMAC SHA256 Signature for standard Razorpay checkout using timingSafeEqual.
   */
  verifySignature(params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): boolean {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
    if (!this.keySecret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return false;
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const expectedBuf = Buffer.from(generatedSignature, 'utf8');
      const actualBuf = Buffer.from(razorpay_signature, 'utf8');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (e) {
      console.error('Signature verification error:', e);
      return false;
    }
  }

  /**
   * Verify Webhook Signature with timingSafeEqual. Fail closed if secret is unset.
   */
  verifyWebhookSignature(payload: string, signature: string, webhookSecret?: string): boolean {
    const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature || !payload) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }
}

export const razorpayService = new RazorpayPaymentService();

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    const expBuf = Buffer.from(expected, 'utf8');
    const actBuf = Buffer.from(signature, 'utf8');
    if (expBuf.length !== actBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, actBuf);
  } catch {
    return false;
  }
}
