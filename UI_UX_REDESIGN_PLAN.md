# UI/UX Redesign Implementation Plan

## Executive Summary

This document provides a comprehensive audit and implementation plan to redesign the NextGearAuto application's UI/UX across all four dashboards (Admin, Manager, Customer, Owner) while preserving 100% of existing functionality and business logic.

**Goal:** Create a cohesive, premium, enterprise-grade SaaS experience with a unified design language.

**Total Scope:**
- **48 page files** across 5 route groups
- **65 components** across 14 directories
- **800+ Tailwind utility usages** to standardize
- **6 overlay patterns** to consolidate
- **4+ status color systems** to unify

---

# Part 1: Complete UI Audit

## 1.1 Application Structure Overview

### Pages Inventory

| Panel | Route Count | Primary Routes |
|-------|-------------|----------------|
| **Admin** | 22 | Dashboard, Bookings, Invoices, Calendar, Vehicles, Blocked Dates, Maintenance, Locations, Finances, Tickets, Customers, Messages, Managers, Owners, Promo Codes, Reviews, Instagram, Marketing, Google Calendar |
| **Manager** | 16 | Dashboard, Bookings, Invoices, Calendar, Maintenance, Locations, Tickets, Customers, Messages, Promo Codes, Reviews, Instagram, Analytics, Vehicle Details |
| **Customer** | 1 (4 tabs) | Account (Overview, Upcoming, Past Rentals, Profile) + Auth flows + Booking wizard |
| **Owner** | 6 | Dashboard, Calendar, Create Booking, Finance, Availability, Notifications |

### Component Count

| Category | Count | Location |
|----------|-------|----------|
| UI Primitives | 14 | `src/components/ui/` |
| Admin Components | 11 | `src/components/admin/` |
| Staff Components | 6 | `src/components/staff/` |
| Owner Components | 6 | `src/components/owner/` |
| Layout Components | 7 | `src/components/layout/` |
| Domain Components | 15+ | Root `src/components/` |

---

## 1.2 Detailed Inconsistencies Audit

### A. Layout Inconsistencies

| Issue | Location | Description |
|-------|----------|-------------|
| **Page header variations** | All panels | Admin uses `AdminPageHeader` (purple hero), Invoices uses custom header with icon, Customer uses inline `page-hero` section |
| **Content width inconsistency** | Global | Some pages use `max-w-7xl`, others `max-w-4xl`, some have no max-width |
| **Grid column patterns** | All | Stat grids vary: 2-col, 3-col, 4-col, 5-col without clear responsive system |
| **Section spacing** | All | Mix of `space-y-4`, `space-y-6`, custom gaps |
| **Card padding** | All | `p-4`, `p-5`, `p-6` used inconsistently |
| **Master-detail layouts** | Admin | Customers uses `xl:grid-cols-[320px_1fr]`, Invoices uses `flex-col lg:flex-row`, Messages uses `lg:grid-cols-[260px_1fr]` |

### B. Typography Inconsistencies

| Issue | Location | Description |
|-------|----------|-------------|
| **Page titles** | All panels | `text-2xl font-bold` vs `text-3xl font-bold` vs `text-xl font-semibold` |
| **Section titles** | All | `text-lg font-semibold` vs `text-base font-semibold` vs `text-xl font-bold` |
| **Label styles** | Forms | Some use `text-xs uppercase tracking-wide`, others use `text-sm font-medium` |
| **Card titles** | All | `h2`, `h3` tags mixed; varying sizes from `text-base` to `text-xl` |
| **Muted text** | All | `text-gray-500`, `text-gray-600`, `text-gray-400` used interchangeably |

### C. Component Inconsistencies

#### Buttons
| Pattern | Locations | Classes |
|---------|-----------|---------|
| Primary purple | Most | `bg-purple-600 hover:bg-purple-700` |
| Gradient | Some forms | `bg-gradient-to-r from-purple-600 to-purple-500` |
| Outline | Various | `border-gray-200` vs `border-purple-500` vs `border-current` |
| Ghost | Various | `hover:bg-gray-100` vs `hover:bg-purple-50` |

#### Cards
| Pattern | Description |
|---------|-------------|
| `Card` (shadcn) | `rounded-xl border-gray-200 bg-white shadow-sm` |
| `AdminCard` | Same but with padding variants |
| Inline card styles | Some pages use custom `rounded-xl border...` without component |
| Stat cards | Different implementations: `AdminStatCard`, inline styled divs, custom components |

#### Tables
| Page | Implementation |
|------|----------------|
| Bookings | `AdminTableWrap` + custom table with mobile cards |
| Invoices | Inline styled table |
| Promo Codes | Inline table with inline editing |
| Locations | Custom table with `overflow-x-auto` |
| Finance | `AdminTableWrap` desktop + card list mobile |
| Tickets | Card list (no table) |
| Reviews | Card list |
| Customers | Divided list |

#### Modals/Overlays
| Type | Implementation | Used By |
|------|----------------|---------|
| `Modal` | Radix Dialog, bottom sheet mobile | Customer areas |
| `Sheet` | Radix Dialog, side drawer | Admin bookings, customers |
| `StaffCenterModal` | Custom centered modal | Admin invoices, crop |
| `StaffSidePanel` | Custom side panel | Turo trips, maintenance |
| Fixed side panel | Custom `fixed inset-0` | Booking detail |
| Inline expandable | Toggle visibility | Forms, filters |

#### Status Badges
| Implementation | Location |
|----------------|----------|
| `Badge` component (CVA) | Global |
| `OwnerStatusBadge` | Owner panel |
| `PayoutStatusBadge` | Owner finance |
| Inline styled spans | Various |
| `statusColors` utility | Booking tables |

### D. Navigation Inconsistencies

| Issue | Description |
|-------|-------------|
| **Sidebar structure** | Admin has 19 items, Manager has 13, Owner has 5 |
| **Mobile tab count** | Admin: 4 primary + more, Manager: 4 + more, Owner: 4 + more |
| **Active states** | Sidebar uses purple highlight, tabs use underline, pills use bg change |
| **Back navigation** | Some pages use `backHref`, others use browser back, some have no back |
| **Breadcrumbs** | `Breadcrumbs` component exists but rarely used |

