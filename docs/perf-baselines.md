# Performance baselines

Recorded first-load JavaScript budgets for high-traffic routes. Used by `scripts/check-bundle-budget.mjs` (stub) and optional Lighthouse CI.

## Methodology

1. **Production build with analyzer**
   ```bash
   # macOS / Linux
   ANALYZE=true npm run analyze

   # PowerShell
   $env:ANALYZE="true"; npm run analyze
   ```
2. Open the generated report (`.next/analyze/client.html` or terminal output).
3. For each route, note the **First Load JS** total from the Next.js build output (`npm run build` also prints per-route sizes).
4. Record the value in the table below (gzip transfer size ≈ 30–35% of parsed JS; we track **First Load JS (kB)** from the build manifest).
5. Re-baseline after major dependency or route changes. CI may warn when a route exceeds baseline +10%.

### What to measure

| Signal | Tool | Notes |
|--------|------|-------|
| First Load JS | `next build` route table | Primary bundle budget metric |
| LCP / TBT / CLS | Lighthouse CI | Stored as artifacts; no hard fail initially |
| Staff TTI (cold) | Lighthouse or Web Vitals | Target &lt; 4s on throttled mobile for admin routes |

## Baseline targets (placeholders — update after first `ANALYZE=true` run)

These are reasonable starting caps until a real analyze run replaces them.

| Route | First Load JS (kB) | Notes |
|-------|-------------------:|-------|
| `/admin/bookings` | 420 | Shared bookings shell + lazy detail panel |
| `/admin/finances` | 520 | Recharts + tabbed finance UI |
| `/admin/calendar` | 400 | Month grid + lazy timeline |
| `/booking` | 280 | Public wizard; keep under marketing pages |

**Tolerance:** `scripts/check-bundle-budget.mjs` will eventually fail CI at **baseline × 1.10**. Until baselines are measured from a real build, the script exits 0 with a reminder to run analyze.

## Related guardrails

- Staff file line limits: `npm run check:staff-file-size` — hard **600 lines** on `page.tsx`; grandfather shrink caps on mega-pages until Phase 4–6 splits finish (see script header).
- Lighthouse workflow: `.github/workflows/lighthouse.yml` (informational, `continue-on-error: true`).

## Updating baselines

1. Run analyze on `main` after a release candidate build.
2. Edit the table above with measured kB values and today's date in the commit message.
3. Optionally tighten Lighthouse `budget` assertions once variance is understood.
