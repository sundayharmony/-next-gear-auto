# Admin-first quality issue register

Living document from the senior cleanup audit. Severity: P0 (blocker) → P3 (nice-to-have).

## Baseline metrics (capture in CI / manual per release)

| Area | Metric | How to measure |
|------|--------|----------------|
| Staff routes | Time to interactive (TTI) on cold load | Lighthouse / Web Vitals |
| Messages | `/api/admin/messages/threads` requests per minute with dashboard open | Network tab / server logs |
| Messages | Duplicate polling when on `/admin/messages` or `/manager/messages` | Should be 1× after layout pause |
| Auth | 401 after failed refresh redirects to correct panel (`/admin` vs `/manager`) | Manual |
| A11y | Bottom nav: no `tablist` on route links; active route `aria-current` | axe / manual |

## P0 — Security / reliability

| ID | Issue | Owner | Status |
|----|--------|-------|--------|
| P0-1 | Legacy `x-admin-id` header still sent from `adminFetch` during JWT migration | `admin-fetch.ts`, `admin-check.ts` | Documented; converge on JWT-only |
| P0-2 | `adminFetch` 401 redirect always `/admin` — wrong for manager sessions | `admin-fetch.ts` | **Done** — `getStaffLoginRedirectPath()` |
| P0-3 | Duplicate `/admin/finances` nav entries (Finances + Analytics label clash) | `panel-registry.ts` | **Done** — analytics is manager-only; `finances` is admin |

## P1 — UX / accessibility

| ID | Issue | Status |
|----|--------|--------|
| P1-1 | Bottom tab bars used `role="tablist"` for route navigation | **Done** — `aria-current="page"` on primary links |
| P1-2 | Calendar status filter buttons missing `aria-pressed` | **Done** — `role="group"` + `aria-pressed` |
| P1-3 | Notifications panel missing dialog semantics | **Partial** — `role="dialog"`, `aria-modal`, labelled title, focus close on open |
| P1-4 | Manager route errors lacked dedicated boundary | **Done** — [`src/app/manager/error.tsx`](../src/app/manager/error.tsx) |

## P2 — Performance / maintainability

| ID | Issue | Status |
|----|--------|--------|
| P2-1 | Layout unread badge + messages page both poll threads every 15s | **Done** — layout hook disabled on `/admin/messages` and `/manager/messages`; tab-hidden skips ticks |
| P2-2 | Oversized `admin/calendar/page.tsx`, `customers/page.tsx`, etc. | Ongoing: extract modules incrementally |
| P2-3 | Admin vs manager shell duplication | Ongoing: shared icon map + tab bar patterns |

## Route ownership (admin-first)

| Route prefix | Primary surface |
|--------------|-----------------|
| `/admin/*` | Staff admin panel |
| `/manager/*` | Manager panel (shared pages re-export admin where noted) |

## Next passes

1. Full JWT migration; remove `x-admin-id`.
2. Focus trap + focus restore for notifications dropdown.
3. Decompose largest admin pages into `hooks/` + `components/`.
4. Optional Playwright smoke for auth redirect + nav.