### E. Form Inconsistencies

| Issue | Description |
|-------|-------------|
| **Label position** | Above input (most), inline (some selects), floating (none) |
| **Required indicators** | `*` suffix (some), no indicator (most) |
| **Error display** | Inline below field (components), toast (some), banner (some) |
| **Input heights** | `h-11` (standard), `h-10`, `h-9` mixed |
| **Filter patterns** | Pill buttons, select dropdowns, search inputs - not standardized |
| **Submit placement** | Bottom right (most), full width (mobile), inline (some) |

### F. Color Inconsistencies

| Issue | Description |
|-------|-------------|
| **Primary purple** | `purple-600` (#7C3AED), `purple-700`, `header-brand` (#8427f8) |
| **Success green** | `green-100/700` (badges), `green-500` (icons), `emerald-*` (owner) |
| **Warning yellow** | `yellow-100/700`, `amber-100/700` (used interchangeably) |
| **Error red** | `red-100/700`, `red-500` (icons) |
| **Info blue** | `blue-100/700` (active status), `indigo-*` (some stats) |
| **Muted backgrounds** | `gray-50`, `gray-100`, `purple-50` - no clear hierarchy |

### G. Spacing Inconsistencies

| Context | Patterns Found |
|---------|----------------|
| Page padding | `py-6`, `py-8`, `py-6 sm:py-8` |
| Card padding | `p-4`, `p-5`, `p-6`, `px-4 py-3` |
| Section gaps | `space-y-4`, `space-y-6`, `gap-4`, `gap-6` |
| Grid gaps | `gap-2`, `gap-3`, `gap-4`, `gap-6` |
| Button gaps | `gap-1.5`, `gap-2`, `gap-3` |

### H. Interactive State Inconsistencies

| Element | Hover | Focus | Active |
|---------|-------|-------|--------|
| Buttons | Various hover colors | `ring-2 ring-purple-500` | Some have pressed state |
| Cards | Some have `hover:shadow-md` | None consistent | `.admin-card-press` (some) |
| Table rows | `hover:bg-gray-50` vs `hover:bg-purple-50` | None | None |
| List items | Various | None consistent | Background change |
| Nav links | Underline animation | Ring | Background change |

### I. Loading State Inconsistencies

| Pattern | Usage |
|---------|-------|
| `Loader2` spinner | Most common |
| `Skeleton` (UI) | Some components |
| `Skeleton` (Admin) | Dashboard, lists |
| `DashboardSkeleton` | Admin dashboard |
| `ListSkeleton` | Admin lists |
| `FleetLoadingGrid` | Public fleet |
| Loading text | Some buttons |
| Full-page loading | `StaffPanelLoading` |

### J. Empty State Inconsistencies

| Pattern | Usage |
|---------|-------|
| `AdminEmptyState` | Some admin pages |
| `Inbox` icon + text | Inline empty states |
| Custom empty cards | Various |
| No empty state | Some pages just show nothing |

---

# Part 2: Proposed Design System

## 2.1 Design Tokens

### Colors

```css
/* Primary */
--color-primary-50: #f5f3ff;
--color-primary-100: #ede9fe;
--color-primary-200: #ddd6fe;
--color-primary-300: #c4b5fd;
--color-primary-400: #a78bfa;
--color-primary-500: #8b5cf6;
--color-primary-600: #7c3aed;  /* Primary brand */
--color-primary-700: #6d28d9;
--color-primary-800: #5b21b6;
--color-primary-900: #4c1d95;

/* Semantic */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;

/* Neutral */
--color-surface: #ffffff;
--color-surface-subtle: #f9fafb;
--color-surface-muted: #f3f4f6;
--color-border: #e5e7eb;
--color-border-subtle: #f3f4f6;
--color-text: #111827;
--color-text-secondary: #4b5563;
--color-text-muted: #6b7280;
--color-text-subtle: #9ca3af;
```

### Typography Scale

| Token | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| `display-lg` | 36px/2.25rem | 700 | 1.2 | Marketing heroes |
| `display` | 30px/1.875rem | 700 | 1.2 | Page titles |
| `heading-lg` | 24px/1.5rem | 600 | 1.3 | Section headers |
| `heading` | 20px/1.25rem | 600 | 1.4 | Card titles |
| `heading-sm` | 16px/1rem | 600 | 1.5 | Subsection titles |
| `body-lg` | 16px/1rem | 400 | 1.5 | Body large |
| `body` | 14px/0.875rem | 400 | 1.5 | Default body |
| `body-sm` | 13px/0.8125rem | 400 | 1.5 | Secondary text |
| `caption` | 12px/0.75rem | 500 | 1.5 | Labels, hints |
| `overline` | 11px/0.6875rem | 600 | 1.5 | Uppercase labels |

### Spacing Scale

| Token | Value | Use |
|-------|-------|-----|
| `space-0` | 0 | - |
| `space-1` | 4px | Tight gaps |
| `space-2` | 8px | Element gaps |
| `space-3` | 12px | Small gaps |
| `space-4` | 16px | Standard gaps |
| `space-5` | 20px | Medium gaps |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | XL gaps |
| `space-12` | 48px | Page sections |
| `space-16` | 64px | Major sections |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `radius-sm` | 4px | Small elements |
| `radius-md` | 6px | Buttons, inputs |
| `radius-lg` | 8px | Cards, modals |
| `radius-xl` | 12px | Large cards |
| `radius-2xl` | 16px | Mobile sheets |
| `radius-full` | 9999px | Pills, badges, avatars |

### Shadows

| Token | Value | Use |
|-------|-------|-----|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.1)` | Cards |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Dropdowns |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Elevated modals |

### Z-Index Scale

| Token | Value | Use |
|-------|-------|-----|
| `z-base` | 0 | Default |
| `z-dropdown` | 50 | Dropdowns |
| `z-sticky` | 60 | Sticky headers |
| `z-overlay` | 70 | Overlays |
| `z-modal` | 80 | Modals |
| `z-popover` | 90 | Popovers |
| `z-toast` | 100 | Toasts |

---

## 2.2 Component Architecture

### Base Layer (Primitives)

```
src/components/ui/
├── button.tsx          # Button with variants
├── input.tsx           # Text input
├── textarea.tsx        # Multi-line input
├── select.tsx          # Native select
├── checkbox.tsx        # Checkbox
├── radio.tsx           # Radio button
├── switch.tsx          # Toggle switch
├── form-field.tsx      # Label + error wrapper
├── card.tsx            # Card container
├── badge.tsx           # Status badge
├── avatar.tsx          # User avatar
├── skeleton.tsx        # Loading skeleton
├── spinner.tsx         # Loading spinner
├── tooltip.tsx         # Tooltip
├── dropdown.tsx        # Dropdown menu
├── modal.tsx           # Modal dialog
├── sheet.tsx           # Side sheet
├── toast.tsx           # Toast notification
├── pagination.tsx      # Pagination
├── date-picker.tsx     # Date picker
├── tabs.tsx            # Tab navigation
├── accordion.tsx       # Accordion
├── table.tsx           # Data table primitives
└── index.ts            # Barrel export
```

### Composite Layer (Patterns)

```
src/components/patterns/
├── page-header.tsx     # Unified page header
├── page-body.tsx       # Page content wrapper
├── stat-card.tsx       # KPI/metric card
├── data-table.tsx      # Full data table with sorting/filtering
├── filter-bar.tsx      # Filter controls
├── search-input.tsx    # Search with icon
├── status-badge.tsx    # Unified status display
├── empty-state.tsx     # Empty state display
├── error-state.tsx     # Error state display
├── loading-state.tsx   # Loading state display
├── confirm-dialog.tsx  # Confirmation modal
├── form-section.tsx    # Form section with title
├── action-menu.tsx     # Dropdown actions
├── master-detail.tsx   # Master-detail layout
├── card-list.tsx       # Clickable card list
└── index.ts
```

### Layout Layer

```
src/components/layout/
├── app-shell.tsx       # Root app wrapper
├── staff-shell.tsx     # Staff panel shell
├── public-shell.tsx    # Public site shell
├── sidebar.tsx         # Desktop sidebar
├── bottom-nav.tsx      # Mobile bottom nav
├── header.tsx          # Public header
├── footer.tsx          # Public footer
├── page-container.tsx  # Max-width container
└── index.ts
```

### Domain Layer

```
src/components/domain/
├── booking/
│   ├── booking-card.tsx
│   ├── booking-detail.tsx
│   ├── booking-form.tsx
│   └── booking-table.tsx
├── vehicle/
│   ├── vehicle-card.tsx
│   ├── vehicle-gallery.tsx
│   └── vehicle-thumbnail.tsx
├── customer/
│   ├── customer-card.tsx
│   └── customer-detail.tsx
├── invoice/
│   ├── invoice-card.tsx
│   └── invoice-preview.tsx
└── ...
```

---

## 2.3 Standardized Patterns

### Page Layout

```tsx
// Every staff page follows this structure
<PageHeader
  title="Page Title"
  subtitle="Optional description"
  backHref="/parent"
  actions={<Button>Primary Action</Button>}
