import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 * 
 * Handles security checks at the edge before requests reach the application.
 */

// Public routes that don't require checks
const PUBLIC_ROUTES = [
  '/_next/',
  '/static/',
  '/favicon.ico',
  '/robots.txt',
  '/api/auth/providers',
  '/api/auth/csrf',
];

/**
 * Check if a path should skip middleware checks
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((route) => path.startsWith(route));
}


/**
 * Get client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Validate request origin for API routes
 */
function validateOrigin(request: NextRequest): boolean {
  // Skip origin check for same-origin requests
  const origin = request.headers.get('origin');
  if (!origin) {
    return true; // Allow requests without origin (curl, mobile apps)
  }

  const host = request.headers.get('host');
  if (host && origin.includes(host)) {
    return true; // Fast pass for same-origin requests
  }

  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
    'https://hdprint.vercel.app',
  ].filter(Boolean);

  if (allowedOrigins.some((allowed) => origin === allowed)) {
    return true;
  }

  // Allow deployed Vercel previews dynamically
  if (origin.endsWith('.vercel.app')) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Create response
  const response = NextResponse.next();

  // Add security headers (defense in depth)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Validate origin for API routes
  if (pathname.startsWith('/api/')) {
    if (!validateOrigin(request)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid origin' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  // Log suspicious requests (optional, for monitoring)
  if (pathname.includes('..') || pathname.includes('//')) {
    console.warn(`[Security] Suspicious path detected: ${pathname} from ${getClientIp(request)}`);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
