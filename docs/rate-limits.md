# Rate limits

Distributed rate limiting uses **Upstash Redis** when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.

| Environment | Expected backend |
|-------------|------------------|
| **Vercel production** | Upstash (required — see [vercel-upstash-setup.md](vercel-upstash-setup.md)) |
| Preview / local dev | In-memory fallback when Upstash unset |

Without Upstash in production, each serverless instance rate-limits independently (weaker protection). Startup logs a warning via [`src/instrumentation.ts`](../src/instrumentation.ts).

Implementation: [`src/lib/security/rate-limit.ts`](../src/lib/security/rate-limit.ts).

## Limits by endpoint

| Limiter | Window | Max | Routes |
|---------|--------|-----|--------|
| `loginLimiter` | 15 min | 5 / IP | `POST /api/auth` (login), set-password, reset-password |
| `checkoutLimiter` | 1 hour | 3 / IP | `POST /api/checkout` |
| `contactLimiter` | 1 hour | 2 / IP | `POST /api/contact` |
| `promoLimiter` | 1 hour | 10 / IP | `POST /api/promo-codes/validate` |
| `reviewLimiter` | 1 hour | 5 / IP | `POST /api/reviews` |
| `agreementSignLimiter` | 1 hour | 10 / IP | `POST /api/rental-agreement/sign` |
| `uploadTempLimiter` | 1 hour | 20 / IP | `POST /api/upload-temp` |
| `turoWebhookLimiter` | 1 min | 60 / IP | `POST /api/webhooks/turo-email` |
| `passwordEmailLimiter` | 1 hour | 10 / IP | Admin password email sends |
| `setup-admin` | 24 hours | 3 / IP | `POST /api/auth/setup-admin` |

## Response

Blocked requests return **429** with `Retry-After` and `X-RateLimit-Reset` headers.

## Environment

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

See [`.env.example`](../.env.example).
