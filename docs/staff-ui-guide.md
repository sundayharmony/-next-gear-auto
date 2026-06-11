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

- Prefer `Sheet` (`src/components/ui/sheet.tsx`) for create/edit flows on mobile; right panel at `md+`.
- `CreateBookingShell` wraps `CreateBookingForm` from bookings list and calendar.
- `Modal` for centered confirmations; must keep `role="dialog"` and `aria-modal`.

## Tables and lists

- `AdminTableWrap` around desktop tables; hide low-priority columns below `lg`.
- `AdminEmptyState` for zero-result lists.
- `ListSkeleton` / `DashboardSkeleton` in route `loading.tsx` files.

## Forms

- `FormField` + `formLabelClass` from `@/components/ui/form-field` for consistent labels.

## Toasts

- Fixed toasts on pages with sidebar: `lg:left-64 lg:right-4` so they clear the nav column.
