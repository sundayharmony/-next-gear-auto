# API auth matrix

Static expectations for staff and owner API authorization. Automated check: `npm run check:api-auth-matrix`.

## Roles

| Role | JWT claim | Panel |
|------|-----------|-------|
| `admin` | staff | `/admin` |
| `manager` | staff + `manager_access_enabled` | `/manager` |
| `owner` | customer + owner assignment + `owner_portal_enabled` | `/owner` |

Server routes are the security boundary; client layouts only improve UX.

## Panel registry → API access

Features in `src/lib/admin/panel-registry.ts` with `sharedWithManager: false` are **admin-only UI**. Their primary read APIs should use `verifyAdmin(req)` on **GET**, not `verifyAdminOrManager`.

| Feature | Example GET routes | Expected auth |
|---------|-------------------|---------------|
| `blockedDates` | `/api/admin/blocked-dates` | `verifyAdmin` |
| `finances` | `/api/admin/expenses`, `/api/admin/owner-payouts`, `/api/admin/booking-payments` | `verifyAdmin` |
| `managers` | `/api/admin/managers` | `verifyAdmin` |
| `owners` | `/api/admin/owners` | `verifyAdmin` |
| `vehicles` | `/api/admin/vehicles` | `verifyAdminOrManager` (managers need fleet read for bookings) |
| `marketing` | POST-only campaign send | `verifyAdmin` on mutations |

## Shared with manager

Routes backing `sharedWithManager: true` features may use `verifyAdminOrManager` or `verifyManagerWithPanelAccess` (analytics). Examples:

- `/api/manager/bookings` — manager-scoped list with financial redaction
- `/api/admin/messages/*` — staff messaging
- `/api/admin/customers` — read for shared customers UI

## Owner routes

All `/api/owner/*` routes use `verifyOwner(req)`, which enforces vehicle ownership scope server-side. Consolidated load:

- `GET /api/owner/dataset` — metrics + bookings + vehicles in one call

## High-risk admin-only mutations

Always `verifyAdmin`:

- `/api/admin/send-password-link`
- `/api/admin/blocked-dates` GET (read)
- Manager/owner lifecycle (`/api/admin/managers`, `/api/admin/owners`)

## CI

```bash
npm run check:api-auth-matrix
```

Fails when an admin-only GET handler uses `verifyAdminOrManager` or omits `verifyAdmin`.

See also [staff-auth-notes.md](staff-auth-notes.md) and [manager-panel-sync.md](manager-panel-sync.md).
