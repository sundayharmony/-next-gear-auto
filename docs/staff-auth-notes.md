# Staff authentication notes

## Source of truth

- **API routes** enforce authorization (JWT / role checks). Client-side layouts only improve UX; they are not a security boundary.

## Current behavior

- `adminFetch` sends cookies (`credentials: "same-origin"`) and CSRF for mutating requests.
- During migration, a legacy **`x-admin-id`** header may still be sent when `nga_user` exists in `localStorage`. Prefer completing migration to **JWT-only** and removing this header (see `src/lib/utils/admin-fetch.ts`, `src/lib/auth/admin-check.ts`).

## Session expiry

- On **401** after a failed refresh, the client clears `nga_user` and redirects using **`getStaffLoginRedirectPath()`** in `admin-fetch.ts`:
  - `/manager/*` → `/manager`
  - `/admin/*` → `/admin`
  - otherwise → `/login`

## Manager vs admin

- Some routes use `verifyAdminOrManager` (JWT). Do not assume legacy header behavior matches across roles.