/>
<PageBody>
  <StatGrid columns={4}>
    <StatCard label="Label" value={value} icon={Icon} />
  </StatGrid>
  
  <Section title="Section Title" actions={<Button size="sm">Action</Button>}>
    {/* Content */}
  </Section>
</PageBody>
```

### Data Table

```tsx
<DataTable
  columns={columns}
  data={data}
  searchPlaceholder="Search..."
  filters={<FilterBar items={filterItems} />}
  pagination={pagination}
  emptyState={<EmptyState icon={Icon} title="No items" />}
  loading={isLoading}
  onRowClick={handleRowClick}
/>
```

### Form Layout

```tsx
<FormSection title="Section Title" description="Optional description">
  <FormField label="Field Label" required error={errors.field}>
    <Input {...register("field")} />
  </FormField>
</FormSection>

<FormActions>
  <Button variant="ghost" onClick={onCancel}>Cancel</Button>
  <Button type="submit" loading={isSubmitting}>Save</Button>
</FormActions>
```

### Modal/Sheet

```tsx
<Modal open={open} onOpenChange={setOpen}>
  <ModalHeader>
    <ModalTitle>Modal Title</ModalTitle>
    <ModalDescription>Optional description</ModalDescription>
  </ModalHeader>
  <ModalBody>
    {/* Content */}
  </ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={close}>Cancel</Button>
    <Button onClick={confirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

### Status Display

```tsx
// Single unified StatusBadge for all statuses
<StatusBadge status="confirmed" />
<StatusBadge status="pending" />
<StatusBadge status="active" />
<StatusBadge status="completed" />
<StatusBadge status="cancelled" />
```

---

# Part 3: Phased Implementation Roadmap

## Phase 0: Foundation (No Visual Changes)

**Duration:** First phase
**Risk Level:** Low

### Tasks:
1. Create design tokens file (`src/styles/tokens.css`)
2. Update Tailwind theme with token references
3. Create new component architecture folders
4. Set up component documentation (Storybook optional)
5. Create migration utilities and helpers

### Files to Create:
- `src/styles/tokens.css`
- `src/components/ui/index.ts` (update barrel)
- `src/components/patterns/index.ts`
- `src/lib/utils/design-system.ts`

### Deliverable:
- Design tokens integrated
- No visual changes to production

---

## Phase 1: Core UI Primitives

**Duration:** Second phase
**Risk Level:** Low-Medium

### Tasks:
1. Standardize `Button` variants and sizes
2. Standardize `Input`, `Textarea`, `Select` styling
3. Standardize `Card` component
4. Standardize `Badge` component
5. Create unified `Skeleton` and `Spinner`
6. Create unified `StatusBadge`
7. Update component exports

### Migration Strategy:
- Create new components alongside existing
- Add deprecation warnings to old components
- Gradually migrate usage

### Testing:
- Visual regression tests on each component
- Accessibility audit (contrast, focus states)

---

## Phase 2: Layout Components

**Duration:** Third phase
**Risk Level:** Medium

### Tasks:
1. Create unified `PageHeader` component
2. Create unified `PageBody` component
3. Standardize `PageContainer`
4. Create `Section` component
5. Create `StatGrid` and `StatCard`
6. Standardize sidebar styling
7. Standardize bottom nav styling

### Migration Order:
1. Admin Dashboard (reference implementation)
2. Manager Dashboard
3. Owner Dashboard
4. Customer Account

### Testing:
- Layout tests at multiple breakpoints
- Navigation flow testing

---

## Phase 3: Data Display Components

**Duration:** Fourth phase
**Risk Level:** Medium-High

### Tasks:
1. Create unified `DataTable` component
2. Create `CardList` component
3. Create `FilterBar` component
4. Create `SearchInput` component
5. Create `EmptyState` component
6. Create `LoadingState` component
7. Standardize `Pagination`

### Migration Order (by complexity):
1. Reviews page (simple list)
2. Instagram page (simple list)
3. Promo Codes (table with inline edit)
4. Locations (simple table)
5. Customers (master-detail)
6. Bookings (complex table + detail panel)
7. Invoices (table + preview panel)
8. Finance (table + charts)

### Testing:
- Data integrity verification
- Sort/filter functionality
- Responsive behavior

---

## Phase 4: Form Components

**Duration:** Fifth phase
**Risk Level:** Medium

### Tasks:
1. Create `FormSection` component
2. Create `FormActions` component
3. Standardize all form field styling
4. Standardize validation display
5. Standardize date picker styling
6. Create form patterns documentation

### Migration Order:
1. Simple forms (Promo Codes, Locations)
2. Medium forms (Maintenance, Tickets)
3. Complex forms (Create Booking, Vehicle Form)

### Testing:
- Form submission flows
- Validation behavior
- Keyboard navigation

---

## Phase 5: Modal & Overlay Components

**Duration:** Sixth phase
**Risk Level:** High

### Tasks:
1. Unify `Modal`, `Sheet`, `StaffCenterModal`, `StaffSidePanel`
2. Create standard modal patterns
3. Create confirmation dialog pattern
4. Standardize overlay animations
5. Ensure proper z-index management

### Migration Order:
1. Simple modals (confirmations)
2. Form modals (Add Customer, Add Owner)
3. Detail panels (Booking Detail, Invoice Preview)
4. Complex overlays (Create Booking Sheet)

### Testing:
- Focus trap testing
- Escape key handling
- Mobile sheet behavior
- Nested overlay handling

---

## Phase 6: Navigation & Shell

**Duration:** Seventh phase
**Risk Level:** High

### Tasks:
1. Unify `StaffPanelShell` styling
2. Standardize sidebar across panels
3. Standardize mobile bottom nav
4. Implement consistent breadcrumbs
5. Standardize active states
6. Update navigation transitions

### Migration:
- Apply to all four panels simultaneously
- Careful testing of navigation flows

### Testing:
- Navigation flow testing
- Mobile gesture testing
- Deep link testing

---

## Phase 7: Page-by-Page Migration

**Duration:** Final phase
**Risk Level:** Medium

### Admin Panel (22 pages)
1. Dashboard
2. Bookings
3. Calendar
4. Vehicles
5. Vehicle Details
6. Blocked Dates
7. Maintenance
8. Locations
9. Finances
10. Tickets
11. Customers
12. Messages
13. Managers
14. Owners
15. Owner Details
16. Promo Codes
17. Reviews
18. Instagram
19. Marketing
20. Invoices
21. Google Calendar

### Manager Panel (14 pages)
- Same components, different config

### Owner Panel (6 pages)
1. Dashboard
2. Calendar
3. Create Booking
4. Finance
5. Availability
6. Notifications

### Customer Panel (1 page, 4 tabs + flows)
1. Account page
2. Booking wizard
3. Auth flows

---

# Part 4: Risks & Dependencies

## Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Extensive testing, feature flags |
| Performance regression | Medium | Performance benchmarking |
| Accessibility regression | Medium | A11y testing at each phase |
| Mobile responsiveness issues | Medium | Cross-device testing |
| Dark mode compatibility | Low | Test with `.admin-dark` at each phase |

## Dependencies

| Dependency | Required For | Status |
|------------|--------------|--------|
| Design token system | All phases | Phase 0 |
| Component library | Phases 1-5 | Phase 1+ |
| Layout system | Phase 6-7 | Phase 2 |
| Testing infrastructure | All phases | Existing |

## Rollback Strategy

1. Each phase should be independently deployable
2. Feature flags for new components
3. Keep old components until migration complete
4. Git tags at each phase completion

---

# Part 5: Recommended Implementation Order

## Priority Matrix

| Phase | Impact | Effort | Priority |
|-------|--------|--------|----------|
| 0. Foundation | Low | Low | 1 |
| 1. Primitives | Medium | Medium | 2 |
| 2. Layout | High | Medium | 3 |
| 3. Data Display | High | High | 4 |
| 4. Forms | Medium | Medium | 5 |
| 5. Modals | Medium | High | 6 |
| 6. Navigation | High | High | 7 |
| 7. Page Migration | High | High | 8 |

## Recommended Sequence

```
Phase 0 (Foundation)
    ↓
Phase 1 (Primitives) ─────┐
    ↓                     │
Phase 2 (Layout) ─────────┤
    ↓                     │ Can run in parallel
Phase 4 (Forms) ──────────┤
    ↓                     │
Phase 3 (Data Display) ───┘
    ↓
Phase 5 (Modals)
    ↓
Phase 6 (Navigation)
    ↓
Phase 7 (Page Migration)
    ├── Admin Dashboard (reference)
    ├── Owner Panel (smallest)
    ├── Manager Panel
    ├── Customer Panel
    └── Remaining Admin Pages
```

---

# Part 6: Success Metrics

## Visual Consistency
- [ ] Single color palette in use
- [ ] Consistent typography scale
- [ ] Uniform spacing throughout
- [ ] Consistent border radius
- [ ] Uniform shadows

## Component Consolidation
- [ ] Single `Button` component (was 4+ patterns)
- [ ] Single `Card` component (was 3+ patterns)
- [ ] Single `Badge` component (was 5+ patterns)
- [ ] Single `Modal/Sheet` system (was 6+ patterns)
- [ ] Single `Table` component (was 6+ patterns)

## Code Quality
- [ ] No duplicate component implementations
- [ ] All components documented
- [ ] All components have types
- [ ] Design tokens used consistently

## User Experience
- [ ] Consistent navigation patterns
- [ ] Predictable interactions
- [ ] Uniform loading states
- [ ] Consistent error handling
- [ ] Accessible to WCAG 2.1 AA

---

# Appendix A: Current Component Duplication Map

| Pattern | Current Implementations | Target |
|---------|------------------------|--------|
| Button | `Button` (CVA), inline styles, gradient variants | 1 component |
| Card | `Card`, `AdminCard`, inline styles | 1 component |
| Badge | `Badge`, `OwnerStatusBadge`, `PayoutStatusBadge`, inline | 1 component |
| Skeleton | `ui/Skeleton`, `admin/Skeleton`, `DashboardSkeleton`, `ListSkeleton` | 1 component + presets |
| Modal | `Modal`, `Sheet`, `StaffCenterModal`, `StaffSidePanel`, custom fixed | 2 components (Modal + Sheet) |
| Table | 6+ different implementations | 1 component |
| Empty State | `AdminEmptyState`, inline patterns | 1 component |
| Page Header | `AdminPageHeader`, custom heroes, inline | 1 component |
| Filter | Pills, selects, search - 10+ patterns | 1 system |

---

# Appendix B: File Changes Summary

## Files to Create (~30)
- Design tokens
- New pattern components
- Updated primitives
- Documentation

## Files to Modify (~100+)
- All page files (gradual migration)
- Existing components (deprecation warnings)
- Layout components

## Files to Eventually Delete (~20)
- Duplicate components
- Old patterns
- Redundant utilities

---

# Part 7: Detailed Phase Checklists

## Phase 0: Foundation - Detailed Checklist

### Pre-Implementation Verification
- [ ] Backup current `globals.css`
- [ ] Document current color usage with screenshots
- [ ] Create baseline performance metrics (Lighthouse scores)
- [ ] Run full test suite and record pass/fail count

### Design Tokens Creation (`src/styles/tokens.css`)

```css
/* Create this file with all tokens */
:root {
  /* Colors - Primary */
  --color-primary-50: #f5f3ff;
  --color-primary-100: #ede9fe;
  --color-primary-200: #ddd6fe;
  --color-primary-300: #c4b5fd;
  --color-primary-400: #a78bfa;
  --color-primary-500: #8b5cf6;
  --color-primary-600: #7c3aed;
  --color-primary-700: #6d28d9;
  --color-primary-800: #5b21b6;
  --color-primary-900: #4c1d95;
  
  /* Colors - Neutral */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  /* Semantic Colors */
  --color-success: #10b981;
  --color-success-light: #d1fae5;
  --color-warning: #f59e0b;
  --color-warning-light: #fef3c7;
  --color-error: #ef4444;
  --color-error-light: #fee2e2;
  --color-info: #3b82f6;
  --color-info-light: #dbeafe;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
  
  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  
  /* Z-Index */
  --z-dropdown: 50;
  --z-sticky: 60;
  --z-overlay: 70;
  --z-modal: 80;
  --z-popover: 90;
  --z-toast: 100;
}
```

### Files to Create
- [ ] `src/styles/tokens.css` - Design tokens
- [ ] `src/lib/design-system/index.ts` - Token exports
- [ ] `src/lib/design-system/colors.ts` - Color utilities
- [ ] `src/lib/design-system/status.ts` - Unified status colors

### Verification Checklist
- [ ] Tokens file created and imported in `globals.css`
- [ ] No visual changes to any page
- [ ] All existing tests still pass
- [ ] Build completes without errors
- [ ] Lighthouse scores unchanged (±5%)

---

## Phase 1: Primitives - Detailed Checklist

### Button Component (`src/components/ui/button.tsx`)

**Current State Analysis:**
- Primary: `bg-purple-600 hover:bg-purple-700`
- Gradient variant exists in some forms
- Ghost: inconsistent hover colors
- Sizes: `h-9`, `h-10`, `h-12`

**Standardization Tasks:**
- [ ] Audit all button usages: `rg "Button" --type tsx -c`
- [ ] Define exactly 5 variants: `primary`, `secondary`, `outline`, `ghost`, `danger`
- [ ] Define exactly 3 sizes: `sm` (h-8), `default` (h-10), `lg` (h-12)
- [ ] Standardize border radius to `rounded-lg`
- [ ] Add loading state with spinner
- [ ] Add disabled styles

**New Button Spec:**
```tsx
variants: {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  outline: "border border-gray-300 bg-white hover:bg-gray-50",
  ghost: "hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700"
}
sizes: {
  sm: "h-8 px-3 text-sm",
  default: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
}
```

### Input Component (`src/components/ui/input.tsx`)

**Standardization Tasks:**
- [ ] Standardize height to `h-10`
- [ ] Standardize border radius to `rounded-lg`
- [ ] Standardize border color to `border-gray-300`
- [ ] Standardize focus ring to `ring-2 ring-primary-500`
- [ ] Add consistent error state styling
- [ ] Remove `bg-gray-50` default (use `bg-white`)

### Badge Component (`src/components/ui/badge.tsx`)

**Current Implementations to Consolidate:**
1. `Badge` (CVA) - 6 variants
2. `OwnerStatusBadge` - hardcoded colors
3. `PayoutStatusBadge` - hardcoded colors
4. Inline status badges in tables
5. `statusColors` utility

**Unified Status Badge Spec:**
```tsx
const statusVariants = {
  // Booking statuses
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  active: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  "no-show": "bg-orange-100 text-orange-800 border-orange-200",
  
  // Payment statuses
  paid: "bg-green-100 text-green-800 border-green-200",
  unpaid: "bg-red-100 text-red-800 border-red-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  
  // Generic
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
  default: "bg-gray-100 text-gray-700 border-gray-200"
}
```

### Card Component (`src/components/ui/card.tsx`)

**Consolidation Tasks:**
- [ ] Merge `Card` and `AdminCard` into single component
- [ ] Add `padding` prop: `none`, `sm`, `md`, `lg`
- [ ] Add `hover` prop for interactive cards
- [ ] Standardize: `rounded-xl border border-gray-200 bg-white shadow-sm`

### Skeleton Component

**Consolidation Tasks:**
- [ ] Merge `ui/Skeleton` and `admin/Skeleton`
- [ ] Create preset configurations:
  - `SkeletonCard`
  - `SkeletonTable`
  - `SkeletonList`
  - `SkeletonDashboard`

### Phase 1 Testing Checklist

**Visual Regression:**
- [ ] Screenshot all button states on Admin Dashboard
- [ ] Screenshot all input states on Create Booking form
- [ ] Screenshot all badge states on Bookings page
- [ ] Compare before/after

**Functional Testing:**
- [ ] All forms submit correctly
- [ ] All buttons trigger correct actions
- [ ] Loading states display correctly
- [ ] Error states display correctly

**Accessibility Testing:**
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus states visible on all interactive elements
- [ ] Button labels are descriptive
- [ ] Form labels associated correctly

---

## Phase 2: Layout - Detailed Checklist

### PageHeader Component

**Files Using Custom Headers (to migrate):**
```
src/app/admin/page.tsx - AdminPageHeader
src/app/admin/invoices/InvoicesPageClient.tsx - Custom header
src/app/account/page.tsx - inline page-hero
src/app/booking/page.tsx - inline page-hero
```

**Unified PageHeader Spec:**
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  variant?: 'default' | 'compact' | 'hero';
}
```

### PageBody Component

**Standardization:**
- [ ] Consistent padding: `py-6 sm:py-8`
- [ ] Consistent max-width: `max-w-7xl`
- [ ] Consistent horizontal padding: `px-4 sm:px-6 lg:px-8`
- [ ] Add `narrow` prop for `max-w-4xl`

### StatGrid Component

**Current Patterns Found:**
```
grid-cols-2 md:grid-cols-3 lg:grid-cols-5  (Admin Dashboard)
grid-cols-2 sm:grid-cols-3 lg:grid-cols-4  (Vehicles)
grid-cols-2 sm:grid-cols-4                  (Account)
grid-cols-2 md:grid-cols-4                  (Manager Dashboard)
```

**Standardized StatGrid:**
```tsx
interface StatGridProps {
  columns?: 2 | 3 | 4 | 5;
  children: React.ReactNode;
}

