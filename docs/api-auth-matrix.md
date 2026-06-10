# API auth matrix

Static expectations for API authorization across all `src/app/api/**/route.ts` handlers. Automated check: `npm run check:api-auth-matrix`.

## Roles

| Role | JWT claim | Panel |
|------|-----------|-------|
| `admin` | staff | `/admin` |
| `manager` | staff + `manager_access_enabled` | `/manager` |
| `owner` | customer + owner assignment + `owner_portal_enabled` | `/owner` |

Server routes are the security boundary; client layouts only improve UX.

## Route categories

| Category | Expected verifier(s) | Examples |
|----------|---------------------|----------|
| `public` | None (may use rate limits) | `/api/vehicles`, `/api/checkout`, `/api/contact` |
| `public-gated` | Env gate | `/api/auth/setup-admin` (`ALLOW_SETUP_ADMIN`) |
| `staff` | `verifyAdmin`, `verifyAdminOrManager`, `verifyManagerWithPanelAccess`, or `getAuthFromRequest` + `tokenHasStaffAccess` | `/api/admin/*`, `/api/manager/*` |
| `admin-only` | `verifyAdmin` on all methods | `/api/admin/blocked-dates`, `/api/admin/managers` |
| `owner` | `verifyOwnerWithPortalAccess` | `/api/owner/*` |
| `webhook` | Shared secret or Stripe signature | `/api/webhooks/turo-email`, `/api/webhooks/stripe` |
| `cron` | `CRON_SECRET` bearer | `/api/cron/reminders` |
| `mixed` | Per-method (documented in script) | `/api/bookings`, `/api/reviews`, `/api/rental-agreement/generate` |
| `staff-auth` | `getAuthFromRequest` (any authenticated user) | `/api/upload-temp`, `/api/bookings/upload` |

## Admin-only GET (panel registry)

Features in `src/lib/admin/panel-registry.ts` with `sharedWithManager: false` use `verifyAdmin` on **GET**:

| Feature | GET routes |
|---------|------------|
| `blockedDates` | `/api/admin/blocked-dates` |
| `finances` | `/api/admin/expenses`, `/api/admin/owner-payouts`, `/api/admin/booking-payments` |
| `managers` | `/api/admin/managers` |
| `owners` | `/api/admin/owners` |
| `bookingActivity` | `/api/admin/booking-activity` |

## High-risk routes

| Route | Auth |
|-------|------|
| `/api/admin/send-password-link` | `verifyAdmin` |
| `/api/rental-agreement/generate` | Signed `token`, matching `email`, or staff JWT |
| `/api/rental-agreement/sign` | Customer email match + rate limit |
| `/api/bookings/override-signature` | `verifyAdmin` |

## Owner routes

All `/api/owner/*` routes use `verifyOwnerWithPortalAccess(req)` (JWT + live `owner_portal_enabled`). Prefer `GET /api/owner/dataset` for consolidated loads.

## Public fleet data

`GET /api/vehicles` and `fetchPublicVehicles()` expose **no VIN or license plate** — see [`public-vehicles.ts`](../src/lib/vehicles/public-vehicles.ts).

## Inventory (85 routes)

Run `API_AUTH_MATRIX_INVENTORY=1 npm run check:api-auth-matrix` for machine-readable JSON. Summary:

- **Public**: 14 routes (vehicles, locations, checkout, contact, auth flows, agreement sign, …)
- **Staff / admin**: 58 routes under `/api/admin` and `/api/manager`
- **Owner**: 8 routes
- **Webhooks**: 2 routes
- **Cron**: 2 routes
- **Mixed**: bookings, reviews, instagram, rental-agreement generate, check-overlap

## CI

```bash
npm run check:api-auth-matrix
```

Fails when a handler lacks the expected verifier for its category, when admin-only GET uses `verifyAdminOrManager`, or when owner routes omit `verifyOwnerWithPortalAccess`.

See also [staff-auth-notes.md](staff-auth-notes.md), [rate-limits.md](rate-limits.md), and [manager-panel-sync.md](manager-panel-sync.md).
