# Turo operations

How Turo trip data flows into Next Gear Auto and stays consistent across webhook, batch sync, and owner/staff calendars.

## Data model

- Active Turo trips are stored in `blocked_dates` with `source = 'turo-email'` (`TURO_BLOCKED_SOURCE`).
- Cancelled trips use `cancelled_at` or a `[CANCELLED]` reason prefix.
- Staff blocked-dates UI and owner availability treat active Turo rows as **booked** (not owner-removable blocks).
- **Webhook and batch sync only write `blocked_dates`.** They do not create or update linked `bookings` records; that remains a future feature if Turo trips need to appear in the bookings list.

## Ingestion paths

### 1. Email webhook (real-time)

Turo notification emails are forwarded from Gmail (Google Apps Script) to the production webhook, which parses the email and upserts `blocked_dates` rows (create, extend, refresh, or cancel).

| Item | Value |
|------|-------|
| Production URL | `https://www.rentnextgearauto.com/api/webhooks/turo-email` |
| Auth | `Authorization: Bearer <TURO_WEBHOOK_SECRET>` (must match Vercel env) |
| Gmail forwarder | `scripts/gmail-turo-forwarder.gs` |
| Forwarder cadence | **Every 15 minutes** (`setup()` installs a time-based trigger on `runTuroSync`) |

#### Single-runner behavior (`runTuroSync`)

`runTuroSync` is the only automatic runner and does all of the following in one quota-safe pass:

1. Incremental Gmail fetch (cursor-based) instead of full historical scans
2. Event classification (`booking`, `extension`, `cancellation`)
3. Webhook forwarding with idempotency headers
4. Bounded accuracy reconciliation refresh (location/time/date completeness checks)
5. Metrics + checkpoint persistence

This prevents the previous quota issue (`Service invoked too many times for one day: gmail`) caused by large `GmailApp.search` loops in normal operation.

Local testing: `npm run turo:post-webhook -- --url http://localhost:3000/api/webhooks/turo-email --file emails.txt`

### 2. Batch cancellation sync (CLI / admin)

`src/lib/admin/turo-cancellation-sync.ts` reconciles cancelled trips against overlapping Turo blocks. It uses the shared matcher:

- `pickTuroCancellationMatch` in `src/lib/utils/turo-cancellation-match.ts`

**Rule:** Webhook handlers and batch sync must call the same matcher so a cancellation email and a manual sync pick the same row. See `tests/turo-sync-parity.test.ts`.

CLI:

```bash
npm run turo:audit                              # row counts, duplicates, cancel-in-reason
npm run turo:sync-cancellations                 # dry-run audit + instructions
npm run turo:sync-cancellations -- --apply      # mark cancellations
npm run turo:sync-cancellations -- --apply --delete --emails-file emails.txt
```

Admin UI: paste a cancellation email on `/admin/blocked-dates`, or `POST /api/admin/blocked-dates/sync-cancellations`.

### 3. Admin blocked-dates page

Admins view Turo vs manual blocks at `/admin/blocked-dates`. The page shows Turo sync status (active/cancelled counts, last ingest time). Managers do not have this route (`sharedWithManager: false` in `panel-registry.ts`).

## Matcher behavior (summary)

1. Filter rows overlapping the trip date range for the vehicle (batch sync also skips already-cancelled rows).
2. Prefer exact date alignment and guest name match in the `reason` field (`Turo: GuestName`).
3. Refuse to cancel a different guest’s overlapping trip (returns no match).

## Owner portal

`GET /api/owner/availability` merges:

- Confirmed bookings on owner vehicles
- Active Turo blocks (`filterActiveTuroTrips`)

into `bookedRanges` so the availability calendar shows Turo days as red/booked.

## Operational checklist

1. Run DB migrations for `blocked_dates.cancelled_at` if missing (`supabase-turo-cancellations.sql`).
2. Confirm `TURO_WEBHOOK_SECRET` in Vercel Production matches `WEBHOOK_SECRET` in the Gmail Apps Script project.
3. Run `setup()` once in Apps Script so the 15-minute `runTuroSync` trigger is active.
4. After matcher changes, run `npm test` (includes `turo-sync-parity.test.ts`).
5. Spot-check one vehicle: Turo block visible in admin calendar, manager bookings list, and owner availability.
6. Periodic audit: `npm run turo:audit` — watch for duplicate active trips or cancel text still in `reason` on active rows.

## Backfill guidance (manual, chunked)

Do **not** use broad historical backfill in automatic triggers.

Use manual chunked backfill helpers in Apps Script:

- `runBookingBackfill30()`
- `runCancellationBackfill30()`

Run them manually in small windows only when needed (e.g., recovery or initial migration), then return to automatic `runTuroSync`.

## Related files

| Area | Path |
|------|------|
| Matcher | `src/lib/utils/turo-cancellation-match.ts` |
| Batch sync | `src/lib/admin/turo-cancellation-sync.ts` |
| Block helpers | `src/lib/utils/blocked-dates.ts` |
| Owner availability API | `src/app/api/owner/availability/route.ts` |
| Webhook | `src/app/api/webhooks/turo-email/route.ts` |
| Gmail forwarder | `scripts/gmail-turo-forwarder.gs` |
| Parity tests | `tests/turo-sync-parity.test.ts` |
