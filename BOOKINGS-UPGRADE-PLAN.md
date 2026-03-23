# Admin Bookings — Full Upgrade Plan
*Covers: functionality, backend/API, data model, and UI/UX*

## Current State
- **Frontend**: `src/app/admin/bookings/page.tsx` (~1560 lines, single file)
- **API**: `src/app/api/bookings/route.ts` — GET (list/single), POST (create), PATCH (update fields/status)
- **Upload**: `src/app/api/bookings/upload/route.ts` — POST for ID docs and insurance proof
- **DB**: `bookings` table in Supabase with: id, customer_id, customer_name, customer_email, customer_phone, vehicle_id, pickup_date, return_date, pickup_time, return_time, total_price, deposit, status, extras (JSONB), insurance_opted_out, id_document_url, insurance_proof_url, signed_name, agreement_signed_at, rental_agreement_url, created_at
- **Features**: table view, checkboxes + bulk actions, status filters, pagination, create-booking form, detail slide-over with edit mode, document uploads, customer linking, email sending, ticket display, CSV export

---

## Phase 1: Data Model & Backend Upgrades

### 1.1 — Add `notes` Column
```sql
ALTER TABLE bookings ADD COLUMN admin_notes TEXT DEFAULT '';
```
- Update PATCH endpoint to accept `admin_notes`
- Admin can store internal notes per booking (customer called, special requests, etc.)

### 1.2 — Add `payment_method` Column
```sql
ALTER TABLE bookings ADD COLUMN payment_method TEXT DEFAULT 'stripe';
-- Values: 'stripe', 'cash', 'zelle', 'venmo', 'check', 'other'
```
- Track HOW the customer paid — critical for reconciliation
- Update create and edit flows to include payment method selection

### 1.3 — Add `promo_code` and `discount_amount` Columns
```sql
ALTER TABLE bookings ADD COLUMN promo_code TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0;
```
- Currently promo discount is calculated at checkout but not stored with the booking
- Display applied promo code in the detail panel

### 1.4 — Server-Side Search & Filtering on GET
Current GET fetches ALL bookings and filters client-side. Add server-side query params:
```
GET /api/bookings?search=john&status=confirmed&from=2026-03-01&to=2026-03-31&page=1&limit=20&sort=pickup_date&order=desc
```
- `search`: full-text search on customer_name, customer_email, booking ID
- `from`/`to`: pickup date range filter
- `page`/`limit`: server-side pagination (returns `{ data, total, page, totalPages }`)
- `sort`/`order`: column sorting

### 1.5 — Add Activity/Audit Log Table
```sql
CREATE TABLE booking_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'status_changed', 'edited', 'email_sent', 'document_uploaded', 'agreement_signed', 'note_added'
  details JSONB DEFAULT '{}', -- e.g. { "from": "pending", "to": "confirmed" }
  performed_by TEXT, -- admin name or 'system' or 'customer'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_booking_activity_booking_id ON booking_activity(booking_id);
```
- Log every significant event on a booking
- New API: `GET /api/admin/booking-activity?booking_id=xxx`
- Update PATCH to auto-log status changes and edits

### 1.6 — Partial Payment Support
- Currently `deposit` is a single field representing total amount paid
- Add ability to record multiple payments:
```sql
CREATE TABLE booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL, -- 'stripe', 'cash', 'zelle', etc.
  note TEXT DEFAULT '',
  received_at TIMESTAMPTZ DEFAULT NOW()
);
```
- New API: `POST /api/admin/booking-payments` and `GET /api/admin/booking-payments?booking_id=xxx`
- `deposit` column becomes a computed value (sum of all payments)

### 1.7 — Overdue Detection Logic
- Add a computed field or API flag: bookings where `return_date < today AND status = 'active'`
- The GET endpoint should return an `is_overdue: boolean` field
- Optionally add a cron job that sends reminder emails for overdue returns

---

## Phase 2: Core Functionality Upgrades

### 2.1 — Search Bar with Debounce
- Text input above the table: searches customer name, email, vehicle, booking ID
- Uses server-side search (Phase 1.4) with 300ms debounce
- Clear button to reset search

### 2.2 — Date Range Filter
- Date range picker with presets: Today, This Week, This Month, Next 7 Days, Custom
- Combined with status filter for queries like "active bookings this week"
- Stored in URL params so bookmarkable/shareable

