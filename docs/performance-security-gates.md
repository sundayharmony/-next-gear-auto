# Performance and security gates

## API (manual / optional automation)

- Load **GET /api/bookings** with realistic `per_page`, filters, and concurrent staff sessions; watch p95 latency and Supabase query plans.
- Load **PATCH /api/bookings** hotspots during peak transition windows.

## Mobile

- Use **Android Studio Profiler** on Today list scroll and multipart upload.
- Avoid N+1: one detail fetch per opened booking; list uses pagination caps (`per_page` ≤ 200).

## Security checklist (release)

- [ ] No secrets or refresh tokens in Logcat on release builds (HTTP logging debug-only).
- [ ] Tokens in **EncryptedSharedPreferences** (current `TokenStore` pattern).
- [ ] **Bearer** present on mutating calls; CSRF not required for Bearer (`proxy.ts`).
- [ ] Dependency audit: `npm audit`, Gradle dependency check / Play policy.
- [ ] Admin routes tested for **403** when role is wrong (see Jest + manual matrix).

## Staged rollout

- Play Console **staged rollout** (e.g. 5% → 25% → 100%) with Crashlytics or log monitoring between steps.

## Push / real-time (roadmap)

- **FCM** (or equivalent) for booking lifecycle and staff messaging; align with existing web push topics where possible.
