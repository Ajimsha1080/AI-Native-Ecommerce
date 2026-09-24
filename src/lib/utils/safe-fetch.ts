import dns from 'dns/promises';
import net from 'net';
import { URL } from 'url';

/**
 * Normalizes an IPv4 string (including hex, octal, and single dword integer) to standard dotted decimal.
 * Returns null if the string is not a valid IPv4 representation.
 */
function normalizeIPv4(input: string): string | null {
  const trimmed = input.trim();
  
  // Single dword integer or hex string e.g. "0x7f000001" or "2130706433"
  if (/^(0x[0-9a-f]+|\d+)$/i.test(trimmed)) {
    try {
      const num = Number(BigInt(trimmed));
      if (num >= 0 && num <= 0xffffffff) {
        const b1 = (num >>> 24) & 255;
        const b2 = (num >>> 16) & 255;
        const b3 = (num >>> 8) & 255;
        const b4 = num & 255;
        return `${b1}.${b2}.${b3}.${b4}`;
      }
    } catch {
      return null;
    }
  }

  // Dotted notation e.g. "127.0.0.1", "0x7f.0.0.1", "0177.0.0.1"
  const parts = trimmed.split('.');
  if (parts.length === 4) {
    const bytes: number[] = [];
    for (const p of parts) {
      let val: number;
      if (/^0x[0-9a-f]+$/i.test(p)) {
        val = parseInt(p, 16);
      } else if (/^0[0-7]+$/.test(p)) {
        val = parseInt(p, 8);
      } else if (/^\d+$/.test(p)) {
        val = parseInt(p, 10);
      } else {
        return null;
      }
      if (isNaN(val) || val < 0 || val > 255) return null;
      bytes.push(val);
    }
    return bytes.join('.');
  }

  return null;
}

/**
 * Checks if an IPv4 dotted decimal address falls within a private, loopback, link-local, or reserved subnet.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;
  const [b1, b2, b3, b4] = parts;

  // 0.0.0.0/8 (Current network)
  if (b1 === 0) return true;
  // 10.0.0.0/8 (Private)
  if (b1 === 10) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (b1 === 100 && b2 >= 64 && b2 <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (b1 === 127) return true;
  // 169.254.0.0/16 (Link-local & Cloud Metadata)
  if (b1 === 169 && b2 === 254) return true;
  // 172.16.0.0/12 (Private)
  if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b1 === 192 && b2 === 0 && b3 === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (b1 === 192 && b2 === 0 && b3 === 2) return true;
  // 192.168.0.0/16 (Private)
  if (b1 === 192 && b2 === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (b1 === 198 && (b2 === 18 || b2 === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (b1 === 198 && b2 === 51 && b3 === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (b1 === 203 && b2 === 0 && b3 === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (b1 >= 224 && b1 <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (b1 >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is loopback, unique local, link-local, or IPv4-mapped private.
 */
function isPrivateIPv6(ip: string): boolean {
  const clean = ip.toLowerCase().trim();

  // IPv6 Loopback
  if (clean === '::1' || clean === '0000:0000:0000:0000:0000:0000:0000:0001' || clean === '::') {
    return true;
  }

  // IPv6 Unique Local Address (fc00::/7 -> fc00:: or fd00::)
  if (clean.startsWith('fc') || clean.startsWith('fd')) {
    return true;
  }

  // IPv6 Link-Local (fe80::/10)
  if (clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb')) {
    return true;
  }

  // IPv4-Mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  const mappedMatch = clean.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedMatch) {
    return isPrivateIPv4(mappedMatch[1]);
  }

  // IPv4-mapped hex e.g. ::ffff:7f00:0001
  const mappedHexMatch = clean.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHexMatch) {
    const h1 = parseInt(mappedHexMatch[1], 16);
    const h2 = parseInt(mappedHexMatch[2], 16);
    const mappedIpv4 = `${(h1 >> 8) & 255}.${h1 & 255}.${(h2 >> 8) & 255}.${h2 & 255}`;
    return isPrivateIPv4(mappedIpv4);
  }

  return false;
}

export function isPrivateIp(ip: string): boolean {
  // Normalize bracketed IPv6
  let clean = ip.trim();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1);
  }

  // Try IPv4 normalization
  const normalizedIpv4 = normalizeIPv4(clean);
  if (normalizedIpv4) {
    return isPrivateIPv4(normalizedIpv4);
  }

  // Check IPv6
  if (net.isIPv6(clean) || clean.includes(':')) {
    return isPrivateIPv6(clean);
  }

  return false;
}

export async function validateSafeUrl(urlStr: string): Promise<URL> {
  if (!urlStr || typeof urlStr !== 'string') {
    throw new Error('Invalid URL format');
  }

  // Reject non-http protocols immediately (e.g. file:///etc/passwd, ftp://, data:)
  const trimmed = urlStr.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(`Forbidden protocol in URL '${urlStr}'. Only http:// and https:// are allowed.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Forbidden protocol '${parsed.protocol}'. Only http and https are allowed.`);
  }

  let hostname = parsed.hostname;
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // Block localhost and standard internal hostnames
  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === 'localhost' ||
    lowerHost.endsWith('.localhost') ||
    lowerHost === 'metadata.google.internal' ||
    lowerHost.endsWith('.internal') ||
    lowerHost.endsWith('.local')
  ) {
    throw new Error(`Access to private host '${hostname}' is forbidden (SSRF Protection).`);
  }

  // Check if hostname itself is directly a private/loopback/cloud metadata IP (including hex/octal/integer/ipv6)
  if (isPrivateIp(hostname)) {
    throw new Error(`Direct connection to private/reserved IP address '${hostname}' is forbidden.`);
  }

  // Resolve DNS to verify all destination IPs against private/reserved ranges
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`DNS resolution returned no addresses for '${hostname}'`);
    }
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        throw new Error(`Resolved IP '${addr.address}' for host '${hostname}' is in a restricted/private network range.`);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('restricted/private network') || err.message?.includes('SSRF Protection') || err.message?.includes('forbidden')) {
      throw err;
    }
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

