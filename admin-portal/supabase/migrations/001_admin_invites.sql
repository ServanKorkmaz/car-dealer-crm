create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  role text not null check (role in ('owner','admin','user')) default 'user',
  token uuid unique not null default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);

alter table public.org_invites enable row level security;

-- Admins in org can see their invites
create policy org_invites_select_admin on public.org_invites
for select using (
  exists (select 1 from public.org_members m
          where m.org_id = org_invites.org_id
            and m.user_id = auth.uid()
            and m.role in ('owner','admin'))
);

-- Admins can create invites for their org
create policy org_invites_insert_admin on public.org_invites
for insert with check (
  exists (select 1 from public.org_members m
          where m.org_id = org_invites.org_id
            and m.user_id = auth.uid()
            and m.role in ('owner','admin'))
);

-- Admins can delete their invites
create policy org_invites_delete_admin on public.org_invites
for delete using (
  exists (select 1 from public.org_members m
          where m.org_id = org_invites.org_id
            and m.user_id = auth.uid()
            and m.role in ('owner','admin'))
);

-- RPC: accept invite (joins caller to org)
create or replace function public.accept_invite(invite_token uuid)
returns table(org_id uuid, role text) language plpgsql security definer as $$
declare
  v_inv public.org_invites;
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_inv
  from public.org_invites
  where token = invite_token
    and used_at is null
    and now() < expires_at
  limit 1;

  if v_inv.id is null then
    raise exception 'Invalid or expired invite';
  end if;

  select exists(
    select 1 from public.org_members
    where org_id = v_inv.org_id and user_id = auth.uid()
  ) into v_exists;

  if not v_exists then
    insert into public.org_members (org_id, user_id, role)
    values (v_inv.org_id, auth.uid(), v_inv.role);
  end if;

  update public.org_invites
  set used_by = auth.uid(), used_at = now()
  where id = v_inv.id;

  return query select v_inv.org_id, v_inv.role;
end $$;

revoke all on function public.accept_invite(uuid) from public;
grant execute on function public.accept_invite(uuid) to anon, authenticated;

-- Ensure admins can manage org_members (update role / delete)
-- (If already present, these will no-op)
create policy if not exists org_members_update_admin on public.org_members
for update using (
  exists(select 1 from public.org_members m
    where m.org_id = org_members.org_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin'))
);

create policy if not exists org_members_delete_admin on public.org_members
for delete using (
  exists(select 1 from public.org_members m
    where m.org_id = org_members.org_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin'))
);