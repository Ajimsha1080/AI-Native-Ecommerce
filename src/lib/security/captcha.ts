import { safeFetch } from '../utils/safe-fetch';

/**
 * Cloudflare Turnstile / hCaptcha Verification Engine.
 * Fails closed in production if CAPTCHA secret is configured and verification fails.
 */
export async function verifyCaptchaToken(token?: string, clientIp?: string): Promise<{ success: boolean; error?: string }> {
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;

  // If no captcha secret configured (e.g. in local development / test without captcha), allow pass-through
  if (!turnstileSecret && !hcaptchaSecret) {
    return { success: true };
  }

  if (!token || token.trim().length === 0) {
    return { success: false, error: 'CAPTCHA challenge token is required.' };
  }

  if (turnstileSecret) {
    try {
      const form = new URLSearchParams();
      form.append('secret', turnstileSecret);
      form.append('response', token);
      if (clientIp && clientIp !== 'local_ip') form.append('remoteip', clientIp);

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });

      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: 'Cloudflare Turnstile verification failed.' };
    } catch (err: any) {
      return { success: false, error: `CAPTCHA verification service error: ${err.message}` };
    }
  }

  if (hcaptchaSecret) {
    try {
      const form = new URLSearchParams();
      form.append('secret', hcaptchaSecret);
      form.append('response', token);
      if (clientIp && clientIp !== 'local_ip') form.append('remoteip', clientIp);

      const res = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });

      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: 'hCaptcha verification failed.' };
    } catch (err: any) {
      return { success: false, error: `CAPTCHA verification service error: ${err.message}` };
    }
  }

  return { success: true };
}
