# Staff UI Guide

Conventions for admin, manager, and owner panels (Platform v5).

## Page chrome

- Use `AdminPageHeader` + `AdminPageBody` from `@/components/admin/admin-shell` on every staff route.
- Hero actions use `page-hero-btn-outline` on outline buttons.
- `onBack` on `AdminPageHeader` for in-flow close (customer detail); `backHref` for route navigation.

## Breakpoints

| Context | Breakpoint | Notes |
|---------|------------|--------|
| Staff sidebar / desktop shell | `lg` | Bottom tab bar hidden at `lg+` |
| Calendar agenda vs grid | `sm` | Mobile agenda below `sm` |
| Public marketing nav | `md` | Mobile menu below `md` |
| Customer master-detail | `xl` | List + detail side-by-side |

## Navigation

- One implementation: `StaffBottomTabBar` (`src/components/staff/staff-bottom-tab-bar.tsx`).
- Panel wrappers in `src/components/{admin,manager,owner}/bottom-tab-bar.tsx` only supply tab config.
- More sheet: `role="dialog"`, `aria-labelledby`, focus trap, Escape to close, `aria-current` on active links.

## Overlays

- Prefer `Sheet` (`src/components/ui/sheet.tsx`) with `tier="staff"` for staff modals — sits at `z-[100]`, above the bottom tab bar (`z-[91]`).
- Shared constant: `STAFF_OVERLAY_Z` in `src/components/staff/staff-overlay-z.ts`.
- Side panels: `StaffSidePanel`; centered modals: `StaffCenterModal` (`src/components/staff/staff-overlay.tsx`).
- `CreateBookingShell`: `showClose={false}` — single close control lives in `CreateBookingForm` sticky header.
- Public booking pickers: `BookingPickerOverlay` with `role="dialog"` and focus trap.
- `Modal` for centered confirmations; must keep `role="dialog"` and `aria-modal`.

## Tables and lists

- `AdminTableWrap` around desktop tables; hide low-priority columns below `lg`.
- `AdminEmptyState` for zero-result lists.
- `ListSkeleton` / `DashboardSkeleton` in route `loading.tsx` files.

## Forms

- `FormField` + `formLabelClass` from `@/components/ui/form-field` for consistent labels.
- `BookingFormSectionHeader` from `@/components/forms/booking-form-section-header` for booking form sections.
- `AgendaDateStrip` from `@/components/calendar/agenda-date-strip` for mobile calendar date strips.

## Toasts

- Fixed toasts on pages with sidebar: `lg:left-64 lg:right-4` so they clear the nav column.