// Always uses responsive breakpoints:
// 2 cols → sm:2 md:3 lg:{columns}
```

### Section Component

**Spec:**
```tsx
interface SectionProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
}
```

### Phase 2 Testing Checklist

**Layout Testing:**
- [ ] Test all pages at 320px width (mobile)
- [ ] Test all pages at 768px width (tablet)
- [ ] Test all pages at 1024px width (laptop)
- [ ] Test all pages at 1440px width (desktop)
- [ ] Test all pages at 1920px width (large desktop)

**Responsive Behavior:**
- [ ] No horizontal scroll at any breakpoint
- [ ] Text remains readable at all sizes
- [ ] Touch targets ≥44px on mobile
- [ ] Proper spacing maintained

---

## Phase 3: Data Display - Detailed Checklist

### DataTable Component

**Current Table Implementations:**
1. `AdminTableWrap` + custom table (Bookings)
2. Inline table (Invoices, Locations, Promo Codes)
3. Card list (Tickets, Reviews, Customers)
4. Timeline grid (Calendar)

**Unified DataTable Spec:**
```tsx
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string;
  emptyState?: React.ReactNode;
  
  // Sorting
  sortable?: boolean;
  defaultSort?: { column: string; direction: 'asc' | 'desc' };
  
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  
  // Pagination
  pagination?: {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  
  // Row interaction
  onRowClick?: (row: T) => void;
  
  // Mobile
  mobileCard?: (row: T) => React.ReactNode;
}
```

### Table Migration Order (by complexity)

| Priority | Page | Current Pattern | Columns | Complexity |
|----------|------|-----------------|---------|------------|
| 1 | Reviews | Card list | 5 fields | Low |
| 2 | Instagram | Card list | 4 fields | Low |
| 3 | Managers | List items | 4 fields | Low |
| 4 | Promo Codes | Table + inline edit | 6 cols | Medium |
| 5 | Locations | Table | 6 cols | Medium |
| 6 | Maintenance | Table + detail panel | 7 cols | Medium |
| 7 | Customers | Master-detail list | Complex | High |
| 8 | Bookings | Table + filters + detail | 9 cols | High |
| 9 | Invoices | Table + preview | 7 cols | High |
| 10 | Finance | Tabs + tables + charts | Multiple | Very High |

### FilterBar Component

**Current Filter Patterns:**
- Pill buttons (Bookings status)
- Select dropdowns (Vehicle filter)
- Search input (Customers)
- Date range (Finance)

**Unified FilterBar Spec:**
```tsx
interface FilterBarProps {
  filters: FilterItem[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onClear?: () => void;
}

type FilterItem = 
  | { type: 'pills'; key: string; options: { value: string; label: string }[] }
  | { type: 'select'; key: string; options: { value: string; label: string }[]; placeholder?: string }
  | { type: 'search'; key: string; placeholder?: string }
  | { type: 'date'; key: string; label?: string }
  | { type: 'dateRange'; startKey: string; endKey: string };
```

### Phase 3 Testing Checklist

**Data Integrity:**
- [ ] All table data displays correctly
- [ ] Sorting works in both directions
- [ ] Filtering returns correct results
- [ ] Pagination shows correct page counts
- [ ] Search returns expected matches

**Interaction Testing:**
- [ ] Row click opens correct detail
- [ ] Bulk selection works
- [ ] Bulk actions apply to selected items
- [ ] Empty state shows when no data
- [ ] Loading state shows during fetch

---

## Phase 4: Forms - Detailed Checklist

### Form Inventory

| Page | Form Name | Fields | Validation |
|------|-----------|--------|------------|
| Marketing | Campaign | subject, bodyHtml, recipients | Required checks |
| Promo Codes | Create/Edit | code, type, value, min, max, expires | Code unique, value > 0 |
| Locations | Add/Edit | name, address, city, state, zip, lat, lng, surcharge | Name + address required |
| Maintenance | Add/Edit | vehicle, title, desc, status, cost, dates, photos | Vehicle + title required |
| Tickets | Add/Edit | booking, vehicle, plate, type, date, amount, status | Date required, amount ≥ 0 |
| Managers | Add/Edit | name, email, phone | Name + email required |
| Owners | Add | name, email, phone, password | Name + email required |
| Vehicles | Add/Edit | 20+ fields | Make, model, year required |
| Bookings | Create | 15+ fields | Complex validation |
| Customer | Profile | name, phone, dob | Name required |

### FormSection Component

```tsx
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

// Usage:
<FormSection title="Vehicle Information" description="Basic details">
  <FormField label="Make" required>
    <Input {...register('make')} />
  </FormField>
</FormSection>
```

### FormActions Component

```tsx
interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  align?: 'left' | 'right' | 'between';
}

