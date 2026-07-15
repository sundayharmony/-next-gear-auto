-- ============================================================
-- RLS RESTORE after foreign (Sunday Harmony) lockdown migration
-- Project: Next Gear Auto (sslpstfgwtuyempuwzvh)
-- Run in the Supabase SQL Editor. Idempotent. Touches NO table data.
--
-- What this does:
--   1. Drops the emergency placeholder "Service role full access"
--      policies everywhere EXCEPT maintenance_records (where that exact
--      name/definition is the repo's original policy).
--   2. Recreates every policy this repo defines, with original
--      names/commands/expressions, and re-enables RLS on those tables.
--   3. Restores repo-defined storage bucket flags + policies
--      (booking-documents public, vehicle-sales private) and drops the
--      placeholder "Public read dispute letters" storage policy.
--
-- Deliberate deviations (explained in accompanying notes):
--   - messages / dispute_sessions / dispute_letter_plans / dispute_letters:
--     RLS is left ENABLED with zero policies. This repo never defines
--     policies for them and no code path uses the anon key, so this is
--     safe and blocks anonymous access. To exactly mirror the repo's
--     silence (RLS off), uncomment the DISABLE lines at the bottom.
--   - dispute-letters bucket stays PRIVATE: this repo has no reference
--     to it; it belongs to the Sunday Harmony project.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- PART 1: Remove emergency placeholder policies
-- "Service role full access" is only legitimate on maintenance_records.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'Service role full access'
      AND tablename <> 'maintenance_records'
  LOOP
    EXECUTE format('DROP POLICY "Service role full access" ON public.%I', r.tablename);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- PART 2: Restore repo-defined policies (drop-if-exists + recreate)
-- ────────────────────────────────────────────────────────────

-- customers (_archive/sql-migrations/supabase-schema.sql)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow customer signup" ON public.customers;
CREATE POLICY "Allow customer signup" ON public.customers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow customer lookup" ON public.customers;
CREATE POLICY "Allow customer lookup" ON public.customers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow customer update" ON public.customers;
CREATE POLICY "Allow customer update" ON public.customers FOR UPDATE USING (true);

-- vehicles (_archive/sql-migrations/supabase-schema.sql)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vehicles are viewable by everyone" ON public.vehicles;
CREATE POLICY "Vehicles are viewable by everyone" ON public.vehicles FOR SELECT USING (true);

-- bookings (_archive/sql-migrations/supabase-schema.sql)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow booking creation" ON public.bookings;
CREATE POLICY "Allow booking creation" ON public.bookings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow booking read" ON public.bookings;
CREATE POLICY "Allow booking read" ON public.bookings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow booking update" ON public.bookings;
CREATE POLICY "Allow booking update" ON public.bookings FOR UPDATE USING (true);

-- payment_records (_archive/sql-migrations/supabase-schema.sql)
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow payment record creation" ON public.payment_records;
CREATE POLICY "Allow payment record creation" ON public.payment_records FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow payment record read" ON public.payment_records;
CREATE POLICY "Allow payment record read" ON public.payment_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow payment record update" ON public.payment_records;
CREATE POLICY "Allow payment record update" ON public.payment_records FOR UPDATE USING (true);

-- blocked_dates (supabase-blocked-dates.sql)
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on blocked_dates" ON public.blocked_dates;
CREATE POLICY "Service role full access on blocked_dates"
  ON public.blocked_dates FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read access on blocked_dates" ON public.blocked_dates;
CREATE POLICY "Public read access on blocked_dates"
  ON public.blocked_dates FOR SELECT USING (true);

-- tickets (supabase-tickets-migration.sql)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on tickets" ON public.tickets;
CREATE POLICY "Service role full access on tickets"
  ON public.tickets FOR ALL USING (true);

-- invoices (_archive/sql-migrations/supabase-invoices-table.sql)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on invoices" ON public.invoices;
CREATE POLICY "Service role full access on invoices"
  ON public.invoices FOR ALL USING (true) WITH CHECK (true);

-- owner_payouts (supabase-owner-portal.sql)
ALTER TABLE public.owner_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on owner_payouts" ON public.owner_payouts;
CREATE POLICY "Service role full access on owner_payouts"
  ON public.owner_payouts FOR ALL USING (true) WITH CHECK (true);

-- owner_notifications (supabase-owner-portal.sql)
ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on owner_notifications" ON public.owner_notifications;
CREATE POLICY "Service role full access on owner_notifications"
  ON public.owner_notifications FOR ALL USING (true) WITH CHECK (true);

-- maintenance_records (_archive/sql-migrations/supabase-maintenance-migration.sql)
-- The placeholder used the same name; recreate to the exact repo definition.
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.maintenance_records;
CREATE POLICY "Service role full access" ON public.maintenance_records FOR ALL USING (true);

-- instagram_posts (_archive/sql-migrations/supabase-maintenance-migration.sql)
-- "Public read visible posts" survived the foreign migration (expression is
-- not literal true); recreated here anyway for idempotency.
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read visible posts" ON public.instagram_posts;
CREATE POLICY "Public read visible posts" ON public.instagram_posts FOR SELECT USING (is_visible = true);
DROP POLICY IF EXISTS "Service role full access instagram" ON public.instagram_posts;
CREATE POLICY "Service role full access instagram" ON public.instagram_posts FOR ALL USING (true);

-- reviews (_archive/sql-migrations/supabase-reviews-schema.sql)
-- "Anyone can read approved reviews" survived; recreated for idempotency.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.reviews;
CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
CREATE POLICY "Users can insert reviews"
  ON public.reviews FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE USING (true);

-- ────────────────────────────────────────────────────────────
-- PART 3: Storage buckets + policies
-- ────────────────────────────────────────────────────────────

-- Repo-defined bucket visibility (supabase-rental-agreement-migration.sql,
-- supabase-admin-overhaul.sql, supabase-vehicle-sales-migration.sql)
UPDATE storage.buckets SET public = true  WHERE id IN ('booking-documents', 'vehicle-images');
UPDATE storage.buckets SET public = false WHERE id = 'vehicle-sales';

-- booking-documents policies (these survived the foreign migration since
-- their expressions are not literal `true`; recreated for idempotency)
DROP POLICY IF EXISTS "Public read access for booking documents" ON storage.objects;
CREATE POLICY "Public read access for booking documents"
  ON storage.objects FOR SELECT USING (bucket_id = 'booking-documents');
DROP POLICY IF EXISTS "Service role can manage booking documents" ON storage.objects;
CREATE POLICY "Service role can manage booking documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'booking-documents')
  WITH CHECK (bucket_id = 'booking-documents');

-- dispute-letters: NOT part of this repo (belongs to Sunday Harmony).
-- Drop the emergency placeholder; keep the bucket private. If the Sunday
-- Harmony app genuinely serves letters from THIS database, restore its
-- policies from the Sunday Harmony repo instead.
DROP POLICY IF EXISTS "Public read dispute letters" ON storage.objects;

-- ────────────────────────────────────────────────────────────
-- PART 4 (optional): exact repo parity for tables the repo never
-- gives RLS. The foreign migration force-enabled RLS on these; leaving
-- RLS ENABLED with no policies is SAFER (blocks anon; the app only uses
-- the service role, which bypasses RLS). Uncomment only if you want the
-- pre-incident RLS-disabled state back.
-- ────────────────────────────────────────────────────────────
-- ALTER TABLE public.messages             DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.dispute_sessions     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.dispute_letter_plans DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.dispute_letters      DISABLE ROW LEVEL SECURITY;

COMMIT;

-- ════════════════════════════════════════════════════════════
-- VERIFICATION (run after COMMIT; read-only)
-- ════════════════════════════════════════════════════════════
-- 1. All public-schema policies + RLS flags:
-- SELECT c.relname AS table_name,
--        c.relrowsecurity AS rls_enabled,
--        p.policyname, p.cmd, p.roles, p.qual, p.with_check
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
-- LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
-- WHERE c.relkind = 'r'
-- ORDER BY c.relname, p.policyname;
--
-- 2. Storage policies + bucket flags:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname;
-- SELECT id, public FROM storage.buckets ORDER BY id;
--
-- 3. No leftover placeholders anywhere except maintenance_records:
-- SELECT tablename FROM pg_policies
-- WHERE schemaname = 'public' AND policyname = 'Service role full access'
--   AND tablename <> 'maintenance_records';
-- (must return zero rows)
