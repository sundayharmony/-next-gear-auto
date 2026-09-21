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

/** Login limiters that only count failed attempts (peek before try, record on failure). */
export interface AuthFailureLimiter extends RateLimiter {
  peek(identifier: string): Promise<RateLimitResult>;
  recordFailure(identifier: string): Promise<RateLimitResult>;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

function createInMemoryRateLimiterStore(options: RateLimiterOptions) {
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

  function trimIfNeeded() {
    if (store.size <= 10000) return;
    const entries = Array.from(store.entries());
    entries.sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of entries.slice(0, Math.floor(entries.length / 2))) {
      store.delete(key);
    }
  }

  function storageKey(identifier: string) {
    return `${options.prefix}:${identifier}`;
  }

  function peek(identifier: string): RateLimitResult {
    cleanup();
    trimIfNeeded();

    const now = Date.now();
    const entry = store.get(storageKey(identifier));
    if (!entry || entry.resetAt <= now) {
      return {
        allowed: true,
        remaining: options.max,
        resetAt: now + options.windowMs,
      };
    }

    return {
      allowed: entry.count < options.max,
      remaining: Math.max(0, options.max - entry.count),
      resetAt: entry.resetAt,
    };
  }

  function recordFailure(identifier: string): RateLimitResult {
    cleanup();
    trimIfNeeded();

    const now = Date.now();
    const key = storageKey(identifier);
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return {
        allowed: true,
        remaining: options.max - 1,
        resetAt: now + options.windowMs,
      };
    }

    entry.count++;
    return {
      allowed: entry.count <= options.max,
      remaining: Math.max(0, options.max - entry.count),
      resetAt: entry.resetAt,
    };
  }

  return { peek, recordFailure };
}

function createInMemoryRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { recordFailure } = createInMemoryRateLimiterStore(options);
  return {
    check(identifier: string): Promise<RateLimitResult> {
      return Promise.resolve(recordFailure(identifier));
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

function createUpstashLimiter(options: RateLimiterOptions): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.max, windowToDuration(options.windowMs)),
    prefix: `nga:${options.prefix}`,
    analytics: false,
  });
}

function createDistributedRateLimiter(options: RateLimiterOptions): RateLimiter {
  const memory = createInMemoryRateLimiter(options);
  let upstash: Ratelimit | null = null;

  function getUpstash(): Ratelimit | null {
    if (!upstash) {
      upstash = createUpstashLimiter(options);
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

function createAuthFailureRateLimiter(options: RateLimiterOptions): AuthFailureLimiter {
  const memory = createInMemoryRateLimiterStore(options);
  let upstash: Ratelimit | null = null;

  function getUpstash(): Ratelimit | null {
    if (!upstash) {
      upstash = createUpstashLimiter(options);
    }
    return upstash;
  }

  return {
    check(identifier: string) {
      return this.recordFailure(identifier);
    },
    async peek(identifier: string): Promise<RateLimitResult> {
      const limiter = getUpstash();
      if (!limiter) {
        return memory.peek(identifier);
      }

      const result = await limiter.getRemaining(identifier);
      return {
        allowed: result.remaining > 0,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    },
    async recordFailure(identifier: string): Promise<RateLimitResult> {
      const limiter = getUpstash();
      if (!limiter) {
        return memory.recordFailure(identifier);
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

const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Failed login attempts per IP (v2 keys reset legacy lockouts on deploy) */
export const loginIpLimiter = createAuthFailureRateLimiter({
  windowMs: LOGIN_WINDOW_MS,
  max: 12,
  prefix: "login-fail-ip-v2",
});

/** Failed login attempts per email */
export const loginEmailLimiter = createAuthFailureRateLimiter({
  windowMs: LOGIN_WINDOW_MS,
  max: 8,
  prefix: "login-fail-email-v2",
});

/** Failed staff login attempts per IP */
export const staffLoginIpLimiter = createAuthFailureRateLimiter({
  windowMs: LOGIN_WINDOW_MS,
  max: 30,
  prefix: "staff-login-fail-ip-v2",
});

/** Failed staff login attempts per email */
export const staffLoginEmailLimiter = createAuthFailureRateLimiter({
  windowMs: LOGIN_WINDOW_MS,
  max: 15,
  prefix: "staff-login-fail-email-v2",
});

/** Signup / password flows still count every attempt */
export const signupIpLimiter = createDistributedRateLimiter({
  windowMs: LOGIN_WINDOW_MS,
  max: 12,
  prefix: "signup-ip-v2",
});

export const signupEmailLimiter = createDistributedRateLimiter({
  windowMs: LOGIN_WINDOW_MS,
  max: 8,
  prefix: "signup-email-v2",
});

/** @deprecated Use peekAuthRateLimit / recordAuthFailure — kept for tests */
export const loginLimiter = signupIpLimiter;

function mergeRateLimitResults(
  a: RateLimitResult,
  b: RateLimitResult
): RateLimitResult {
  if (!a.allowed) return a;
  if (!b.allowed) return b;
  return {
    allowed: true,
    remaining: Math.min(a.remaining, b.remaining),
    resetAt: Math.max(a.resetAt, b.resetAt),
  };
}

function authLimiters(staffOnly?: boolean) {
  return {
    ipLimiter: staffOnly ? staffLoginIpLimiter : loginIpLimiter,
    emailLimiter: staffOnly ? staffLoginEmailLimiter : loginEmailLimiter,
  };
}

async function runAuthLimitCheck(
  ipLimiter: AuthFailureLimiter | RateLimiter,
  emailLimiter: AuthFailureLimiter | RateLimiter,
  options: { ip: string; email?: string },
  mode: "peek" | "record" | "check"
): Promise<RateLimitResult> {
  const run = async (limiter: AuthFailureLimiter | RateLimiter, id: string) => {
    if (mode === "peek" && "peek" in limiter) return limiter.peek(id);
    if (mode === "record" && "recordFailure" in limiter) return limiter.recordFailure(id);
    return limiter.check(id);
  };

  const ipCheck = await run(ipLimiter, options.ip);
  if (!ipCheck.allowed) return ipCheck;

  const normalizedEmail = options.email?.toLowerCase().trim();
  if (!normalizedEmail) return ipCheck;

  const emailCheck = await run(emailLimiter, normalizedEmail);
  return mergeRateLimitResults(ipCheck, emailCheck);
}

/** Check whether login is currently locked (does not consume an attempt). */
export async function peekAuthRateLimit(options: {
  ip: string;
  email?: string;
  staffOnly?: boolean;
}): Promise<RateLimitResult> {
  const { ipLimiter, emailLimiter } = authLimiters(options.staffOnly);
  return runAuthLimitCheck(ipLimiter, emailLimiter, options, "peek");
}

/** Count a failed login toward IP + email limits. */
export async function recordAuthFailure(options: {
  ip: string;
  email?: string;
  staffOnly?: boolean;
}): Promise<RateLimitResult> {
  const { ipLimiter, emailLimiter } = authLimiters(options.staffOnly);
  return runAuthLimitCheck(ipLimiter, emailLimiter, options, "record");
}

/** Signup / password routes: count every attempt. */
export async function checkAuthRateLimit(options: {
  ip: string;
  email?: string;
  staffOnly?: boolean;
}): Promise<RateLimitResult> {
  return runAuthLimitCheck(signupIpLimiter, signupEmailLimiter, options, "check");
}

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