// Renders consistently:
// - Cancel on left (ghost variant)
// - Submit on right (primary variant)
// - Full-width on mobile
```

### Validation Display Standardization

**Current Patterns:**
- Inline below field (Input component)
- Toast notification (some forms)
- Banner at top (AdminStatusBanner)
- Field highlight only (no message)

**Standardized Approach:**
1. Field-level errors: Inline below field with red text
2. Form-level errors: Banner at top of form
3. Success: Toast notification
4. All errors must be announced to screen readers

### Phase 4 Testing Checklist

**Form Submission:**
- [ ] All required field validation works
- [ ] Error messages display correctly
- [ ] Submit button disables during submission
- [ ] Success feedback displays
- [ ] Form resets after successful submission (where applicable)

**Keyboard Navigation:**
- [ ] Tab order is logical
- [ ] Enter submits form
- [ ] Escape cancels (where applicable)
- [ ] Focus moves to first error on validation fail

**Accessibility:**
- [ ] All inputs have associated labels
- [ ] Required fields marked with `aria-required`
- [ ] Error fields have `aria-invalid`
- [ ] Error messages linked with `aria-describedby`

---

## Phase 5: Modals - Detailed Checklist

### Modal Inventory

| Component | Type | Used By | Z-Index |
|-----------|------|---------|---------|
| `Modal` | Center/bottom | Customer areas | 80 |
| `Sheet` | Side drawer | Admin bookings, customers | 80 |
| `StaffCenterModal` | Center | Invoices, crop | 100 |
| `StaffSidePanel` | Side | Turo, maintenance | 100 |
| Fixed side panel | Custom | Booking detail | 100 |
| Inline expandable | Toggle | Forms, filters | N/A |

### Consolidated Modal System

**Two Components:**

1. **Modal** - For dialogs, confirmations, forms
```tsx
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  preventClose?: boolean;
}
```

2. **Sheet** - For detail panels, forms
```tsx
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
```

### Migration Mapping

| Current | Target | Notes |
|---------|--------|-------|
| `Modal` | `Modal` | Keep |
| `Sheet` | `Sheet` | Enhance |
| `StaffCenterModal` | `Modal` | Migrate |
| `StaffSidePanel` | `Sheet` | Migrate |
| Fixed side panel | `Sheet` | Migrate |
| `window.confirm` | `ConfirmDialog` | New component |

### Phase 5 Testing Checklist

**Modal Behavior:**
- [ ] Opens with animation
- [ ] Closes on backdrop click (unless preventClose)
- [ ] Closes on Escape key
- [ ] Focus trapped inside modal
- [ ] Focus returns to trigger on close

**Mobile Behavior:**
- [ ] Bottom sheet on mobile (Modal)
- [ ] Full-width on mobile (Sheet side="right")
- [ ] Safe area padding at bottom
- [ ] Swipe to close works

**Accessibility:**
- [ ] `role="dialog"` present
- [ ] `aria-modal="true"` present
- [ ] `aria-labelledby` points to title
- [ ] Background content inert

---

## Phase 6: Navigation - Detailed Checklist

### Navigation Inventory

| Panel | Sidebar Items | Mobile Primary | Mobile More |
|-------|---------------|----------------|-------------|
| Admin | 19 | 4 | 15 |
| Manager | 13 | 4 | 9 |
| Owner | 5 | 4 | 1 |

### Sidebar Standardization

**Consistent Styling:**
- Width: `w-64`
- Background: `bg-gray-900`
- Item padding: `px-3 py-2.5`
- Active state: `bg-gray-800 text-white`
- Hover state: `hover:bg-gray-800`
- Icon size: `h-5 w-5`
- Gap between icon and label: `gap-3`

### Bottom Nav Standardization

**Consistent Styling:**
- Height: `h-16`
- Background: `bg-white border-t`
- Active indicator: Purple dot or bar
- Icon size: `h-6 w-6`
- Label: `text-xs`

### Active State Unification

**Current Patterns:**
- Background change
- Text color change
- Underline
- Border
- Icon fill

**Standardized:**
- Sidebar: Background + text color
- Bottom nav: Icon color + indicator
- Tabs: Background pill

### Phase 6 Testing Checklist

**Navigation Flow:**
- [ ] All nav links work
- [ ] Active state shows on current page
- [ ] Deep links work correctly
- [ ] Back navigation works
- [ ] Breadcrumbs show correct path

**Mobile Navigation:**
- [ ] Bottom nav shows on mobile
- [ ] More menu opens/closes
- [ ] All items accessible
- [ ] Swipe back gesture works

---

## Phase 7: Page Migration - Detailed Checklist

### Per-Page Migration Checklist Template

For each page:

**Pre-Migration:**
- [ ] Screenshot current state (desktop + mobile)
- [ ] Document all components used
- [ ] Document all API calls
- [ ] Document all state management
- [ ] Identify any page-specific logic

**Migration:**
- [ ] Replace page header with `PageHeader`
- [ ] Replace page body with `PageBody`
- [ ] Replace cards with unified `Card`
- [ ] Replace tables with `DataTable`
- [ ] Replace forms with `FormSection`/`FormField`
- [ ] Replace modals with unified `Modal`/`Sheet`
- [ ] Replace badges with `StatusBadge`
- [ ] Replace loading states with `LoadingState`
- [ ] Replace empty states with `EmptyState`

**Post-Migration:**
- [ ] Compare screenshots before/after
- [ ] Test all functionality
- [ ] Test all API calls
- [ ] Test all form submissions
- [ ] Test all navigation
- [ ] Run accessibility audit
- [ ] Run performance audit

### Admin Dashboard Migration (Reference Implementation)

**Current Components:**
- `AdminPageHeader`
- `AdminPageBody`
- `AdminStatCard` × 5
- `AdminCard`
- `AdminSection`
- Custom booking cards
- `Button`, `Badge`

**Migration Tasks:**
- [ ] Keep `AdminPageHeader` (it becomes the standard)
- [ ] Replace stat grid with `StatGrid`
- [ ] Replace highlight columns with `Section`
- [ ] Replace booking cards with `CardList`
- [ ] Standardize all colors to tokens
- [ ] Standardize all spacing to tokens

### Owner Panel Migration (Smallest - Good Test)

**Pages:**
1. Dashboard - Stats, chart, recent bookings
2. Calendar - Month grid, booking list
3. Create Booking - Multi-field form
4. Finance - Filters, table, cards
5. Availability - Form, calendar, list
6. Notifications - List with read state

**Estimated Complexity:** Low-Medium

### Customer Account Migration

**Sections:**
1. Overview tab - Stats, highlight card
2. Upcoming tab - Booking cards, actions
3. Past tab - Booking cards, review form
4. Profile tab - Edit form, documents

**Special Considerations:**
- Uses public site chrome (header/footer)
- Tab navigation is client-side state
- Must maintain auth gate logic

---

# Part 8: Testing Requirements

## Test Categories

### 1. Unit Tests
- [ ] All new components have unit tests
- [ ] All utility functions have unit tests
- [ ] Minimum 80% code coverage on new code

### 2. Integration Tests
- [ ] Form submission flows
- [ ] Data fetching and display
- [ ] Navigation flows
- [ ] Modal open/close cycles

### 3. Visual Regression Tests
- [ ] Screenshot comparison for all pages
- [ ] Screenshot comparison for all components
- [ ] Threshold: <1% pixel difference

### 4. Accessibility Tests
- [ ] axe-core audit passes on all pages
- [ ] Keyboard navigation works everywhere
- [ ] Screen reader testing (VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA

### 5. Performance Tests
- [ ] Lighthouse Performance score ≥ 80
- [ ] Lighthouse Accessibility score ≥ 90
- [ ] Core Web Vitals in green
- [ ] Bundle size not increased >10%

### 6. Cross-Browser Tests
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### 7. Responsive Tests
- [ ] 320px (small mobile)
- [ ] 375px (iPhone)
- [ ] 428px (iPhone Pro Max)
- [ ] 768px (tablet)
- [ ] 1024px (small laptop)
- [ ] 1280px (laptop)
- [ ] 1440px (desktop)
- [ ] 1920px (large desktop)

---

# Part 9: Rollback Procedures

## Per-Phase Rollback

### Phase 0 (Foundation)
```bash
# Rollback tokens
git checkout HEAD~1 -- src/styles/tokens.css
git checkout HEAD~1 -- src/app/globals.css
```

### Phase 1-6 (Components)
```bash
# Feature flag approach
# Set NEXT_PUBLIC_USE_NEW_COMPONENTS=false in .env
# All new components check this flag
```

### Phase 7 (Pages)
```bash
# Each page migration is a separate commit
# Rollback specific page:
git revert <commit-hash>
```

## Full Rollback
```bash
# Tag before each phase
git tag phase-0-complete
git tag phase-1-complete
# etc.

