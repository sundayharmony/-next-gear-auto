import test from "node:test";
import assert from "node:assert/strict";
import {
  createRateLimiter,
  isDistributedRateLimitEnabled,
  loginLimiter,
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
