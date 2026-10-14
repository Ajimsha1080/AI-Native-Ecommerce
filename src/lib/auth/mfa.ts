import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to RFC 4648 Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string to Buffer
 */
export function base32Decode(str: string): Buffer {
  const cleanStr = str.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleanStr[i]);
    if (idx === -1) {
      continue;
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a new cryptographically secure Base32 MFA secret
 */
export function generateMfaSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Generates an RFC 6238 TOTP URI for authenticator apps (Google Authenticator, Authy, 1Password)
 */
export function generateOtpauthUri(email: string, secret: string, issuer: string = 'ShopMate'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a 6-digit TOTP code for a specific counter step
 */
function getTotpCodeForCounter(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  // Write counter as 64-bit big endian integer
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226 / RFC 6238)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Generates the current 6-digit TOTP code for a Base32 secret
 */
export function generateTotpCode(secret: string): string {
  const secretBuffer = base32Decode(secret);
  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  return getTotpCodeForCounter(secretBuffer, currentCounter);
}

/**
 * Verifies a 6-digit TOTP code against a Base32 secret with clock drift tolerance
 */
export function verifyTotpCode(secret: string, code: string, window: number = 1): boolean {
  if (!secret || !code) return false;
  const cleanCode = code.trim();
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) return false;

  const secretBuffer = base32Decode(secret);
  if (secretBuffer.length === 0) return false;

  const step = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / step);

  for (let delta = -window; delta <= window; delta++) {
    const expectedCode = getTotpCodeForCounter(secretBuffer, currentCounter + delta);
    if (crypto.timingSafeEqual(Buffer.from(cleanCode, 'utf-8'), Buffer.from(expectedCode, 'utf-8'))) {
      return true;
    }
  }

  return false;
}
