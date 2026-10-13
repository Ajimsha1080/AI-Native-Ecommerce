import { NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/security/csrf';

export async function GET(req: Request) {
  const token = generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });

  const isHttps = req.headers.get('x-forwarded-proto') === 'https' || req.url.startsWith('https:');

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Accessible to JavaScript to attach to x-csrf-token header
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400
  });

  return response;
}