# Full rollback to any phase:
git checkout phase-X-complete
```

## Monitoring After Deploy

- [ ] Error rate monitoring (Sentry/similar)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] User feedback collection
- [ ] 24-hour observation period per phase

---

# Part 10: Acceptance Criteria

## Visual Acceptance
- [ ] All panels use identical color palette
- [ ] All panels use identical typography scale
- [ ] All panels use identical spacing system
- [ ] All panels use identical border radius
- [ ] All panels use identical shadows
- [ ] All panels use identical icons (Lucide)

## Component Acceptance
- [ ] Only ONE button component in use
- [ ] Only ONE card component in use
- [ ] Only ONE badge/status component in use
- [ ] Only ONE table/data display component in use
- [ ] Only TWO overlay components (Modal + Sheet)
- [ ] Only ONE page header component in use
- [ ] Only ONE empty state component in use
- [ ] Only ONE loading state component in use

## Code Quality Acceptance
- [ ] No duplicate component files
- [ ] All components have TypeScript types
- [ ] All components have JSDoc documentation
- [ ] No inline styles (all Tailwind)
- [ ] All colors use design tokens
- [ ] All spacing uses design tokens

## Accessibility Acceptance
- [ ] WCAG 2.1 AA compliance verified
- [ ] Keyboard navigation complete
- [ ] Screen reader tested
- [ ] Color contrast verified
- [ ] Focus management correct

## Performance Acceptance
- [ ] Lighthouse Performance ≥ 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 4s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Bundle size increase < 10%

---

*This plan is ready for review and approval before implementation begins.*

**Approval Checklist:**
- [ ] Product Owner approval
- [ ] Design review complete
- [ ] Engineering lead approval
- [ ] QA plan reviewed
- [ ] Rollback procedure verified
