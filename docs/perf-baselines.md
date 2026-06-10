# Performance baselines

Recorded first-load JavaScript budgets for high-traffic routes. Used by `scripts/check-bundle-budget.mjs` and optional Lighthouse CI.

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
4. Re-baseline after major dependency or route changes. `npm test` runs `check:bundle-budget` and **warns** (does not fail) when a route exceeds baseline +10%.

### What to measure

| Signal | Tool | Notes |
|--------|------|-------|
| First Load JS | `next build` → `route-bundle-stats.json` | Primary bundle budget metric (kB, uncompressed) |
| LCP / TBT / CLS | Lighthouse CI | Stored as artifacts; Phase A informational only |
| Staff TTI (cold) | Lighthouse or Web Vitals | Target &lt; 4s on throttled mobile for admin routes |
| Real-user vitals | [Vercel Web Vitals](https://vercel.com/docs/speed-insights) | Compare against Lighthouse after deploy; production LCP/CLS may differ from CI lab runs |

## Measured baselines (2026-06-09 — `npm run build` on workspace)

| Route | First Load JS (kB) | Notes |
|-------|-------------------:|-------|
| `/` | 584 | Home + featured fleet grid |
| `/fleet` | 602 | SSR vehicle list + filter island |
| `/booking` | 694 | Wizard shell; steps 2–7 lazy-loaded |
| `/admin/bookings` | 763 | Shared bookings shell + lazy detail panel |
| `/admin/finances` | 1186 | Recharts + tabbed finance UI |
| `/admin/calendar` | 752 | Month grid + lazy timeline |

**Tolerance:** `scripts/check-bundle-budget.mjs` warns at **baseline × 1.10** (exits 0).

## Related guardrails

- Staff file line limits: `npm run check:staff-file-size` — hard **600 lines** on `page.tsx`; grandfather shrink caps on mega-pages until Phase 4–6 splits finish (see script header).
- Lighthouse workflow: `.github/workflows/lighthouse.yml` (Phase A: `continue-on-error: true`; Phase B thresholds documented in workflow comments).

## Updating baselines

1. Run `npm run build` on `main` after a release candidate build.
2. Edit the table above with measured kB values and today's date in the commit message.
3. Optionally tighten Lighthouse assertions once variance is understood (see workflow Phase B comments).
