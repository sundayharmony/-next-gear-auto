# Google Calendar fleet sync

One-way sync from Next Gear Auto to a single Google Calendar for website bookings, Turo trips, and manual blocked dates.

## Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com) and select your project (or create one).
2. Enable **Google Calendar API**.
3. Configure the **OAuth consent screen** (External is fine for a single business account).
4. Create **OAuth 2.0 Client ID** (Web application).
5. Add authorized redirect URIs:
   - `https://www.rentnextgearauto.com/api/admin/integrations/google-calendar/callback`
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
3. Click **Connect Google Calendar** and approve Calendar access.
4. Pick the fleet calendar if you have more than one writable calendar.
5. Click **Sync now** for the initial backfill.

## What syncs

| Source | Google event |
|--------|----------------|
| Website/manual `bookings` | Customer name + vehicle; pickup/return times; location |
| Turo `blocked_dates` | Guest (Turo) + vehicle; location from email |
| Manual `blocked_dates` | Block reason + vehicle |

Cancelled bookings, cancelled Turo trips, and deleted blocks remove the matching Google event.

Past-ended Turo trips are not pushed (finance-safe). Real-time hooks sync on booking/block changes. Vercel cron reconciles once daily (`0 10 * * *` on Hobby); on Pro you can use `*/15 * * * *` in `vercel.json` for 15-minute reconcile.

## Troubleshooting

- **OAuth state mismatch** â€” connect again while logged in as admin.
- **No refresh token** â€” revoke app access in Google Account â†’ Security â†’ Third-party access, then reconnect.
- **Events missing location** â€” run Turo location backfill; bookings need `pickup_location_name` or a linked `locations` row.

