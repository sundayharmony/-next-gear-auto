# Admin Panel Overhaul — Implementation Plan

## Overview
Major admin panel upgrade: booking calendar, Year/Make/Model vehicle restructure, daily-rate-only pricing, full vehicle management with image uploads and spec editing, financial analytics with vehicle-specific expenses, and occupancy tracking.

---

## Phase 1: Vehicle Data Model Restructure (Year/Make/Model + Daily Rate Only)

### 1A. Update Vehicle Type & Data Model
**Files:** `src/lib/types/index.ts`, `src/lib/db/supabase.ts`

- Replace `name: string` with `year: number`, `make: string`, `model: string`
- Add computed display name helper: `"2024 Toyota Camry"`
- Remove `weeklyRate` and `monthlyRate` from `Vehicle` interface
- Keep only `dailyRate`
- Add new fields: `mileage: number`, `licensePlate: string`, `vin: string`, `color: string`, `maintenanceStatus: "good" | "needs-service" | "in-maintenance"`
- Update `DbVehicle` interface to match

### 1B. Update Supabase Schema (SQL)
- ALTER `vehicles` table: add `year`, `make`, `model`, `mileage`, `license_plate`, `vin`, `color`, `maintenance_status` columns
- DROP `weekly_rate`, `monthly_rate` columns
- Migrate existing data: parse "Toyota Camry" → make: "Toyota", model: "Camry", year: 2024
- Update the seed SQL accordingly

### 1C. Update Price Calculator
**Files:** `src/lib/utils/price-calculator.ts`

- Simplify `calculateBaseRate()` to just `days * dailyRate` (remove weekly/monthly logic)
- Update `calculatePricing()` signature to remove weeklyRate/monthlyRate params
- Update `PricingBreakdown` if needed

### 1D. Update Booking Context
**File:** `src/lib/context/booking-context.tsx`

- Update `CALCULATE_PRICING` case to pass only `dailyRate`
- Vehicle type already flows through — just needs the updated type

### 1E. Update vehicles.json (Static Fallback)
**File:** `src/data/vehicles.json`

- Restructure each vehicle with year/make/model fields
- Remove weeklyRate/monthlyRate
- Add placeholder values for mileage, licensePlate, vin, color

### 1F. Update All Vehicle APIs
**Files:** `src/app/api/admin/vehicles/route.ts`, `src/app/api/vehicles/route.ts`

- Update field mapping (Supabase ↔ frontend) for new fields
- Remove weekly_rate/monthly_rate from all queries
- Add year/make/model to insert/update operations

### 1G. Update Public Pages
**Files:** `src/app/(public)/fleet/page.tsx`, `src/app/(public)/fleet/[id]/page.tsx`, `src/app/booking/page.tsx`

- Replace `vehicle.name` with `${vehicle.year} ${vehicle.make} ${vehicle.model}` everywhere
- Remove weekly/monthly rate display from fleet detail sidebar
- Update booking flow vehicle cards

### ✅ Phase 1 Verification
- Visit fleet page → vehicles show Year Make Model
- Visit fleet detail → only daily rate in sidebar
- Complete a test booking → pricing uses daily rate only
- Admin vehicles page loads without errors

---

## Phase 2: Enhanced Vehicle Management Panel

### 2A. Supabase Storage Setup for Vehicle Images
**File:** `src/app/api/admin/vehicles/upload/route.ts` (NEW)

- Create a new API route for image uploads
- Use Supabase Storage (create `vehicle-images` bucket)
- Accept multipart form data, upload to Supabase Storage
- Return public URL of uploaded image
- SQL: Create storage bucket via Supabase dashboard (documented in SQL file)

### 2B. Redesign Admin Vehicles Page
**File:** `src/app/admin/vehicles/page.tsx` (REWRITE)

- **Fleet Overview Cards** at top: total vehicles, available count, in-maintenance count, average daily rate
- **Vehicle Grid/List Toggle**: card view (with photos) or table view
- Each vehicle card shows: image thumbnail, year/make/model, category badge, status indicator (available/rented/maintenance), daily rate, mileage
- **Add Vehicle Form** (slide-out panel or modal):
  - Year, Make, Model (separate fields)
  - Category dropdown
  - Daily Rate
  - Color, License Plate, VIN
  - Mileage
  - Description (textarea)
  - Image upload (drag & drop or file picker)
  - Features (comma-separated or tag input)
  - Full specs editing: passengers, luggage, transmission, fuel type, MPG, doors
