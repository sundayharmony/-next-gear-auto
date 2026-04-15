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

## Current safe defaults

- Finance is admin-only and not shared with manager.
- Manager analytics are operational-only (non-financial).
