# Staff Messaging Rollout

## Required Environment Variables
- `FF_STAFF_MESSAGING_ENABLED` (server)
- `FF_STAFF_MESSAGING_EMAIL_ENABLED` (server)
- `FF_STAFF_MESSAGING_PUSH_ENABLED` (server)
- Optional client mirrors (recommended so the UI can reflect flags without guessing): `NEXT_PUBLIC_FF_STAFF_MESSAGING_*` matching the three above.
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `CRON_SECRET`

### Vercel CLI (non-interactive)
Use explicit values to avoid accidental newline characters in env values:

`npx vercel env add FF_STAFF_MESSAGING_ENABLED production --value true --yes --force`

## Database migration order
1. Apply [`supabase-internal-messaging.sql`](../supabase-internal-messaging.sql) (base tables) if not already applied.
2. Apply [`supabase-internal-messaging-dm-pair.sql`](../supabase-internal-messaging-dm-pair.sql). This migration:
   - Adds `dm_user_id_low` / `dm_user_id_high` on `message_threads` for `thread_type = 'dm'`.
   - Backfills pairs from active memberships (threads with at least two active members).
   - Deletes empty DM threads that still lack a pair (no messages).
   - Runs `staff_merge_duplicate_dm_threads()` once (idempotent) to collapse duplicate DM threads for the same pair.
   - Adds a partial unique index so only one DM row exists per `(low, high)`.
   - Defines RPCs `staff_get_or_create_dm_thread` (race-safe DM open) and `staff_message_thread_unread_counts` (batched unread).
3. If the migration raises an exception about DM rows without a canonical pair, inspect `message_threads` where `thread_type = 'dm'` and pair columns are null (typically invalid membership counts). Fix data, then re-run the migration file from step 2.

## Staged Enablement
1. Set `FF_STAFF_MESSAGING_ENABLED=false` and deploy DB migration + APIs.
2. Set `FF_STAFF_MESSAGING_ENABLED=true` for internal testing accounts.
3. Set `FF_STAFF_MESSAGING_EMAIL_ENABLED=true` once delivery logs are healthy.
4. Set `FF_STAFF_MESSAGING_PUSH_ENABLED=true` after PWA push subscription validation.
5. Keep `/api/cron/message-notifications` scheduled in Vercel cron with `Authorization: Bearer ${CRON_SECRET}`. On Vercel Hobby, crons may only run **once per day** (this repo uses `30 9 * * *` UTC).

### Email / push latency (cron vs instant)
- Outbox rows are written when a message is sent (`notification_outbox` has a unique key on `(message_id, recipient_user_id, channel)` so each recipient receives at most one row per channel per message).
- With **daily** cron on Hobby, email and web push are **not** delivered in real time; they flush when the cron runs next.
- For **near-instant** delivery, either upgrade to a plan that allows frequent crons, schedule the worker externally (e.g. GitHub Actions hitting the cron URL), or add an optional **on-send** path later (invoke the same batch processor from the message POST handler behind a feature flag, keeping cron as a safety net).

## Kill Switches
- Disable all messaging immediately: `FF_STAFF_MESSAGING_ENABLED=false`.
- Keep in-app only (disable external channels):
  - `FF_STAFF_MESSAGING_EMAIL_ENABLED=false`
  - `FF_STAFF_MESSAGING_PUSH_ENABLED=false`

## Monitoring Checklist
- Watch `notification_outbox` counts by `status`.
- Alert if `retry` or `dead` statuses grow abnormally.
- Verify invalid push endpoints are being deactivated (`active=false` in `push_subscriptions`).

## Acceptance checks (staging / production)
1. **DM idempotency:** From admin and manager panels, start a DM with the same peer repeatedly; responses must return the **same** `thread` id (`reused: true` after the first creation).
2. **Titling:** Thread list and header show the **other** participant’s display name (or email fallback); channels still show the stored channel title.
3. **Unread:** After a peer sends a message, only the recipient’s `unread_count` increases; opening the thread clears it; refresh and a second tab stay consistent.
4. **In-panel toast:** With thread A focused, a new inbound message on thread B produces **one** toast per `message_id` within the throttle window; focusing B does not toast for that thread.
5. **Outbox:** No duplicate rows for the same `(message_id, recipient_user_id, channel)` after sends (enforced by DB unique + upsert in the API).
