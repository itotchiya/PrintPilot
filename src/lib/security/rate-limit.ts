/**
 * Rate Limiting Utility
 * 
 * Implements in-memory rate limiting for API endpoints.
 * For production with multiple servers, use Redis or similar.
 */

type RateLimitStore = Map<string, { count: number; resetAt: number }>;

const store: RateLimitStore = new Map();

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional key prefix for different rate limit categories */
  keyPrefix?: string;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Unix timestamp when the rate limit resets */
  resetAt: number;
  /** Total limit for this window */
  limit: number;
}

/**
 * Check if a request is within the rate limit
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { maxRequests, windowSeconds, keyPrefix = '' } = options;
  const key = keyPrefix ? `${keyPrefix}:${identifier}` : identifier;
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  const record = store.get(key);

  if (!record || record.resetAt < now) {
    // No record or window expired, create new record
    const newRecord = { count: 1, resetAt };
    store.set(key, newRecord);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      cleanupExpiredEntries();
    }

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
      limit: maxRequests,
    };
  }

  // Check if limit exceeded
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      limit: maxRequests,
    };
  }

  // Increment count
  record.count++;

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
    limit: maxRequests,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

/**
 * Create a rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...getRateLimitHeaders(result),
  });

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`,
      resetAt: result.resetAt,
    }),
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Cleanup expired entries from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Reset all rate limits (useful for testing)
 */
export function resetRateLimits(): void {
  store.clear();
}

// Predefined rate limit configurations
export const RateLimits = {
  /** Strict limits for authentication endpoints */
  auth: {
    login: { maxRequests: 5, windowSeconds: 60, keyPrefix: 'auth:login' },
    register: { maxRequests: 3, windowSeconds: 60, keyPrefix: 'auth:register' },
  },
  /** Limits for invitation endpoints */
  invitations: {
    create: { maxRequests: 10, windowSeconds: 60, keyPrefix: 'inv:create' },
    accept: { maxRequests: 5, windowSeconds: 60, keyPrefix: 'inv:accept' },
  },
  /** Limits for quote generation */
  quotes: {
    create: { maxRequests: 30, windowSeconds: 60, keyPrefix: 'quote:create' },
    download: { maxRequests: 20, windowSeconds: 60, keyPrefix: 'quote:download' },
  },
  /** General API limits */
  api: {
    general: { maxRequests: 100, windowSeconds: 60, keyPrefix: 'api' },
  },
} as const;
