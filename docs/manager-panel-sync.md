# Admin/Manager Sync Contract

This project enforces a shared contract for Admin features that are marked as `sharedWithManager`.

## Rules

- Shared features must be represented in `src/lib/admin/panel-registry.ts`.
- Any temporary desync must be documented via `syncException` on that feature.
- `syncException` entries must include:
  - `reason`
  - `expiresAt` (ISO timestamp)
- Expired exceptions fail `npm run check:panel-sync`.

## Validation

- Local: `npm run check:panel-sync`
- CI-ready command: `npm test`

## What the sync check enforces

- Every `sharedWithManager: true` feature must declare a `managerPath`.
- Every shared manager path must have a real page file under `src/app/manager/.../page.tsx`.
- Every shared manager page must reference shared/admin UI sources (`@/app/admin/...`) to avoid drift.
- Manager-shared set cannot include finance or fleet (`finances`, `vehicles`).
- Any `syncException` used for temporary desync must not be expired.

### Allowed sync exemption

- `dashboard` is intentionally manager-specific and exempt from the shared UI import rule.

## Current safe defaults

- Finance is admin-only and not shared with manager.
- Fleet management is admin-only and not shared with manager.
- Manager analytics are operational-only (non-financial) and intentionally manager-specific.
