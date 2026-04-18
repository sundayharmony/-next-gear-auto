# Staff Messaging Rollout

## Required Environment Variables
- `FF_STAFF_MESSAGING_ENABLED` (server) — master switch for internal messaging APIs.
- `FF_STAFF_MESSAGING_PUSH_ENABLED` (server) — optional; push is **opt-in** (unset = off).
- **Email notifications** (server resolution order):
  1. If `FF_STAFF_MESSAGING_EMAIL_ENABLED` is set (non-empty), that value wins (`true` / `false`).
  2. Else if `NEXT_PUBLIC_FF_STAFF_MESSAGING_EMAIL_ENABLED` is set (non-empty), that value wins (aligns with client bundle flags).
  3. Else (**both unset**), email defaults to **on** when messaging is enabled. Set `FF_STAFF_MESSAGING_EMAIL_ENABLED=false` for in-app-only (no email).
- Optional client mirrors for UI: `NEXT_PUBLIC_FF_STAFF_MESSAGING_*` for the three flags above.
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

## Storage (message photos)
- The **`staff-message-attachments`** bucket is **created automatically** on the first successful photo upload (service role lists buckets, creates the public bucket if missing, then uploads). You do not need to create it manually in the Supabase dashboard unless you prefer to pre-provision it.
- `NEXT_PUBLIC_SUPABASE_URL` must be set so message URLs validate and the UI can load images from your project host.

## Staged Enablement
1. Set `FF_STAFF_MESSAGING_ENABLED=false` and deploy DB migration + APIs.
2. Set `FF_STAFF_MESSAGING_ENABLED=true` for internal testing accounts. Email notifications are **on by default** (unless you set `FF_STAFF_MESSAGING_EMAIL_ENABLED=false` or `NEXT_PUBLIC_FF_STAFF_MESSAGING_EMAIL_ENABLED=false`).
3. Tune email explicitly if needed (`FF_STAFF_MESSAGING_EMAIL_ENABLED` / `NEXT_PUBLIC_…`) once delivery logs are healthy.
4. Set `FF_STAFF_MESSAGING_PUSH_ENABLED=true` after PWA push subscription validation.
5. Keep `/api/cron/message-notifications` scheduled in Vercel cron with `Authorization: Bearer ${CRON_SECRET}`. On Vercel Hobby, crons may only run **once per day** (this repo uses `30 9 * * *` UTC).

### Email / push latency (cron vs instant)
- Outbox rows are created **only for channels that are enabled**: **email** when the resolved email channel is on (see resolution order above); **push** when **`FF_STAFF_MESSAGING_PUSH_ENABLED=true`**. If neither channel is on, no notification jobs are queued for new messages (`notification_outbox` has a unique key on `(message_id, recipient_user_id, channel)` when rows exist).
- The threads API returns **`channels: { email, push }`** so the admin/manager Messages UI can show whether email is actually enabled for this deployment.
- When at least one channel is on, the API **processes matching outbox rows immediately** after each new message (same worker logic as cron), so recipients get email/push without waiting for the cron schedule.
- The **daily** cron on Vercel Hobby still runs as a **backup** for any pending/retry rows (e.g. if immediate send failed or was skipped).

### Email not arriving (troubleshooting)
- Confirm the threads API / Messages page shows **`channels.email: true`**. If email was explicitly disabled, set **`FF_STAFF_MESSAGING_EMAIL_ENABLED=true`** or unset both email vars so the default (on) applies, then **redeploy**. Master flag **`FF_STAFF_MESSAGING_ENABLED`** must be true.
- Production sends use **SMTP**: configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and **`SMTP_PASS`** (required in production for the mailer).
- In Supabase, open **`notification_outbox`** for a test message: rows with **`status = dead`** or **`retry`** include **`last_error`** (e.g. SMTP auth `535`, missing recipient email on the `admins` / `customers` row, or channel disabled).
- Recipients must have a non-empty **email** on their staff record (`admins.email` or manager `customers.email`).

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
