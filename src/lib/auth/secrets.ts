export const DISALLOWED_DEFAULT_SECRETS = [
  'super_secret_jwt_key_enterprise_grade_aaas_platform_2026',
  'super_secret_jwt_key_change_in_production',
  'secret',
  'changeme',
  'password',
  'test',
  'admin',
  '12345678901234567890123456789012'
];

export function validateSecretStrength(secret: string | undefined, name: string): string {
  if (!secret || secret.trim().length === 0) {
    throw new Error(`Security Error: Environment variable '${name}' is missing or empty.`);
  }
  if (secret.length < 32) {
    throw new Error(`Security Error: Environment variable '${name}' must be at least 32 characters long.`);
  }
  if (DISALLOWED_DEFAULT_SECRETS.includes(secret.trim())) {
    throw new Error(`Security Error: Environment variable '${name}' is using a known insecure default secret.`);
  }
  return secret;
}
