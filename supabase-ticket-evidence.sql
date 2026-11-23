-- Ticket dispute packet: evidence documents + private storage bucket.
-- Reversible: see the DOWN section at the bottom.
create table if not exists public.ticket_evidence_documents (
  id uuid primary key default gen_random_uuid(),
  ticket_id text references public.tickets(id) on delete cascade,
  vehicle_id text,
  kind text not null check (kind in ('citation','registration','correspondence','other')),
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  size_bytes integer,
  uploaded_by text,
  created_at timestamptz not null default now(),
  constraint ticket_evidence_target check (ticket_id is not null or vehicle_id is not null)
);
create index if not exists ticket_evidence_ticket_idx on public.ticket_evidence_documents (ticket_id);
create index if not exists ticket_evidence_vehicle_idx on public.ticket_evidence_documents (vehicle_id);
-- RLS on with no policies: only the service role (server API routes) can read or write.
alter table public.ticket_evidence_documents enable row level security;
-- Private bucket (no public URLs); files are only streamed through authenticated staff routes.
insert into storage.buckets (id, name, public) values ('ticket-evidence', 'ticket-evidence', false)
  on conflict (id) do nothing;

-- DOWN (manual): drop table public.ticket_evidence_documents; delete from storage.buckets where id='ticket-evidence' (empty the bucket first).
