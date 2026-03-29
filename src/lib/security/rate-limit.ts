/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Note: In a serverless environment like Vercel, each instance has its own memory,
 * so this provides per-instance rate limiting. For true distributed rate limiting,
 * upgrade to Upstash Redis (@upstash/ratelimit). This is still effective at blocking
 * rapid bursts and automated attacks within a single instance.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
 *   const result = limiter.check(clientIp);
 *   if (!result.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const store = new Map<string, WindowEntry>();

  // Periodic cleanup to prevent memory leaks
  const CLEANUP_INTERVAL = 60_000; // 1 minute
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }

  // Bug 29: Add proactive cleanup interval (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return {
    check(identifier: string): RateLimitResult {
      // Periodic cleanup when store exceeds normal size (1000 entries)
      if (store.size > 1000) {
        const now = Date.now();
        for (const [key, entry] of store) {
          if (entry.resetAt <= now) {
            store.delete(key);
          }
        }
      }

      // Emergency cleanup if store grows very large
      if (store.size > 10000) {
        const now = Date.now();
        for (const [key, entry] of store) {
          if (entry.resetAt <= now) {
            store.delete(key);
          }
        }
      }

      cleanup();

      const now = Date.now();
      const entry = store.get(identifier);

      // New window or expired window
      if (!entry || entry.resetAt <= now) {
        store.set(identifier, {
          count: 1,
          resetAt: now + options.windowMs,
        });
        return {
          allowed: true,
          remaining: options.max - 1,
          resetAt: now + options.windowMs,
        };
      }

      // Within current window
      entry.count++;
      const allowed = entry.count <= options.max;

      return {
        allowed,
        remaining: Math.max(0, options.max - entry.count),
        resetAt: entry.resetAt,
      };
    },
  };
}

// ─── Pre-configured limiters ─────────────────────────────────────────

/** Login: 5 attempts per 15 minutes per IP */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

/** Checkout: 3 bookings per hour per IP */
export const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
});

/** Contact form: 2 submissions per hour per IP */
export const contactLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 2,
});

/** Promo validation: 10 attempts per hour per IP */
export const promoLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
});

/** General API: 100 requests per minute per IP */
export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
});

/** Extract client IP from request */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  // Vercel sets x-forwarded-for
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  // Fallback
  return headers.get("x-real-ip") || "unknown";
}

/** Standard 429 response with rate limit headers */
export function rateLimitResponse(resetAt: number) {
  return new Response(
    JSON.stringify({ success: false, message: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
      },
    }
  );
}
