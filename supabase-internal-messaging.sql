-- Internal staff messaging and notification schema
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  thread_type text not null check (thread_type in ('dm', 'channel')),
  title text,
  created_by_user_id text not null,
  created_by_role text not null check (created_by_role in ('admin', 'manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists message_thread_members (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('admin', 'manager')),
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (thread_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_user_id text not null,
  sender_role text not null check (sender_role in ('admin', 'manager')),
  body text not null,
  client_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (thread_id, sender_user_id, client_message_id)
);

create table if not exists notification_outbox (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  recipient_user_id text not null,
  recipient_role text not null check (recipient_role in ('admin', 'manager')),
  channel text not null check (channel in ('email', 'push')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'retry', 'failed', 'dead')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  unique (message_id, recipient_user_id, channel)
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role text not null check (role in ('admin', 'manager')),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error text
);

create index if not exists idx_message_thread_members_user_status
  on message_thread_members(user_id, status, joined_at desc);

create index if not exists idx_messages_thread_created
  on messages(thread_id, created_at desc);

create index if not exists idx_notification_outbox_status_send_after
  on notification_outbox(status, send_after, attempts, created_at);

create index if not exists idx_push_subscriptions_user_active
  on push_subscriptions(user_id, active, created_at desc);

create index if not exists idx_threads_last_message_at
  on message_threads(last_message_at desc nulls last, updated_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_message_threads_updated_at on message_threads;
create trigger trg_message_threads_updated_at
before update on message_threads
for each row
execute function set_updated_at();

drop trigger if exists trg_notification_outbox_updated_at on notification_outbox;
create trigger trg_notification_outbox_updated_at
before update on notification_outbox
for each row
execute function set_updated_at();

drop trigger if exists trg_push_subscriptions_updated_at on push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on push_subscriptions
for each row
execute function set_updated_at();

-- Next: run supabase-internal-messaging-dm-pair.sql for canonical DM pairs, RPC helpers, and merge of duplicate DMs.