### 2.3 — Sortable Columns
- Click column headers to sort: customer name, pickup date, total price, balance, status, created date
- Default: upcoming pickups first (pickup_date ascending for future, descending for past)
- Visual sort indicator (arrow up/down)

### 2.4 — Today's Pickups & Returns Summary
- At the top of the page, show two summary cards:
  - **Today's Pickups**: count + list of bookings being picked up today
  - **Today's Returns**: count + list of bookings due back today
- Click to filter the table to just those bookings

### 2.5 — Overdue Return Alerts
- Bookings where `return_date` is past and status is still "active" get a red "Overdue" badge
- Overdue bookings appear at the top of the table regardless of sort
- Optional: daily email digest of overdue returns to admin

### 2.6 — Duplicate Booking
- "Duplicate" button in detail panel pre-fills the create form with same customer, vehicle, extras
- Only dates need to be changed — great for repeat customers

### 2.7 — Bulk Email
- Extend bulk actions: "Send Confirmation Email" to all selected bookings
- Uses existing `sendBookingConfirmation` mailer

### 2.8 — Print/PDF Booking Summary
- "Print" button in detail panel generates a printable booking summary
- Includes: customer info, vehicle, dates, pricing breakdown, extras, agreement status
- Uses `@react-pdf/renderer` or a simple print CSS stylesheet

---

## Phase 3: UI/UX Improvements

### 3.1 — Compact Date/Time Display
- Current: 4 lines with oversized `text-lg font-bold` times
- New: `Mar 25, 10:00 AM → Mar 28, 10:00 AM` on 1–2 lines
- Add duration badge: "3 days"

### 3.2 — Balance Due Column
- New column: `Balance = total_price - deposit`
- Color coding: green ($0 balance), amber (partial), red (unpaid)
- This is the single most important data point for daily operations

### 3.3 — Row Document/Status Indicators
- Small icons on each table row showing at a glance:
  - ID document uploaded (document icon)
  - Insurance proof uploaded (shield icon)
  - Agreement signed (checkmark icon)
  - Overdue return (warning icon)
  - Has admin notes (note icon)
- Eliminates needing to open the detail panel just to check these

### 3.4 — Status Tracker in Detail Panel
- Horizontal step indicator: `Pending → Confirmed → Active → Completed`
- Current step highlighted; completed steps in green; future steps greyed
- Click a step to advance status (with confirmation dialog)

### 3.5 — Payment Summary Card
- Visual payment card replacing the simple Total/Paid lines:
  - Total, paid, balance due with progress bar
  - Payment method badge
  - List of individual payments (if partial payment support added)
  - "Record Payment" button for cash/Zelle payments

### 3.6 — Notes Section in Detail Panel
- Collapsible textarea for admin notes
- Auto-saves on blur (PATCH to API)
- Shows timestamp of last edit

### 3.7 — Activity Timeline in Detail Panel
- Collapsible section showing chronological events
- Each entry: timestamp, action description, who did it
- E.g., "Mar 20, 2:15 PM — Status changed from pending to confirmed (admin)"

### 3.8 — Row Hover Quick Actions
- Move status-change buttons into a hover-revealed action bar or "..." dropdown
- Reduces visual noise; table feels cleaner

### 3.9 — Sticky Table Header
- Table header stays visible when scrolling through bookings

### 3.10 — Mobile Card Layout
- On small screens, collapse table rows into stacked cards
- Each card: customer name, vehicle, dates, status badge, total/balance
- Tap to open detail panel

---

## Phase 4: Advanced Features

### 4.1 — Kanban Board View
- Switchable view: Table | Kanban
- Kanban columns: Pending | Confirmed | Active | Completed
- Drag-and-drop cards between columns to change status
- Each card shows: customer, vehicle, dates, balance

### 4.2 — Recurring Bookings
- Allow creating a recurring booking template (e.g., customer rents every Mon-Fri)
- Auto-generates future bookings based on the template
- Useful for corporate/long-term customers

### 4.3 — Vehicle Availability Check in Create Form
- When selecting dates in the create form, grey out vehicles that are already booked
- Show a mini-calendar preview of the vehicle's availability
- Prevents double-booking at the admin level

### 4.4 — Customer History Preview
- In the detail panel, show a "Customer History" section:
  - Number of past bookings
  - Total lifetime spend
  - Last booking date
  - Quick link to customer profile

### 4.5 — SMS Notifications
- Add SMS sending capability (Twilio or similar)
- Send pickup reminders, return reminders, and payment confirmations via text
- Toggle per booking: email, SMS, or both

