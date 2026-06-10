# QA regression matrix (staff PWA + public site)

Run **full** matrix before major releases; **smoke** (bold rows) weekly on staging.

## Staff PWA

| Area | Case | Admin | Manager | Notes |
|------|------|:-----:|:-------:|-------|
| **Auth** | Cold start logged in | ✓ | ✓ | |
| **Auth** | Token expiry mid-session / refresh | ✓ | ✓ | |
| **Auth** | Logout clears tokens | ✓ | ✓ | |
| Bookings | List load / pagination | ✓ | ✓ | Manager scope per API |
| Bookings | Search / filters | ✓ | partial | |
| **Bookings** | Status transitions match web rules | ✓ | ✓ | incl. agreement before confirm |
| Bookings | Cancel + blocked dates cleanup | ✓ | | |
| **Payments** | List + record payment | ✓ | — | Admin-only API |
| **Documents** | ID + insurance upload limits | ✓ | ✓ | 5MB, MIME whitelist |
| Calendar / week | Sections by pickup date | ✓ | ✓ | |
| Roles | Manager cannot hit admin-only routes | — | ✓ | Expect 403 |

## Public routes (Platform v3 Phase 7)

| Route | Smoke checks | Notes |
|-------|--------------|-------|
| **`/`** | Home loads; featured vehicles render | SSR from Supabase |
| **`/fleet`** | Grid paints without empty flash; category/search/sort work | SSR seed + client filter island (`fleet-client.tsx`) |
| **`/fleet/[id]`** | Detail page, book CTA, gallery | RSC vehicle fetch |
| **`/fleet/comparison`** | Compare 2–3 vehicles from fleet checkboxes | Client; reads `?ids=` |
| **`/booking`** | 7-step wizard: dates → vehicle → extras → details → verify → review → payment | Split under `booking/steps/`; `useBookingWizard` |
| **`/booking/success`** | Post-Stripe confirmation | |
| **`/instagram`** | Grid from admin CRUD posts; embed modal | SSR via `fetchPublicInstagramPosts`; API `GET /api/instagram` |
| **`/about`**, **`/faq`**, **`/location`**, **`/terms`**, **`/privacy`** | Static/marketing content loads | |
| **`/blog`**, **`/blog/[slug]`** | List + article render | |
| **`/week-to-week-contract`** | Contract info page | |

### Fleet performance strategy

Documented in `src/app/(public)/fleet/page.tsx`: server wrapper prefetches published vehicles; interactive filters/compare stay in the client island. Avoids client-only loading skeleton when the database has vehicles.

Record pass/fail and build ID in your external QA tracker.
