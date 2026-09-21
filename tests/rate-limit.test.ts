import test from "node:test";
import assert from "node:assert/strict";
import {
  checkAuthRateLimit,
  createRateLimiter,
  isDistributedRateLimitEnabled,
  loginIpLimiter,
  loginLimiter,
  peekAuthRateLimit,
  recordAuthFailure,
} from "@/lib/security/rate-limit";

test("in-memory rate limiter blocks after max requests", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, prefix: "test" });
  const first = await limiter.check("client-a");
  const second = await limiter.check("client-a");
  const third = await limiter.check("client-a");

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
});

test("loginLimiter uses memory fallback when Upstash unset", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const result = await loginLimiter.check("test-ip-mock");
  assert.equal(typeof result.allowed, "boolean");
  assert.equal(typeof result.resetAt, "number");
});

test("recordAuthFailure tracks IP and email separately", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const ip = `test-ip-${Date.now()}`;
  const emailA = `a-${Date.now()}@example.com`;
  const emailB = `b-${Date.now()}@example.com`;

  for (let i = 0; i < 8; i++) {
    const result = await recordAuthFailure({ ip, email: emailA });
    assert.equal(result.allowed, true, `attempt ${i + 1} for email A should pass`);
  }

  const blockedOnA = await peekAuthRateLimit({ ip, email: emailA });
  assert.equal(blockedOnA.allowed, false, "email A should hit per-email cap");

  const stillAllowedOnB = await peekAuthRateLimit({ ip, email: emailB });
  assert.equal(stillAllowedOnB.allowed, true, "email B should have its own bucket");
});

test("staff login allows more failed attempts than customer login", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const ip = `staff-ip-${Date.now()}`;
  const email = `staff-${Date.now()}@example.com`;

  for (let i = 0; i < 15; i++) {
    const result = await recordAuthFailure({ ip, email, staffOnly: true });
    assert.equal(result.allowed, true, `staff attempt ${i + 1} should pass`);
  }

  const blocked = await peekAuthRateLimit({ ip, email, staffOnly: true });
  assert.equal(blocked.allowed, false, "staff email cap should eventually block");
});

test("peekAuthRateLimit does not consume failed-login attempts", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const ip = `peek-ip-${Date.now()}`;
  const email = `peek-${Date.now()}@example.com`;

  for (let i = 0; i < 20; i++) {
    const result = await peekAuthRateLimit({ ip, email });
    assert.equal(result.allowed, true);
  }

  const afterPeek = await peekAuthRateLimit({ ip, email });
  assert.equal(afterPeek.allowed, true);
  assert.equal(afterPeek.remaining, 8);
});

test("login ip limiter blocks after max failed attempts", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const ip = `legacy-ip-${Date.now()}`;
  for (let i = 0; i < 12; i++) {
    const result = await loginIpLimiter.recordFailure(ip);
    assert.equal(result.allowed, true, `ip attempt ${i + 1} should pass`);
  }

  const blocked = await peekAuthRateLimit({ ip });
  assert.equal(blocked.allowed, false, "ip cap should block after 12 failed attempts");
});

test("checkAuthRateLimit still applies to signup attempts", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const ip = `signup-ip-${Date.now()}`;
  for (let i = 0; i < 12; i++) {
    const result = await checkAuthRateLimit({ ip });
    assert.equal(result.allowed, true);
  }

  const blocked = await checkAuthRateLimit({ ip });
  assert.equal(blocked.allowed, false);
});

test("isDistributedRateLimitEnabled reflects env", () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal(isDistributedRateLimitEnabled(), false);

  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  assert.equal(isDistributedRateLimitEnabled(), true);

  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});
