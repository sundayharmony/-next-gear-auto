-- ============================================================================
-- Manager per-booking financial visibility
-- ============================================================================
-- Adds a booking-level permission that lets an admin grant a manager access
-- to the financial data of one specific booking. Default is FALSE so:
--   • all existing bookings default to NO manager financial access, and
--   • all newly created bookings default to NO manager financial access.
--
-- Backward compatible: uses ADD COLUMN IF NOT EXISTS with a NOT NULL default,
-- so re-running is safe and existing rows are backfilled to FALSE.
-- ============================================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS manager_financial_access BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill any rows that may have been created with a NULL (defensive; the
-- NOT NULL default above already guarantees this for fresh columns).
UPDATE bookings
  SET manager_financial_access = FALSE
  WHERE manager_financial_access IS NULL;
