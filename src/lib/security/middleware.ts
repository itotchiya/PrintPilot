import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitResponse, RateLimits } from './rate-limit';
import { RateLimitKeys } from './validation';

/**
 * Security Middleware
 * 
 * Rate limiting and security headers for API routes
 */

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string | null {
  // Check for forwarded headers (behind proxy/load balancer)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Check for real IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Check Next.js specific header
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0].trim();
  }

  // Fallback to socket remote address (not available in edge)
  return 'unknown';
}

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(
  request: NextRequest,
  options: { maxRequests: number; windowSeconds: number; keyPrefix?: string }
): Response | null {
  const ip = getClientIp(request);
  const key = RateLimitKeys.byIp(ip);

  const result = checkRateLimit(key, options);

  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  return null;
}

/**
 * Middleware for invitation creation endpoint
 */
export function invitationRateLimit(request: NextRequest): Response | null {
  return applyRateLimit(request, RateLimits.invitations.create);
}

/**
 * Middleware for authentication endpoints
 */
export function authRateLimit(request: NextRequest): Response | null {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes('/login')) {
    return applyRateLimit(request, RateLimits.auth.login);
  }

  if (pathname.includes('/register')) {
    return applyRateLimit(request, RateLimits.auth.register);
  }

  return applyRateLimit(request, RateLimits.auth.login);
}

/**
 * Middleware for quote endpoints
 */
export function quoteRateLimit(request: NextRequest): Response | null {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes('/pdf')) {
    return applyRateLimit(request, RateLimits.quotes.download);
  }

  return applyRateLimit(request, RateLimits.quotes.create);
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Content type sniffing protection
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content Security Policy (basic)
  // For production, customize based on your needs
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

/**
 * Validate request origin
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    'http://localhost:3000',
    'https://localhost:3000',
  ].filter(Boolean);

  // Allow requests without origin (mobile apps, curl, etc.)
  if (!origin) {
    return true;
  }

  return allowedOrigins.some((allowed) => origin === allowed);
}

/**
 * Main security middleware function
 */
export function securityMiddleware(request: NextRequest): NextResponse | null {
  // Check origin for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!validateOrigin(request)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid origin' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Apply rate limiting based on route
  let rateLimitResponse: Response | null = null;

  if (request.nextUrl.pathname.startsWith('/api/invitations')) {
    if (request.method === 'POST') {
      rateLimitResponse = invitationRateLimit(request);
    }
  }

  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    rateLimitResponse = authRateLimit(request);
  }

  if (request.nextUrl.pathname.startsWith('/api/client/quotes')) {
    rateLimitResponse = quoteRateLimit(request);
  }

  if (rateLimitResponse) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: rateLimitResponse.headers,
      }
    );
  }

  return null;
}
