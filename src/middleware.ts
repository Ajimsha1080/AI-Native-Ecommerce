import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateCsrfProtection } from '@/lib/security/csrf';

export function middleware(req: NextRequest) {
  // 1. CSRF Protection for mutating API requests
  const csrfResult = validateCsrfProtection(req as unknown as Request);
  if (!csrfResult.valid) {
    return NextResponse.json({
      error: {
        code: 'CSRF_REJECTED',
        message: csrfResult.reason || 'Cross-Site Request Forgery validation failed'
      }
    }, { status: 403 });
  }

  const response = NextResponse.next();

  // 2. Strict Security Headers & CSP
  const isEmbed = req.nextUrl.pathname.startsWith('/embed') || req.nextUrl.pathname.startsWith('/api/embed');

  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.razorpay.com https://api.stripe.com https://*.resend.com ws: wss:",
    "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    isEmbed ? "frame-ancestors *" : "frame-ancestors 'none'"
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (!isEmbed) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