- **Edit Vehicle**: Same form pre-filled, inline or modal
- **Delete Vehicle**: Confirmation dialog
- **Toggle Availability**: Quick button
- **Maintenance Status**: Dropdown to set good/needs-service/in-maintenance

### 2C. Vehicle Detail Slide-Out Panel
- Click a vehicle → see full details in a right-side panel
- Shows: all images, full specs, features list, maintenance history placeholder, booking history for that vehicle, financial stats (revenue generated, expense total)

### ✅ Phase 2 Verification
- Add a new vehicle with image upload → appears in fleet
- Edit vehicle specs → changes reflected on public fleet page
- Toggle availability → reflected everywhere
- Set maintenance status → visual indicator updates
- Delete a vehicle → removed from fleet and admin

---

## Phase 3: Booking Calendar (Dual View)

### 3A. Gantt-Style Timeline View
**File:** `src/app/admin/calendar/page.tsx` (NEW)

- Custom-built with Tailwind (no heavy library dependency)
- Y-axis: vehicles (Year Make Model)
- X-axis: dates (scrollable, default to current 2-week window)
- Colored horizontal bars for each booking:
  - Yellow = pending, Green = confirmed, Blue = active, Gray = completed, Red = cancelled
- Hover tooltip: customer name, dates, total price
- Click a booking bar → link to booking detail or open info panel
- Navigation: prev/next week buttons, "Today" button, date range picker
- Filter: by vehicle, by status

### 3B. Month Calendar Grid View
**File:** Same page with toggle

- Traditional month grid (Mon-Sun)
- Each day cell shows booking pills (vehicle name + customer initial)
- Color-coded by status (same scheme as timeline)
- Click a day → expand to see all bookings for that day
- Month navigation (prev/next month)

### 3C. Calendar Toggle & Navigation
- Toggle button: "Timeline" | "Calendar"
- Shared filter controls work for both views
- URL state for selected view and date range

### 3D. Add Calendar to Admin Sidebar
**File:** `src/app/admin/layout.tsx`

- Add "Calendar" nav item between Dashboard and Bookings

### ✅ Phase 3 Verification
- Open calendar → default timeline view shows bookings across vehicles
- Switch to month view → bookings appear on correct days
- Click a booking → shows details
- Navigate weeks/months → data updates
- Filter by vehicle or status → view updates

---

## Phase 4: Financial Analytics Dashboard

### 4A. Expenses Database
**File:** `supabase-expenses-table.sql` (NEW), `src/app/api/admin/expenses/route.ts` (NEW)

- Create `expenses` table:
  - id, vehicle_id (nullable FK), category (maintenance/insurance/fuel/other), amount, description, date, created_at
- API: GET (with filters), POST, PUT, DELETE
- Categories: maintenance, insurance, fuel, cleaning, parking, registration, other

### 4B. Revenue & Analytics API
**File:** `src/app/api/admin/analytics/route.ts` (NEW)

- Endpoint that computes analytics from bookings + expenses:
  - Revenue over time (daily/weekly/monthly aggregation)
  - Revenue per vehicle
  - Expense totals by category
  - Expense per vehicle
  - Profit margins (revenue - expenses)
  - Occupancy rate: (total booked days / total available vehicle-days) per period
  - Average rental duration
  - Most popular vehicles (by booking count)
  - Average revenue per booking

### 4C. Finance Dashboard Page
**File:** `src/app/admin/finances/page.tsx` (NEW)

- **Summary Cards**: Total Revenue, Total Expenses, Net Profit, Avg. Occupancy Rate
- **Revenue Chart**: Bar/line chart showing revenue over time (toggle: daily/weekly/monthly)
  - Use Recharts (already a common Next.js pattern, lightweight)
  - Install: `recharts` npm package
- **Expense Breakdown**: Donut/pie chart by category
- **Revenue Per Vehicle**: Horizontal bar chart
- **Occupancy Heatmap**: Table showing each vehicle's occupancy % per month
- **Recent Expenses Table**: Sortable list with add/edit/delete
- **Expense Entry Form**: Add new expenses with vehicle selection, category, amount, date, description
- **Date Range Filter**: Filter all analytics by custom date range

