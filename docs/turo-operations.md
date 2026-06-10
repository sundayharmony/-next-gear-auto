# Turo operations

How Turo trip data flows into Next Gear Auto and stays consistent across webhook, batch sync, and owner/staff calendars.

## Data model

- Active Turo trips are stored in `blocked_dates` with `source = 'turo-email'` (`TURO_BLOCKED_SOURCE`).
- Cancelled trips use `cancelled_at` or a `[CANCELLED]` reason prefix.
- Staff blocked-dates UI and owner availability treat active Turo rows as **booked** (not owner-removable blocks).

## Ingestion paths

### 1. Email webhook (real-time)

Turo notification emails hit the Gmail forwarder / webhook pipeline, which upserts `blocked_dates` rows and may create linked booking records.

### 2. Batch cancellation sync (CLI / admin)

`src/lib/admin/turo-cancellation-sync.ts` reconciles cancelled trips against overlapping Turo blocks. It uses the shared matcher:

- `pickTuroCancellationMatch` in `src/lib/utils/turo-cancellation-match.ts`

**Rule:** Webhook handlers and batch sync must call the same matcher so a cancellation email and a manual sync pick the same row. See `tests/turo-sync-parity.test.ts`.

### 3. Admin blocked-dates page

Admins view Turo vs manual blocks at `/admin/blocked-dates`. Managers do not have this route (`sharedWithManager: false` in `panel-registry.ts`).

## Matcher behavior (summary)

1. Filter rows overlapping the trip date range for the vehicle.
2. Prefer exact date alignment and guest name match in the `reason` field (`Turo: GuestName`).
3. Refuse to cancel a different guest’s overlapping trip (returns no match).

## Owner portal

`GET /api/owner/availability` merges:

- Confirmed bookings on owner vehicles
- Active Turo blocks (`filterActiveTuroTrips`)

into `bookedRanges` so the availability calendar shows Turo days as red/booked.

## Operational checklist

1. Run DB migrations for `blocked_dates.cancelled_at` if missing.
2. Confirm webhook env vars and Gmail forwarding.
3. After matcher changes, run `npm test` (includes `turo-sync-parity.test.ts`).
4. Spot-check one vehicle: Turo block visible in admin calendar, manager bookings list, and owner availability.

## Related files

| Area | Path |
|------|------|
| Matcher | `src/lib/utils/turo-cancellation-match.ts` |
| Batch sync | `src/lib/admin/turo-cancellation-sync.ts` |
| Block helpers | `src/lib/utils/blocked-dates.ts` |
| Owner availability API | `src/app/api/owner/availability/route.ts` |
| Parity tests | `tests/turo-sync-parity.test.ts` |
