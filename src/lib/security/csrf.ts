export const CSRF_COOKIE_NAME = 'aaas_csrf_token';

/**
 * Generates a cryptographically strong random token for CSRF defense
 */
export function generateCsrfToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time validation of CSRF tokens to prevent timing attacks across both Node and Edge runtimes
 */
export function verifyCsrfToken(cookieToken?: string, headerToken?: string): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  let diff = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    diff |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validates incoming HTTP requests against Cross-Site Request Forgery (CSRF).
 * - Safe methods (GET, HEAD, OPTIONS) are exempt.
 * - Machine-to-machine integrations (Bearer JWT, X-API-Key, Webhooks) are exempt.
 * - Browser sessions relying on ambient cookie credentials are strictly validated.
 */
export function validateCsrfProtection(req: Request): { valid: boolean; reason?: string } {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  const url = new URL(req.url);

  // Exempt webhooks - they use cryptographically signed HMAC payloads
  if (url.pathname.startsWith('/api/webhooks/')) {
    return { valid: true };
  }

  // Exempt public widget / embed commerce checkout and chat endpoints
  if (url.pathname.startsWith('/api/embed/') || url.pathname.startsWith('/embed/')) {
    return { valid: true };
  }

  // Exempt machine-to-machine calls authenticated with API keys or Bearer tokens
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader || (authHeader && authHeader.startsWith('Bearer '))) {
    return { valid: true };
  }

  // Check Origin / Host match for browser requests
  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return { valid: false, reason: `Origin mismatch: ${originUrl.host} does not match host ${host}` };
      }
    } catch {
      return { valid: false, reason: 'Malformed Origin header' };
    }
  }

  // Check Referer header if Origin is omitted
  const referer = req.headers.get('referer');
  if (!origin && referer && host) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host !== host) {
        return { valid: false, reason: `Referer mismatch: ${refererUrl.host} does not match host ${host}` };
      }
    } catch {
      return { valid: false, reason: 'Malformed Referer header' };
    }
  }

  // Extract CSRF cookie and header if session cookie is present
  const cookieHeader = req.headers.get('cookie') || '';
  const hasSessionCookie = cookieHeader.includes('aaas_session_token=');

  if (hasSessionCookie) {
    const csrfCookieMatch = cookieHeader.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
    const csrfCookie = csrfCookieMatch ? csrfCookieMatch[1] : undefined;
    const csrfHeader = req.headers.get('x-csrf-token') || req.headers.get('X-CSRF-Token');

    if (csrfCookie && !verifyCsrfToken(csrfCookie, csrfHeader || undefined)) {
      return { valid: false, reason: 'CSRF token mismatch or missing' };
    }
  }

  return { valid: true };
}