### 4D. Update Admin Dashboard
**File:** `src/app/admin/page.tsx`

- Add quick financial summary (revenue this month, expenses this month, net profit)
- Add mini occupancy widget
- Link to full finances page

### 4E. Update Admin Sidebar
**File:** `src/app/admin/layout.tsx`

- Add "Finances" nav item with DollarSign icon

### ✅ Phase 4 Verification
- Add several test expenses through the UI → they persist
- Revenue chart shows booking data correctly
- Expense breakdown chart renders accurately
- Occupancy rates calculate correctly (booked days / total days)
- Per-vehicle profit/loss is accurate
- Date range filter updates all charts

---

## Phase 5: Run Previous Fixes & Full Integration Testing

### 5A. Run Supabase SQL
- Execute the SQL from the previous session (promo_codes table, vehicle seeding, admins cleanup)
- Execute new SQL for schema changes (year/make/model migration, expenses table, storage bucket)

### 5B. Full Admin Panel Test Checklist
Manually verify every single feature:

- [ ] Admin login works
- [ ] Dashboard loads with correct stats + financial summary
- [ ] **Calendar**: Timeline view shows bookings, month view works, toggle works, filters work
- [ ] **Vehicles**: Grid/list views, add vehicle with image upload, edit all specs, delete, toggle availability, maintenance status
- [ ] **Bookings**: List with filters, Confirm/Start/Complete/Cancel buttons all work, error banners show on failure
- [ ] **Promo Codes**: CRUD all works via Supabase (not filesystem)
- [ ] **Reviews**: Approve/reject/delete works
- [ ] **Customers**: Search, expandable booking history
- [ ] **Finances**: Revenue chart, expense CRUD, occupancy rates, per-vehicle analytics
- [ ] **Public Fleet Page**: Vehicles show Year Make Model, only daily rate, images display
- [ ] **Booking Flow**: Vehicle pre-selection works, daily-rate-only pricing, checkout completes
- [ ] **No console errors** on any page

---

## File Change Summary

### NEW Files (8):
1. `src/app/admin/calendar/page.tsx` — Booking calendar (timeline + month views)
2. `src/app/admin/finances/page.tsx` — Financial analytics dashboard
3. `src/app/api/admin/expenses/route.ts` — Expenses CRUD API
4. `src/app/api/admin/analytics/route.ts` — Analytics computation API
5. `src/app/api/admin/vehicles/upload/route.ts` — Vehicle image upload API
6. `supabase-admin-overhaul.sql` — All schema changes in one SQL file

### MODIFIED Files (~15):
1. `src/lib/types/index.ts` — Vehicle type restructure
2. `src/lib/db/supabase.ts` — DbVehicle type update
3. `src/lib/utils/price-calculator.ts` — Remove weekly/monthly rate logic
4. `src/lib/context/booking-context.tsx` — Update pricing calculation
5. `src/data/vehicles.json` — Restructure vehicle data
6. `src/app/api/admin/vehicles/route.ts` — New fields + image handling
7. `src/app/api/vehicles/route.ts` — Public API update
8. `src/app/admin/vehicles/page.tsx` — Full redesign
9. `src/app/admin/page.tsx` — Add financial widgets
10. `src/app/admin/layout.tsx` — Add Calendar + Finances to sidebar
11. `src/app/(public)/fleet/page.tsx` — Year/Make/Model display
12. `src/app/(public)/fleet/[id]/page.tsx` — Remove weekly/monthly rates
13. `src/app/booking/page.tsx` — Update vehicle display + pricing
14. `src/app/admin/bookings/page.tsx` — Calendar link integration

### NPM Install:
- `recharts` — For financial charts (lightweight React charting library)

---

## Implementation Order & Batching

**Batch 1** (Phase 1): Vehicle data restructure + daily-rate-only → verify
**Batch 2** (Phase 2): Vehicle management panel redesign + image uploads → verify
**Batch 3** (Phase 3): Booking calendar with both views → verify
**Batch 4** (Phase 4): Financial analytics + expenses → verify
**Batch 5** (Phase 5): Full integration testing + bug fixes

Each batch ends with manual testing before proceeding to the next. This ensures we catch issues early and don't compound bugs across phases.
