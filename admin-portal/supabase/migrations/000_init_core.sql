-- Enable needed extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ORGS
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz default now()
);

-- ORG MEMBERS
create table if not exists public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','user')) default 'user',
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);

-- PROFILES
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz default now()
);

-- USAGE EVENTS
create table if not exists public.usage_events (
  id bigserial primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  amount numeric not null default 1,
  metadata jsonb,
  created_at timestamptz default now()
);

-- DAILY AGGREGATES
create table if not exists public.usage_daily (
  org_id uuid not null references public.orgs(id) on delete cascade,
  day date not null,
  metric text not null,
  value numeric not null,
  primary key (org_id, day, metric)
);

-- AUDIT LOG
create table if not exists public.audit_log (
  id bigserial primary key,
  org_id uuid references public.orgs(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.profiles enable row level security;
alter table public.usage_events enable row level security;
alter table public.usage_daily enable row level security;
alter table public.audit_log enable row level security;

-- Helper: is member of org
create or replace function public.is_member(org uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.org_members
    where org_id = org and user_id = auth.uid()
  );
$$;

-- ORGS policies
drop policy if exists orgs_select_if_member on public.orgs;
create policy orgs_select_if_member on public.orgs
for select using (public.is_member(id));

drop policy if exists orgs_insert_any_user on public.orgs;
create policy orgs_insert_any_user on public.orgs
for insert with check (true);

drop policy if exists orgs_update_admins on public.orgs;
create policy orgs_update_admins on public.orgs
for update using (
  exists(select 1 from public.org_members m
    where m.org_id = id and m.user_id = auth.uid() and m.role in ('owner','admin'))
);

-- ORG MEMBERS policies
drop policy if exists org_members_select_if_member on public.org_members;
create policy org_members_select_if_member on public.org_members
for select using (public.is_member(org_id));

drop policy if exists org_members_insert_admin on public.org_members;
create policy org_members_insert_admin on public.org_members
for insert with check (
  exists(select 1 from public.org_members m
    where m.org_id = org_id and m.user_id = auth.uid() and m.role in ('owner','admin'))
);

drop policy if exists org_members_delete_admin on public.org_members;
create policy org_members_delete_admin on public.org_members
for delete using (
  exists(select 1 from public.org_members m
    where m.org_id = org_id and m.user_id = auth.uid() and m.role in ('owner','admin'))
);

-- PROFILES policies
drop policy if exists profiles_select_self_or_same_org on public.profiles;
create policy profiles_select_self_or_same_org on public.profiles
for select using (
  user_id = auth.uid() or exists(
    select 1 from public.org_members om1
    join public.org_members om2 on om1.org_id = om2.org_id
    where om1.user_id = user_id and om2.user_id = auth.uid()
  )
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert with check (user_id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update using (user_id = auth.uid());

-- USAGE_EVENTS policies
drop policy if exists usage_events_select_member on public.usage_events;
create policy usage_events_select_member on public.usage_events
for select using (public.is_member(org_id));

drop policy if exists usage_events_insert_member on public.usage_events;
create policy usage_events_insert_member on public.usage_events
for insert with check (public.is_member(org_id));

-- USAGE_DAILY policies
drop policy if exists usage_daily_select_member on public.usage_daily;
create policy usage_daily_select_member on public.usage_daily
for select using (public.is_member(org_id));

-- AUDIT_LOG policies
drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
for select using (
  exists(select 1 from public.org_members m
    where m.org_id = audit_log.org_id and m.user_id = auth.uid() and m.role in ('owner','admin'))
);

-- Trigger: after org insert, add creator as owner
create or replace function public.add_creator_as_owner()
returns trigger language plpgsql as $$
begin
  insert into public.org_members (org_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists trg_org_owner on public.orgs;
create trigger trg_org_owner
after insert on public.orgs
for each row execute function public.add_creator_as_owner();

-- RPC: aggregate usage into usage_daily for a given day (YYYY-MM-DD)
create or replace function public.aggregate_usage_daily(day_input date)
returns void
language plpgsql
as $$
begin
  delete from public.usage_daily where day = day_input and metric = 'api.calls';
  insert into public.usage_daily (org_id, day, metric, value)
  select org_id, day_input as day, 'api.calls' as metric, count(*)::numeric
  from public.usage_events
  where created_at::date = day_input
  group by org_id;
end;
$$;