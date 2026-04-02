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

/** Review submission: 5 reviews per hour per IP */
export const reviewLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
});

/** General API: 100 requests per minute per IP */
export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
});

/**
 * Simple hash function for IP addresses.
 * Used as fallback when x-forwarded-for header is untrusted.
 *
 * NOTE: "unknown" IPs are all hashed to the same value, which means all
 * anonymous users share the same rate limit bucket. To differentiate them,
 * consider adding request identifiers (session ID, request path, etc.).
 */
function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return "hash_" + Math.abs(hash).toString(36);
}

/** Extract client IP from request with validation */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  // Check if running behind Vercel (production environment)
  const isVercelEnv = process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production";

  // Only trust x-forwarded-for if running behind a known proxy (Vercel)
  if (isVercelEnv) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const ip = forwarded.split(",")[0].trim();
      // Basic validation: should look like an IP address
      if (/^[\d.]+$/.test(ip) || /^[a-f0-9:]+$/.test(ip)) {
        return ip;
      }
    }
  }

  // Fallback: use hash of x-real-ip or unknown
  const realIp = headers.get("x-real-ip") || "unknown";
  return hashIp(realIp);
}

/** Standard 429 response with rate limit headers */
export function rateLimitResponse(resetAt: number) {
  return new Response(
    JSON.stringify({ success: false, message: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
      },
    }
  );
}
