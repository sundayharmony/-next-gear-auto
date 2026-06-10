# Performance baselines

Recorded first-load JavaScript budgets for high-traffic routes. Enforced by `scripts/check-bundle-budget.mjs` and optional Lighthouse CI.

## Methodology

1. **Production build**
   ```bash
   npm run build
   ```
2. Route sizes are read from `.next/diagnostics/route-bundle-stats.json` (`firstLoadUncompressedJsBytes ÷ 1024`).
3. Optionally open the bundle analyzer report:
   ```bash
   # macOS / Linux
   ANALYZE=true npm run analyze

   # PowerShell
   $env:ANALYZE="true"; npm run analyze
   ```
4. Re-baseline after major dependency or route changes.

### CI enforcement

| Phase | When | Behavior |
|-------|------|----------|
| **Warn** | v4 initial (through 2026-06-09) | `check-bundle-budget` printed warnings, exited 0 |
| **Hard fail** | **2026-06-09 onward** | `npm test` **fails** when any route exceeds baseline × 1.10 |

CI runs `npm run build` before `npm test` so bundle stats exist. Local dev without a build: set `BUNDLE_BUDGET_WARN_ONLY=true` to skip the hard fail.

### What to measure

| Signal | Tool | Notes |
|--------|------|-------|
| First Load JS | `next build` → `route-bundle-stats.json` | Primary bundle budget metric (kB, uncompressed) |
| LCP / TBT / CLS | Lighthouse CI | Phase B: hard-fail thresholds in workflow comments |
| Staff TTI (cold) | Lighthouse or Web Vitals | Target &lt; 4s on throttled mobile for admin routes |
| Real-user vitals | [Vercel Web Vitals](https://vercel.com/docs/speed-insights) | Compare against Lighthouse after deploy |

## Measured baselines (2026-06-09 — post v4 perf work, `npm run build`)

| Route | First Load JS (kB) | Fail above (×1.10) | Notes |
|-------|-------------------:|---------------------:|-------|
| `/` | 582 | 641 | Home + featured fleet grid |
| `/fleet` | 606 | 667 | SSR vehicle list + filter island |
| `/booking` | 638 | 702 | RSC seed + lazy wizard steps |
| `/admin/bookings` | 754 | 829 | Shared bookings shell + lazy detail |
| `/admin/finances` | 1175 | 1293 | Recharts + tabbed finance UI |
| `/admin/calendar` | 742 | 816 | Month grid + lazy timeline |

**Tolerance:** `scripts/check-bundle-budget.mjs` **exits 1** when any route exceeds **baseline × 1.10**.

## Related guardrails

- Staff file line limits: `npm run check:staff-file-size`
- Lighthouse workflow: `.github/workflows/lighthouse.yml` (Phase B thresholds documented in workflow)
- Rate limits (production): [vercel-upstash-setup.md](vercel-upstash-setup.md)

## Updating baselines

1. Run `npm run build` on `main` after a release candidate.
2. Run `npm run check:bundle-budget` and confirm all routes pass at current baselines.
3. If intentional growth (new feature), update the table above with new kB values and today's date.
4. Commit with message like `chore: rebaseline bundle budgets YYYY-MM-DD`.
