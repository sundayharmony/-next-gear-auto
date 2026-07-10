# UI/UX Redesign Implementation Plan

## Executive Summary

This document provides a comprehensive audit and implementation plan to redesign the NextGearAuto application's UI/UX across all four dashboards (Admin, Manager, Customer, Owner) while preserving 100% of existing functionality and business logic.

**Goal:** Create a cohesive, premium, enterprise-grade SaaS experience with a unified design language.

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

*This plan is ready for review and approval before implementation begins.*
