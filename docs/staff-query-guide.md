# Staff query guide

TanStack Query conventions for admin, manager, and owner panels.

## Core module

`src/lib/hooks/use-staff-query.ts`

- `staffQueryFetcher(url)` — JSON fetch via `adminFetch`, throws on `success: false`
- `useStaffQuery(key, endpoint, options)` — thin `useQuery` wrapper
- `useStaffMutation` — mutations with standard invalidation hooks

## Cache keys

```typescript
staffKeys.vehicles(endpoint?)
staffKeys.bookings(filters?)
staffKeys.calendarBookings(endpoint, range)
staffKeys.blockedDates({ from, to })
staffKeys.customers(search?)
staffKeys.finances(period?)
staffKeys.managerAnalytics()
staffKeys.messageUnreadCount()
staffKeys.messageThreads(panelPath)

ownerKeys.dataset()       // GET /api/owner/dataset
ownerKeys.availability()  // GET /api/owner/availability (calendar slices only)
```

Always build keys from these factories — do not inline string arrays in components.

## Owner dataset (single fetch)

`OwnerDataProvider` (`src/lib/owner/owner-data-context.tsx`) loads once:

```
GET /api/owner/dataset → { metrics, bookings, vehicles }
```

Child pages should use `useOwnerData()` selectors instead of parallel `/api/owner/summary`, `/bookings`, `/vehicles` calls.

## Staff migration pattern

1. Move `useEffect` + `adminFetch` loops into a hook under `hooks/` or `use-*-data.ts`.
2. Wire `useStaffQuery(staffKeys.*, endpoint, { queryFn })`.
3. Mutations call `useStaffMutation` then `queryClient.invalidateQueries({ queryKey: staffKeys.*(...) })`.
4. Optimistic list edits use `queryClient.setQueryData(staffKeys.*(...), updater)` (see `use-vehicles-data.ts`, `use-calendar-data.ts`).

### Migrated surfaces (Phase 3)

| Surface | Hook / key |
|---------|------------|
| Admin vehicles | `use-vehicles-data.ts` → `staffKeys.vehicles()` |
| Admin messages threads | `shared-messages-page.tsx` → `staffKeys.messageThreads(panelPath)` with `refetchInterval` |
| Admin calendar bookings | `use-calendar-data.ts` → `staffKeys.calendarBookings(endpoint, range)` |
| Owner finance | `useOwnerData()` + `computeOwnerFinanceSummary(bookings)` |
| Owner availability vehicles | `useOwnerData()`; blocked/booked via `ownerKeys.availability()` |

## Polling

- Message unread: prefer `/api/admin/messages/unread-count` over full thread list polling.
- Layout unread badge pauses on `/admin/messages` and `/manager/messages` to avoid duplicate polls.

## Invalidation cheat sheet

| Mutation | Invalidate |
|----------|------------|
| Create/update booking | `staffKeys.bookings()`, `staffKeys.calendarBookings(...)` |
| Vehicle CRUD | `staffKeys.vehicles()` |
| Block dates | `staffKeys.blockedDates(range)` |
| Customer CRUD | `staffKeys.customers()` |
| Message send / thread create | `staffKeys.messageThreads(panelPath)` |
| Owner booking create | `ownerKeys.dataset()` |
| Owner availability block/remove | `ownerKeys.availability()` |

## Testing

`npm test` includes panel config and owner dataset contract tests. After adding a new staff list page, register it in `check-staff-file-size.mjs` if it exceeds 600 lines.
