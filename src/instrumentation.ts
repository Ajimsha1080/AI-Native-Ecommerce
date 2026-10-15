export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to prevent edge runtime compilation errors for node-only crypto modules
    try {
      const { validateBootSecrets } = await import('@/lib/auth');
      validateBootSecrets();

      const { validateEmailBootConfig } = await import('@/lib/email');
      validateEmailBootConfig();

      const { assertDatabaseRoleSecurity } = await import('@/lib/db/client');
      await assertDatabaseRoleSecurity();
    } catch (err: any) {
      console.error('FATAL: Next.js server boot validation failed: ' + err.message);
      process.exit(1);
    }
  }
}