---

## Phase 5: Code Quality & Performance

### 5.1 — Component Decomposition
Split the 1560-line file into focused components:
```
src/app/admin/bookings/
  page.tsx                    -- Main page wrapper + Suspense
  components/
    BookingFilters.tsx         -- Status filter, search, date range
    BookingTable.tsx            -- Table with sortable headers
    BookingRow.tsx              -- Single table row with indicators
    BookingDetailPanel.tsx     -- Slide-over detail view
    BookingEditForm.tsx        -- Edit mode within detail panel
    CreateBookingForm.tsx      -- New booking form
    BulkActionBar.tsx          -- Selected items action bar
    StatusTracker.tsx           -- Step indicator component
    PaymentCard.tsx             -- Payment summary widget
    ActivityTimeline.tsx       -- Audit log display
    TodaySummary.tsx           -- Pickups/returns cards
  hooks/
    useBookings.ts              -- Data fetching + state
    useBookingSearch.ts        -- Debounced search logic
    useBookingSort.ts          -- Sort state management
```

### 5.2 — Server-Side Pagination
- Move from fetching ALL bookings to paginated API calls
- API returns: `{ data: [...], total: 150, page: 1, totalPages: 15 }`
- Client sends: `?page=1&limit=10&status=confirmed&search=...`

### 5.3 — Optimistic Updates
- When changing status, update UI immediately
- Roll back on API failure with error toast
- Much snappier feel

### 5.4 — React Query / SWR
- Replace manual `useState` + `useEffect` fetching with React Query or SWR
- Auto-caching, background refetching, stale-while-revalidate
- Simplifies error/loading state management

---

## Recommended Implementation Order

| # | Item | Effort | Impact | Dependencies |
|---|------|--------|--------|-------------|
| 1 | Search bar (2.1) | Small | High | None |
| 2 | Compact dates + duration badge (3.1) | Small | High | None |
| 3 | Balance column + color coding (3.2) | Small | High | None |
| 4 | Row indicators (3.3) | Small | Medium | None |
| 5 | Add `admin_notes` column (1.1) | Small | Medium | SQL migration |
| 6 | Notes section in detail panel (3.6) | Small | Medium | 1.1 |
| 7 | Add `payment_method` column (1.2) | Small | Medium | SQL migration |
| 8 | Status tracker in detail panel (3.4) | Medium | High | None |
| 9 | Quick status buttons in detail (3.4 click) | Small | Medium | 3.4 |
| 10 | Sortable columns (2.3) | Medium | Medium | None |
| 11 | Overdue detection + alerts (1.7 + 2.5) | Medium | High | None |
| 12 | Today's pickups/returns (2.4) | Medium | High | None |
| 13 | Payment summary card (3.5) | Medium | Medium | 1.2 |
| 14 | Date range filter (2.2) | Medium | Medium | None |
| 15 | Component decomposition (5.1) | Medium | Maintenance | None |
| 16 | Duplicate booking (2.6) | Small | Medium | None |
| 17 | Activity log table (1.5) | Medium | Medium | SQL migration |
| 18 | Activity timeline UI (3.7) | Medium | Medium | 1.5 |
| 19 | Server-side pagination (1.4 + 5.2) | Medium | Scale | None |
| 20 | Kanban view (4.1) | Large | High | None |
| 21 | Vehicle availability in create (4.3) | Medium | Medium | None |
| 22 | Customer history preview (4.4) | Small | Medium | None |
| 23 | Print/PDF summary (2.8) | Medium | Medium | None |
| 24 | Partial payments (1.6) | Large | Medium | SQL migration |
| 25 | Bulk email (2.7) | Small | Medium | None |
| 26 | Mobile card layout (3.10) | Medium | Medium | None |

---

## SQL Migrations Summary
Run these in Supabase SQL editor:

```sql
-- Phase 1.1: Admin notes
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';

-- Phase 1.2: Payment method
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';

-- Phase 1.3: Promo tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Phase 1.5: Activity log
CREATE TABLE IF NOT EXISTS booking_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_activity_booking_id ON booking_activity(booking_id);

-- Phase 1.6: Partial payments (optional, later)
CREATE TABLE IF NOT EXISTS booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL,
  note TEXT DEFAULT '',
  received_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id ON booking_payments(booking_id);
```

---

*Phases 1–3 can be implemented incrementally. Start with items 1–6 for the biggest immediate impact.*
