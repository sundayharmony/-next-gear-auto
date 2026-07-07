# Google Calendar fleet sync

One-way sync from Next Gear Auto to a single Google Calendar for website bookings, Turo trips, and manual blocked dates.

## Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com) and select your project (or create one).
2. Enable **Google Calendar API**.
3. Configure the **OAuth consent screen**:
   - User type: **External** (fine for a single business account).
   - Publishing status: leave as **Testing** — you do not need Google verification for one fleet calendar.
   - Under **Data access** / **Scopes**, add `.../auth/calendar.events` and `.../auth/calendar.readonly` (or the app will request them on connect).
   - Under **Test users**, add every Google account that will click **Connect Google Calendar** in admin (exact email match).
4. Create **OAuth 2.0 Client ID** (Web application).
5. Add **both** production redirect URIs (www and non-www — OAuth uses whichever host you open admin on):
   - `https://www.rentnextgearauto.com/api/admin/integrations/google-calendar/callback`
   - `https://rentnextgearauto.com/api/admin/integrations/google-calendar/callback`
   - `http://localhost:3000/api/admin/integrations/google-calendar/callback`
6. Copy the client ID and secret into Vercel (**nga** project) and local `.env.local`:

```env
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_ENCRYPTION_KEY=
```

Generate a 32-byte encryption key (hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database

Run [`supabase-google-calendar.sql`](../supabase-google-calendar.sql) in the Supabase SQL editor.

## Connect in admin

1. Deploy with env vars set.
2. Admin â†’ **Google Calendar**.
3. Click **Connect Google Calendar**. If Google shows **"Google hasn't verified this app"**, click **Continue** (not Back to safety) — see [Unverified app warning](#unverified-app-warning) below.
4. Approve Calendar access on the consent screen.
5. Pick the fleet calendar if you have more than one writable calendar.
6. Click **Sync now** for the initial backfill.

## What syncs

| Source | Google event |
|--------|----------------|
| Website/manual `bookings` | Customer name + vehicle; pickup/return times; location |
| Turo `blocked_dates` | Guest (Turo) + vehicle; location from email |
| Manual `blocked_dates` | Block reason + vehicle |

Cancelled bookings, cancelled Turo trips, and deleted blocks remove the matching Google event.

Past-ended Turo trips are not pushed (finance-safe). Real-time hooks sync on booking/block changes. Vercel cron reconciles once daily (`0 10 * * *` on Hobby); on Pro you can use `*/15 * * * *` in `vercel.json` for 15-minute reconcile.

## Unverified app warning

While the OAuth consent screen is in **Testing** mode, Google shows:

> Google hasn't verified this app.

This is **expected** — not a bug in the website. The app requests `calendar.events` (fleet sync) and `calendar.readonly` (pick a fleet calendar), not Google Sign-In for customers.

**What to do:**

1. In Cloud Console → **OAuth consent screen** → **Test users**, confirm your Google account is listed.
2. On the warning screen, click **Continue**.
3. On the next screen, allow Calendar access.

The warning may appear every time you connect; that is normal in Testing mode. To remove it for all users you would need to publish the app and complete Google's verification (usually unnecessary for a single-business calendar).

## Redirect URI checklist

OAuth uses the **same host** you open admin on. The redirect URI must be registered exactly in **Credentials** → your Web client → **Authorized redirect URIs**.

| Where you open admin | Required redirect URI |
|----------------------|------------------------|
| `https://www.rentnextgearauto.com` | `https://www.rentnextgearauto.com/api/admin/integrations/google-calendar/callback` |
| `https://rentnextgearauto.com` | `https://rentnextgearauto.com/api/admin/integrations/google-calendar/callback` |
| `http://localhost:3000` | `http://localhost:3000/api/admin/integrations/google-calendar/callback` |

The admin **Google Calendar** page shows the redirect URI for your current host before you connect. A mismatch causes errors **after** you approve access (redirect or `redirect_uri_mismatch`), not on the unverified-app warning.

## Troubleshooting

- **invalid_client** — the client secret in Vercel does not match Google Cloud. Open **Credentials** → your Web client → **Reset secret**, copy the new value into `GOOGLE_CALENDAR_CLIENT_SECRET` on Vercel (Production), then redeploy.
- **"Google hasn't verified this app"** — expected in Testing mode; add yourself as a test user and click **Continue**.
- **Access blocked: app has not completed verification** — your Google account is not on the test-user list in Cloud Console.
- **OAuth state mismatch** — connect again while logged in as admin.
- **redirect_uri_mismatch** — add the exact callback URL for the host you use (see table above).
- **Request had insufficient authentication scopes** — the app needs both `calendar.events` and `calendar.readonly`. In Cloud Console → **OAuth consent screen** → **Data access**, add those scopes if missing. Then revoke **NGA Fleet Calendar** (or your app name) under [Google Account → Third-party access](https://myaccount.google.com/permissions) and reconnect so Google issues a new refresh token with the full scope set.
- **No refresh token** — revoke app access in Google Account → Security → Third-party access, then reconnect.
- **Events missing location** — run Turo location backfill; bookings need `pickup_location_name` or a linked `locations` row.

