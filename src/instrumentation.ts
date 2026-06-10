import { isDistributedRateLimitEnabled } from "@/lib/security/rate-limit";

/**
 * Runs once when the Node.js server starts (Vercel serverless cold start).
 * Warns if production is missing Upstash — rate limits fall back to per-instance memory.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const isProduction =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  if (isProduction && !isDistributedRateLimitEnabled()) {
    console.error(
      "[RATE_LIMIT] Upstash not configured in production — using in-memory fallback. " +
        "Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN via Vercel Storage. " +
        "See docs/vercel-upstash-setup.md"
    );
  }
}
