# Next Gear Auto

Next.js 16 automotive rental platform with admin, manager, and owner staff panels.

## Requirements

- Node.js 22+
- npm 10+

## Setup

```bash
npm ci
cp .env.example .env.local   # copy from repo root — see .env.example for all variables
npm run dev
```

Environment template: [`.env.example`](.env.example) (Supabase, JWT, Stripe, SMTP, feature flags).

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | CI checks + unit tests |
| `npm run analyze` | Bundle analysis — set `ANALYZE=true` before running (see below) |
| `npm run check:panel-sync` | Admin/manager shared UI contract |
| `npm run check:staff-file-size` | Staff file line limits |
| `npm run check:api-auth-matrix` | Admin-only API GET auth |
| `npm run check:bundle-budget` | First Load JS vs [perf baselines](docs/perf-baselines.md) (run after `npm run build`) |

### Bundle analyzer

```bash
# macOS / Linux
ANALYZE=true npm run analyze

# PowerShell
$env:ANALYZE="true"; npm run analyze
```

Baselines: see [docs/perf-baselines.md](docs/perf-baselines.md) (`/admin/bookings`, `/admin/finances`, `/admin/calendar`, `/booking`).

## Environment variables (common)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Server-side Supabase |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |
| `FF_STAFF_MESSAGING_ENABLED` | Internal staff messaging |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | **Required in Vercel production** for distributed rate limits |

See [docs/vercel-upstash-setup.md](docs/vercel-upstash-setup.md) for Upstash on Vercel. Other deployment flags: `docs/` (`owner_portal_enabled`, messaging email/push).

## Documentation

- [Manager panel sync](docs/manager-panel-sync.md)
- [Staff auth notes](docs/staff-auth-notes.md)
- [Turo operations](docs/turo-operations.md)
- [API auth matrix](docs/api-auth-matrix.md)
- [Staff query guide](docs/staff-query-guide.md)
- [Admin quality register](docs/admin-quality-issue-register.md)
- [Performance baselines](docs/perf-baselines.md)
- [Vercel + Upstash rate limits](docs/vercel-upstash-setup.md)
- [Rate limits](docs/rate-limits.md)

## Panels

| Prefix | Role |
|--------|------|
| `/admin` | Full staff admin |
| `/manager` | Operational manager (no finances) |
| `/owner` | Vehicle owner portal |

Shared admin UI is reused in manager routes via `managerPanelConfig` wrappers — see `src/lib/admin/staff-panel-config.ts`.
