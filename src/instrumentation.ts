export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to prevent edge runtime compilation errors for node-only crypto modules
    try {
      const { validateBootSecrets } = await import('@/lib/auth');
      validateBootSecrets();

      const { validateEmailBootConfig } = await import('@/lib/email');
      validateEmailBootConfig();


    } catch (err: any) {
      console.error('FATAL: Next.js server boot validation failed: ' + err.message);
      if (process.env.APP_ENV === 'production' || (process.env.NODE_ENV === 'production' && process.env.APP_ENV !== 'development')) {
        process.exit(1);
      }
    }
  }
}
