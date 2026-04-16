# Staff Messaging Rollout

## Required Environment Variables
- `FF_STAFF_MESSAGING_ENABLED`
- `FF_STAFF_MESSAGING_EMAIL_ENABLED`
- `FF_STAFF_MESSAGING_PUSH_ENABLED`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `CRON_SECRET`

## Staged Enablement
1. Set `FF_STAFF_MESSAGING_ENABLED=false` and deploy DB migration + APIs.
2. Set `FF_STAFF_MESSAGING_ENABLED=true` for internal testing accounts.
3. Set `FF_STAFF_MESSAGING_EMAIL_ENABLED=true` once delivery logs are healthy.
4. Set `FF_STAFF_MESSAGING_PUSH_ENABLED=true` after PWA push subscription validation.
5. Keep `/api/cron/message-notifications` scheduled in Vercel cron with `Authorization: Bearer ${CRON_SECRET}`.

## Kill Switches
- Disable all messaging immediately: `FF_STAFF_MESSAGING_ENABLED=false`.
- Keep in-app only (disable external channels):
  - `FF_STAFF_MESSAGING_EMAIL_ENABLED=false`
  - `FF_STAFF_MESSAGING_PUSH_ENABLED=false`

## Monitoring Checklist
- Watch `notification_outbox` counts by `status`.
- Alert if `retry` or `dead` statuses grow abnormally.
- Verify invalid push endpoints are being deactivated (`active=false` in `push_subscriptions`).
