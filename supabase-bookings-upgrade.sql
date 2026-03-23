-- ============================================================================
-- Supabase Bookings Upgrade Migration
-- Created: 2026-03-23
-- Purpose: Add new columns and tables for enhanced bookings functionality
-- ============================================================================

-- ============================================================================
-- SECTION 1: Add new columns to bookings table
-- ============================================================================

-- Add admin_notes column for internal notes on bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';

-- Add payment_method column to track how the booking was paid
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';

-- Add promo_code column to track promotional codes used
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT NULL;

-- Add discount_amount column to track discount value applied
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- ============================================================================
-- SECTION 2: Create booking_activity table
-- ============================================================================
-- Purpose: Track all activity/changes related to a booking for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on booking_id for efficient querying of activity by booking
CREATE INDEX IF NOT EXISTS idx_booking_activity_booking_id ON booking_activity(booking_id);

-- ============================================================================
-- SECTION 3: Create booking_payments table
-- ============================================================================
-- Purpose: Track individual payment records associated with bookings
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL,
  note TEXT DEFAULT '',
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on booking_id for efficient querying of payments by booking
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id ON booking_payments(booking_id);

-- ============================================================================
-- Migration complete
-- ============================================================================
-- All new columns have been added to the bookings table
-- Two new tables (booking_activity and booking_payments) have been created
-- Appropriate indexes have been added for performance optimization
-- ============================================================================
