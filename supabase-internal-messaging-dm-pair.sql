-- Incremental migration: canonical DM pair + uniqueness + helpers.
-- Run after supabase-internal-messaging.sql. Safe to run multiple times where noted.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Columns
-- ---------------------------------------------------------------------------
alter table message_threads add column if not exists dm_user_id_low text;
alter table message_threads add column if not exists dm_user_id_high text;

-- ---------------------------------------------------------------------------
-- 2) Backfill pair columns for DM threads with exactly two active members
-- ---------------------------------------------------------------------------
with agg as (
  select
    m.thread_id,
    min(m.user_id) as min_u,
    max(m.user_id) as max_u
  from message_thread_members m
  join message_threads t on t.id = m.thread_id and t.thread_type = 'dm'
  where m.status = 'active'
  group by m.thread_id
  having count(*) >= 2
)
update message_threads mt
set
  dm_user_id_low = agg.min_u,
  dm_user_id_high = agg.max_u
from agg
where mt.id = agg.thread_id
  and mt.thread_type = 'dm'
  and agg.min_u < agg.max_u;

-- Drop empty broken DM threads (no messages, not a valid pair) so constraints can apply
delete from message_threads mt
where mt.thread_type = 'dm'
  and (mt.dm_user_id_low is null or mt.dm_user_id_high is null)
  and not exists (select 1 from messages msg where msg.thread_id = mt.id);

do $$
begin
  if exists (
    select 1
    from message_threads mt
    where mt.thread_type = 'dm'
      and (mt.dm_user_id_low is null or mt.dm_user_id_high is null)
  ) then
    raise exception
      'Staff messaging DM migration: message_threads still has thread_type=dm rows without dm_user_id_low/high. Fix memberships or messages, then re-run.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Merge duplicate DM threads (same low/high). Canonical: max(last_message_at), tie-break min(id).
-- ---------------------------------------------------------------------------
create or replace function staff_merge_duplicate_dm_threads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  merged_groups integer := 0;
  r record;
  v_canonical uuid;
  v_dup uuid;
  i int;
begin
  for r in
    select dm_user_id_low as low_u, dm_user_id_high as high_u, array_agg(id order by last_message_at desc nulls last, id asc) as ids
    from message_threads
    where thread_type = 'dm'
      and dm_user_id_low is not null
      and dm_user_id_high is not null
    group by dm_user_id_low, dm_user_id_high
    having count(*) > 1
  loop
    v_canonical := r.ids[1];
    for i in 2..array_length(r.ids, 1) loop
      v_dup := r.ids[i];
      update messages set thread_id = v_canonical where thread_id = v_dup;

      insert into message_thread_members (thread_id, user_id, role, status, muted, joined_at, last_read_at)
      select
        v_canonical,
        m.user_id,
        m.role,
        'active',
        coalesce(m.muted, false),
        m.joined_at,
        m.last_read_at
      from message_thread_members m
      where m.thread_id = v_dup
      on conflict (thread_id, user_id) do update set
        status = 'active',
        last_read_at = case
          when excluded.last_read_at is null then message_thread_members.last_read_at
          when message_thread_members.last_read_at is null then excluded.last_read_at
          when excluded.last_read_at > message_thread_members.last_read_at then excluded.last_read_at
          else message_thread_members.last_read_at
        end,
        muted = message_thread_members.muted or excluded.muted;

      delete from message_thread_members where thread_id = v_dup;
      delete from message_threads where id = v_dup;
    end loop;
    merged_groups := merged_groups + 1;
  end loop;
  return merged_groups;
end;
$$;

select staff_merge_duplicate_dm_threads();

-- ---------------------------------------------------------------------------
-- 4) CHECK: DM rows have ordered pair; channel rows have null pair columns
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_message_threads_dm_pair_shape'
  ) then
    alter table message_threads add constraint chk_message_threads_dm_pair_shape check (
      case thread_type
        when 'dm' then
          dm_user_id_low is not null
          and dm_user_id_high is not null
          and dm_user_id_low < dm_user_id_high
        else
          dm_user_id_low is null and dm_user_id_high is null
      end
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Partial unique index: at most one DM thread per unordered pair
-- ---------------------------------------------------------------------------
create unique index if not exists ux_message_threads_dm_pair
  on message_threads (dm_user_id_low, dm_user_id_high)
  where thread_type = 'dm';

-- ---------------------------------------------------------------------------
-- 6) Unread counts for many threads in one round-trip
-- ---------------------------------------------------------------------------
create or replace function staff_message_thread_unread_counts(p_user_id text, p_thread_ids uuid[])
returns table(thread_id uuid, unread_count bigint)
language sql
stable
set search_path = public
as $$
  select
    u.tid as thread_id,
    coalesce((
      select count(*)::bigint
      from messages msg
      where msg.thread_id = u.tid
        and msg.sender_user_id is distinct from p_user_id
        and msg.deleted_at is null
        and exists (
          select 1 from message_thread_members mm
          where mm.thread_id = u.tid
            and mm.user_id = p_user_id
            and mm.status = 'active'
            and (mm.last_read_at is null or msg.created_at > mm.last_read_at)
        )
    ), 0) as unread_count
  from (select distinct unnest(p_thread_ids) as tid) u;
$$;

-- ---------------------------------------------------------------------------
-- 7) Idempotent DM creation (race-safe)
-- ---------------------------------------------------------------------------
create or replace function staff_get_or_create_dm_thread(
  p_low text,
  p_high text,
  p_creator_user_id text,
  p_creator_role text,
  p_peer_user_id text,
  p_peer_role text
)
returns table(thread_id uuid, created_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_new boolean;
begin
  if p_low >= p_high then
    raise exception 'staff_get_or_create_dm_thread expects p_low < p_high';
  end if;

  insert into message_threads (thread_type, created_by_user_id, created_by_role, dm_user_id_low, dm_user_id_high, title)
  values ('dm', p_creator_user_id, p_creator_role, p_low, p_high, null)
  on conflict (dm_user_id_low, dm_user_id_high) where (thread_type = 'dm')
  do nothing
  returning id into v_id;

  if v_id is not null then
    v_new := true;
    insert into message_thread_members (thread_id, user_id, role, status)
    values
      (v_id, p_creator_user_id, p_creator_role, 'active'),
      (v_id, p_peer_user_id, p_peer_role, 'active');
  else
    select t.id into v_id
    from message_threads t
    where t.thread_type = 'dm'
      and t.dm_user_id_low = p_low
      and t.dm_user_id_high = p_high
    limit 1;
    v_new := false;

    insert into message_thread_members (thread_id, user_id, role, status)
    values
      (v_id, p_creator_user_id, p_creator_role, 'active'),
      (v_id, p_peer_user_id, p_peer_role, 'active')
    on conflict (thread_id, user_id) do update set
      status = 'active';
  end if;

  thread_id := v_id;
  created_new := v_new;
  return next;
end;
$$;

grant execute on function staff_merge_duplicate_dm_threads() to service_role;
grant execute on function staff_message_thread_unread_counts(text, uuid[]) to service_role;
grant execute on function staff_get_or_create_dm_thread(text, text, text, text, text, text) to service_role;
