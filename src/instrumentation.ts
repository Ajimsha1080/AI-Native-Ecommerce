import { validateBootSecrets } from '@/lib/auth';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Fail-closed validation at Next.js server boot
    try {
      validateBootSecrets();
    } catch (err: any) {
      console.error('FATAL: Next.js server boot validation failed: ' + err.message);
      // In production, ensure process fails to boot if secrets are missing/insecure
      if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}
