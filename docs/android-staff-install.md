# Android staff app — install & distribution

This project is a **Next.js** site with a **PWA** (`public/manifest.json`, `public/sw.js`). Staff (**admin** and **manager**) use the same web panels (`/admin`, `/manager`) with a shared entry at **`/staff`** (installable home).

## Install from Chrome (Add to Home screen / Install app)

1. Deploy the site over **HTTPS** (e.g. Vercel).
2. On the Android device, open **Chrome** and go to your production URL (e.g. `https://your-domain.com/staff`).
3. Sign in as **admin** or **manager** (optional **staff-only** flow: `https://your-domain.com/login?staff=1` — customers get a clear error instead of reaching `/account`).
4. Install the app:
   - **Chrome menu (⋮) → Install app** or **Add to Home screen** (wording varies by Chrome version).
5. Open the shortcut: it should land on **`/staff`**, which routes you to `/admin` or `/manager` based on role.

### Staff-only login query

- **`/login?staff=1`** — sends `staffOnly: true` to `POST /api/auth`; only **admin** and **manager** can complete login.

## Native / Bearer API usage

- **`Authorization: Bearer <access_token>`** — mutating `POST`/`PATCH`/etc. to `/api/*` **skip CSRF** (see `src/proxy.ts`). Browser sessions still use the CSRF cookie + `x-csrf-token` header (e.g. `adminFetch`).
- **`POST /api/auth`** with `client: "native"` or header **`x-nga-client: native`** — staff responses may include `tokens: { accessToken, refreshToken, ... }` for mobile shells.
- **`POST /api/auth/refresh`** with JSON body `{ "refreshToken": "..." }` — returns rotated tokens in JSON for staff when the refresh cookie is absent.

## Manager access revocation

- Managers must have **`manager_access_enabled`** (and role `manager`) in the `customers` table.
- **`GET /api/auth`**, **`POST /api/auth/refresh`**, and login enforce this so revoked managers cannot keep using old JWTs indefinitely.

## Legacy `x-admin-id` header

- **Disabled by default.** Server-side admin verification only accepts the legacy header if **`ALLOW_LEGACY_ADMIN_HEADER=true`** in the environment (see `verifyAdmin` in `src/lib/auth/admin-check.ts` and `src/proxy.ts`).

## Play Store (Trusted Web Activity) — optional

1. Build a TWA with **Bubblewrap** (or similar) pointing at your **HTTPS** origin and `start_url` (e.g. `/staff`).
2. Replace placeholders in **`public/.well-known/assetlinks.json`** with your Android **applicationId** and **SHA-256 certificate fingerprint** (release signing key).
3. Host that file at **`https://your-domain/.well-known/assetlinks.json`** (Next.js serves `public/` as static files).
4. Upload an **AAB** to Google Play **Internal testing** (or production), add testers by email, and accept the invite on the device to install from Play.

See also: [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started).
