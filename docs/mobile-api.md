# NGA Admin Mobile API Notes

Native Android uses **Bearer JWT** against the same Next.js `/api/*` routes as the web app. Cookie-based CSRF does not apply when `Authorization: Bearer <access_token>` is present.

## Login (staff tokens in JSON)

`POST /api/auth`

```json
{
  "action": "login",
  "email": "you@example.com",
  "password": "***",
  "client": "native"
}
```

Optional: header `X-NGA-Client: native`.

For **admin** or **manager** accounts, the JSON response includes:

```json
{
  "success": true,
  "data": { "...user fields..." },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

Customer logins omit `tokens` unless the account role is staff (`manager`).

## Refresh

`POST /api/auth/refresh`

Web: refresh cookie only.

Native (no cookies): send the rotated refresh token from the prior login/refresh:

```json
{
  "refreshToken": "...",
  "client": "native"
}
```

Staff responses may include `tokens` with a new pair (same shape as login).

The Android app retries API calls after **401** by posting this body from a separate OkHttp client (no interceptor loop), then replaying the original request with the new access token once.

Proactive refresh runs shortly before the stored access-token expiry (buffer ~2 minutes), using the same refresh endpoint.

Recording booking payments requires an **admin** JWT (`/api/admin/booking-payments` uses admin verification); managers can load booking detail but not mutate payments through those routes.

## Authenticated API calls

Every mutating request (`PATCH`, `POST`, …) should send:

```
Authorization: Bearer <access_token>
```

Session cookies are optional on native; Bearer bypasses CSRF enforcement in `proxy.ts`.

## Booking lifecycle

Status transitions are enforced server-side and mirrored in [`src/lib/bookings/lifecycle.ts`](../src/lib/bookings/lifecycle.ts). Clients must treat error messages and HTTP status codes as authoritative.

## Android app (`android/`)

- Debug builds call **`http://10.0.2.2:3000/`** from the emulator (maps to `localhost:3000` on your dev machine).
- Ensure the Next.js server is listening on **`0.0.0.0`** if needed so the emulator can reach it (default `next dev` usually works with `10.0.2.2`).
