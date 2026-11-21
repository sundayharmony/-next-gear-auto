-- License reader: back-of-license photo columns, and tighter storage policy.
-- Already applied to the live project (migration: license_back_photo_and_tighten_storage_policy).
alter table public.bookings add column if not exists id_document_back_url text;
alter table public.customers add column if not exists id_document_back_url text;

-- The app writes to storage with the service role (bypasses RLS). This policy let anyone write/delete.
drop policy if exists "Service role can manage booking documents" on storage.objects;
