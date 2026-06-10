# Upstash Redis on Vercel (production rate limits)

Distributed rate limiting requires Upstash in **production**. Without it, each Vercel serverless instance uses an in-memory window that does not share state across cold starts or regions.

Implementation: [`src/lib/security/rate-limit.ts`](../src/lib/security/rate-limit.ts).

## Option A — Vercel Marketplace integration (recommended)

1. Open the [Vercel project](https://vercel.com/dashboard) for this app.
2. Go to **Storage** → **Create Database** → **Upstash Redis** (or **Browse Marketplace** → Upstash).
3. Name the database (e.g. `nga-rate-limit`) and select a region close to your Vercel deployment (e.g. `us-east-1`).
4. Connect the database to this project. Vercel injects:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. **Redeploy** production (and preview if you want limits in preview too).

## Option B — Manual Upstash console

1. Create a Redis database at [console.upstash.com](https://console.upstash.com/).
2. Copy **REST URL** and **REST Token** from the database details page.
3. In Vercel → **Project** → **Settings** → **Environment Variables**, add for **Production** (and Preview if desired):

   | Name | Value |
   |------|--------|
   | `UPSTASH_REDIS_REST_URL` | `https://….upstash.io` |
   | `UPSTASH_REDIS_REST_TOKEN` | token from Upstash |

4. Redeploy.

## Verify after deploy

1. **Runtime:** Check Vercel function logs on first request. If Upstash is missing in production, [`src/instrumentation.ts`](../src/instrumentation.ts) logs:
   `RATE_LIMIT: Upstash not configured in production — using in-memory fallback`.
2. **Local:** With vars in `.env.local`, `isDistributedRateLimitEnabled()` returns true (see `tests/rate-limit.test.ts`).
3. **Smoke:** Trigger login rate limit (6+ failed logins from same IP in 15 min) — should return 429 with `Retry-After`.

## GitHub Actions (optional)

To exercise distributed limits in CI, add repository secrets:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Then pass them to the `npm run build` / test job env. CI does not require Upstash for builds to pass.

## Limits reference

See [rate-limits.md](rate-limits.md) for per-endpoint windows.
