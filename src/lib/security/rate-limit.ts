/**
 * Rate limiting with Upstash Redis in production and in-memory fallback locally.
 *
 * Usage:
 *   const result = await loginLimiter.check(clientIp);
 *   if (!result.allowed) return rateLimitResponse(result.resetAt);
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  max: number;
  /** Prefix for Redis keys (and in-memory namespace) */
  prefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  check(identifier: string): Promise<RateLimitResult>;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

function createInMemoryRateLimiter(options: RateLimiterOptions): RateLimiter {
  const store = new Map<string, WindowEntry>();
  const CLEANUP_INTERVAL = 60_000;
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }

  return {
    check(identifier: string): Promise<RateLimitResult> {
      cleanup();
      if (store.size > 10000) {
        const entries = Array.from(store.entries());
        entries.sort((a, b) => a[1].resetAt - b[1].resetAt);
        for (const [key] of entries.slice(0, Math.floor(entries.length / 2))) {
          store.delete(key);
        }
      }

      const now = Date.now();
      const key = `${options.prefix}:${identifier}`;
      const entry = store.get(key);

      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + options.windowMs });
        return Promise.resolve({
          allowed: true,
          remaining: options.max - 1,
          resetAt: now + options.windowMs,
        });
      }

      entry.count++;
      return Promise.resolve({
        allowed: entry.count <= options.max,
        remaining: Math.max(0, options.max - entry.count),
        resetAt: entry.resetAt,
      });
    },
  };
}

function windowToDuration(windowMs: number): `${number} s` | `${number} m` | `${number} h` | `${number} d` {
  if (windowMs % (24 * 60 * 60 * 1000) === 0) {
    return `${windowMs / (24 * 60 * 60 * 1000)} d` as `${number} d`;
  }
  if (windowMs % (60 * 60 * 1000) === 0) {
    return `${windowMs / (60 * 60 * 1000)} h` as `${number} h`;
  }
  if (windowMs % (60 * 1000) === 0) {
    return `${windowMs / (60 * 1000)} m` as `${number} m`;
  }
  return `${Math.max(1, Math.ceil(windowMs / 1000))} s` as `${number} s`;
}

let sharedRedis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!sharedRedis) {
    sharedRedis = new Redis({ url, token });
  }
  return sharedRedis;
}

function createDistributedRateLimiter(options: RateLimiterOptions): RateLimiter {
  const memory = createInMemoryRateLimiter(options);
  let upstash: Ratelimit | null = null;

  function getUpstash(): Ratelimit | null {
    const redis = getRedis();
    if (!redis) return null;
    if (!upstash) {
      upstash = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(options.max, windowToDuration(options.windowMs)),
        prefix: `nga:${options.prefix}`,
        analytics: false,
      });
    }
    return upstash;
  }

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const limiter = getUpstash();
      if (!limiter) {
        return memory.check(identifier);
      }

      const result = await limiter.limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    },
  };
}

/** @deprecated Use createDistributedRateLimiter — kept for setup-admin inline limiter */
export function createRateLimiter(options: Omit<RateLimiterOptions, "prefix"> & { prefix?: string }) {
  const limiter = createDistributedRateLimiter({
    ...options,
    prefix: options.prefix ?? "generic",
  });
  return {
    check: (identifier: string) => limiter.check(identifier),
  };
}

// ─── Pre-configured limiters ─────────────────────────────────────────

/** Login: 5 attempts per 15 minutes per IP */
export const loginLimiter = createDistributedRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: "login",
});

/** Checkout: 3 bookings per hour per IP */
export const checkoutLimiter = createDistributedRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  prefix: "checkout",
});

/** Contact form: 2 submissions per hour per IP */
export const contactLimiter = createDistributedRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 2,
  prefix: "contact",
});

/** Promo validation: 10 attempts per hour per IP */
export const promoLimiter = createDistributedRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: "promo",
});

/** Review submission: 5 reviews per hour per IP */
export const reviewLimiter = createDistributedRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: "review",
});

/** General API: 100 requests per minute per IP */
export const generalLimiter = createDistributedRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: "general",
});

/** Admin-triggered password emails: 10 per hour per IP */
export const passwordEmailLimiter = createDistributedRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: "password-email",
});

/** Agreement signing: 10 per hour per IP */
export const agreementSignLimiter = createDistributedRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: "agreement-sign",
});

/** Temp upload: 20 per hour per IP */
export const uploadTempLimiter = createDistributedRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  prefix: "upload-temp",
});

/** Turo webhook: 60 per minute per IP */
export const turoWebhookLimiter = createDistributedRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  prefix: "turo-webhook",
});

function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return "hash_" + Math.abs(hash).toString(36);
}

/** Extract client IP from request with validation */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  const isVercelEnv = process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production";

  if (isVercelEnv) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const ip = forwarded.split(",")[0].trim();
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const ipv6Regex = /^[a-f0-9:]+$/i;
      const ipv4Match = ipv4Regex.exec(ip);
      if (ipv4Match && ipv4Match.slice(1).every((octet) => parseInt(octet, 10) <= 255)) {
        return ip;
      }
      if (ipv6Regex.test(ip)) {
        return ip;
      }
    }
  }

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

/** True when Upstash env vars are configured (for tests/diagnostics). */
export function isDistributedRateLimitEnabled(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
