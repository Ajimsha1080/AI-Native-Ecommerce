import dns from 'dns/promises';
import { URL } from 'url';

const BLOCKED_IP_PATTERNS = [
  /^127\./,                         // Loopback
  /^10\./,                          // Private 10.0.0.0/8
  /^192\.168\./,                    // Private 192.168.0.0/16
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private 172.16.0.0/12
  /^169\.254\./,                    // Link-local & Cloud Metadata (169.254.169.254)
  /^0\./,                           // Zero address
  /^::1$/,                          // IPv6 loopback
  /^f[cd][0-9a-f]{2}:/i,            // IPv6 Unique Local Address fc00::/7
  /^fe80:/i                         // IPv6 Link-Local fe80::/10
];

export function isPrivateIp(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some(pattern => pattern.test(ip.trim()));
}

export async function validateSafeUrl(urlStr: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Forbidden protocol '${parsed.protocol}'. Only http and https are allowed.`);
  }

  const hostname = parsed.hostname;

  // Block localhost and standard loopback hostnames
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') {
    throw new Error(`Access to private host '${hostname}' is forbidden (SSRF Protection).`);
  }

  // If hostname is directly an IP
  if (isPrivateIp(hostname)) {
    throw new Error(`Direct connection to private/reserved IP address '${hostname}' is forbidden.`);
  }

  // Resolve DNS to verify all destination IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        throw new Error(`Resolved IP '${addr.address}' for host '${hostname}' is in a restricted/private network range.`);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('restricted/private network')) throw err;
    // If DNS resolution fails, throw error
    throw new Error(`DNS resolution failed for '${hostname}': ${err.message}`);
  }

  return parsed;
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxSizeBytes?: number;
  maxRedirects?: number;
}

/**
 * Enterprise SSRF-Safe Fetch.
 * Enforces strict protocol allowlist, resolves and blocks loopback/private/metadata IPs,
 * re-validates every redirect, and caps max execution time and payload size.
 */
export async function safeFetch(
  urlStr: string,
  options: SafeFetchOptions = {}
): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any>; headers: Headers }> {
  const {
    timeoutMs = 5000,
    maxSizeBytes = 2 * 1024 * 1024, // 2MB
    maxRedirects = 3,
    ...fetchOpts
  } = options;

  let currentUrl = urlStr;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const validatedUrl = await validateSafeUrl(currentUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(validatedUrl.toString(), {
        ...fetchOpts,
        redirect: 'manual', // Intercept and validate every redirect
        signal: controller.signal
      });

      clearTimeout(timer);

      // Handle Redirects safely
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) throw new Error('Redirect response missing location header');
        
        currentUrl = new URL(location, validatedUrl).toString();
        redirectsCount++;
        continue;
      }

      // Check Content-Length header if present
      const cl = res.headers.get('content-length');
      if (cl && parseInt(cl, 10) > maxSizeBytes) {
        throw new Error(`Response size ${cl} exceeds maximum limit of ${maxSizeBytes} bytes.`);
      }

      // Read response buffer with size cap
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > maxSizeBytes) {
        throw new Error(`Downloaded content exceeded maximum size limit of ${maxSizeBytes} bytes.`);
      }

      const decodedText = new TextDecoder('utf-8').decode(arrayBuffer);

      return {
        ok: res.ok,
        status: res.status,
        headers: res.headers,
        text: async () => decodedText,
        json: async () => JSON.parse(decodedText)
      };
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  throw new Error(`Too many redirects (exceeded maximum of ${maxRedirects})`);
}
