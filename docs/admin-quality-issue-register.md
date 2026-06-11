# Admin-first quality issue register

Living document from the senior cleanup audit. Severity: P0 (blocker) → P3 (nice-to-have).

## Baseline metrics (capture in CI / manual per release)

| Area | Metric | How to measure |
|------|--------|----------------|
| Staff routes | Time to interactive (TTI) on cold load | Lighthouse / Web Vitals — see [perf-baselines.md](perf-baselines.md) |
| Staff routes | First Load JS vs documented kB caps | `ANALYZE=true npm run analyze` + [perf-baselines.md](perf-baselines.md) |
| Messages | `/api/admin/messages/threads` requests per minute with dashboard open | Network tab / server logs |
| Messages | Duplicate polling when on `/admin/messages` or `/manager/messages` | Should be 1× after layout pause |
| Auth | 401 after failed refresh redirects to correct panel (`/admin` vs `/manager`) | Manual |
| A11y | Bottom nav: no `tablist` on route links; active route `aria-current` | axe / manual |

## P0 — Security / reliability

| ID | Issue | Owner | Status |
|----|--------|-------|--------|
| P0-1 | Legacy `x-admin-id` header still sent from `adminFetch` during JWT migration | `admin-fetch.ts`, `admin-check.ts` | **Done** — JWT-only; legacy header path removed (Platform v4 Phase 1) |
| P0-2 | `adminFetch` 401 redirect always `/admin` — wrong for manager sessions | `admin-fetch.ts` | **Done** — `getStaffLoginRedirectPath()` |
| P0-3 | Duplicate `/admin/finances` nav entries (Finances + Analytics label clash) | `panel-registry.ts` | **Done** — analytics is manager-only; `finances` is admin |

## P1 — UX / accessibility

| ID | Issue | Status |
|----|--------|--------|
| P1-1 | Bottom tab bars used `role="tablist"` for route navigation | **Done** — `aria-current="page"` on primary links |
| P1-2 | Calendar status filter buttons missing `aria-pressed` | **Done** — `role="group"` + `aria-pressed` |
| P1-3 | Notifications panel missing dialog semantics | **Done (v5)** — `role="dialog"`, `aria-modal`, Tab trap, Escape, focus restore in `AdminPendingBookingsPlugin.tsx` |
| P1-4 | Manager route errors lacked dedicated boundary | **Done** — [`src/app/manager/error.tsx`](../src/app/manager/error.tsx) |

## P2 — Performance / maintainability

| ID | Issue | Status |
|----|--------|--------|
| P2-1 | Layout unread badge + messages page both poll threads every 15s | **Done** — layout hook disabled on `/admin/messages` and `/manager/messages`; tab-hidden skips ticks |
| P2-2 | Oversized `admin/calendar/page.tsx`, `customers/page.tsx`, etc. | **Partial (v3)** — calendar split (501 lines); customers/finances/vehicles/tickets/maintenance/blocked-dates still grandfathered with shrink caps; see `check-staff-file-size.mjs` |
| P2-3 | Admin vs manager shell duplication | **Done** — `StaffPanelShell` + universal `managerPanelConfig` wrappers (Phase 8) |
| P2-4 | Owner layout triple-fetch (summary + bookings + vehicles) | **Done** — `GET /api/owner/dataset` + single Query in `OwnerDataProvider` |
| P2-5 | Build skipped TypeScript errors | **Done (v3 P10)** — `typescript.ignoreBuildErrors: false`; CI runs `npm run typecheck` |
| P2-6 | No documented bundle baselines | **Done (v3 P10)** — [perf-baselines.md](perf-baselines.md) + optional Lighthouse workflow |

## Platform v3 — closed items

| Phase | Item | Status |
|-------|------|--------|
| P1 | Owner API routes use `verifyOwnerWithPortalAccess()` | **Done** — enforced via `check-api-auth-matrix.mjs` |
| P1 | Manager JWT enforced on `/manager/*` proxy | **Done** |
| P2 | React hook import guard (`useMemo` / `useCallback` runtime crashes) | **Done** — `check-react-hook-imports.mjs` in CI |
| P3 | TanStack Query migration for bookings/calendar/finances hooks | **Done** — `staffKeys`, `useStaffMutation` |
| P4 | Calendar `page.tsx` under 600 lines + lazy timeline/detail | **Done** — 501 lines; `timeline-view` shrink-capped |
| P4–6 | Mega-page module extraction (customers, finances, vehicles, ops) | **Partial** — modules extracted; pages still >600 (grandfather caps) |
| P7 | Messaging split (`thread-list`, `message-composer`, etc.) | **Done** |
| P8 | Manager `panelConfig` wrappers + panel-sync CI | **Done** |
| P9 | Owner dataset API + create-booking form | **Done** |
| P10 | Perf baselines doc, Lighthouse workflow (informational), shrink caps on heavy components | **Done** |
| P10 | Hard 600-line cap on all staff files | **Not yet** — 6 grandfathered pages + 4 shrink-capped components remain |

## Route ownership (admin-first)

| Route prefix | Primary surface |
|--------------|-----------------|
| `/admin/*` | Staff admin panel |
| `/manager/*` | Manager panel (shared pages re-export admin where noted) |

## Platform v5 — closed items

| Phase | Item | Status |
|-------|------|--------|
| P1 | Staff chrome: manager/owner/finances/calendar/tickets use `AdminPageHeader` + `AdminPageBody` | **Done** |
| P2 | Unified `StaffBottomTabBar`; More sheet a11y; calendar New Booking on mobile | **Done** |
| P3 | `Sheet` + `CreateBookingShell` for create booking | **Done** |
| P4 | Customer `xl` master-detail; `AdminPageHeader` on detail | **Done** |
| P5 | `AdminTableWrap`, `AdminEmptyState`, customer sort, finances tab wrap | **Done** |
| P6 | Route skeletons; `StaffPanelError` polish | **Done** |
| P7–P8 | Public mobile/desktop fleet + booking polish | **Done** |
| P9 | `FormField`, `a11y-dialog.test.ts`, quality gates for dialogs | **Done** |
| P10 | `staff-ui-guide.md`, QA matrix v5 rows, Playwright specs | **Done** |

## Next passes

1. Decompose remaining grandfathered admin pages to ≤600 lines; remove `GRANDFATHERED_MAX`.
4. Split `BookingDetailPanel`, `CreateBookingForm`, `InvoicesPageClient`, `timeline-view` below shrink milestones.
5. Run `ANALYZE=true npm run analyze` and replace placeholder values in [perf-baselines.md](perf-baselines.md).
6. Optional Playwright smoke for auth redirect + nav.
