# Staff authentication notes

## Source of truth

- **API routes** enforce authorization (JWT / role checks). Client-side layouts only improve UX; they are not a security boundary.

## Current behavior

- `adminFetch` sends cookies (`credentials: "same-origin"`) and CSRF for mutating requests.
- Staff auth is **JWT-only** (`nga_token` / `nga_refresh` cookies). Legacy `x-admin-id` headers are not accepted (v4).
- Panel routes (`/admin/*`, `/manager/*`, `/owner/*`) return **503** when `JWT_SECRET` is missing or shorter than 32 characters.
- `/admin/*` requires an **admin** role in the JWT; managers are redirected to login.

## Session expiry

- On **401** after a failed refresh, the client clears `nga_user` and redirects using **`getStaffLoginRedirectPath()`** in `admin-fetch.ts`:
  - `/manager/*` → `/manager`
  - `/admin/*` → `/admin`
  - otherwise → `/login`

## Manager vs admin

- Some routes use `verifyAdminOrManager` (JWT). Do not assume legacy header behavior matches across roles.
