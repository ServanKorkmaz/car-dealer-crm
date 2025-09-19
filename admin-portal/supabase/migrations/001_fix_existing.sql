-- This migration can be used if you already have some tables/policies and need to clean up
-- Run this BEFORE 000_init_core.sql if you get errors about existing policies

-- Drop all existing policies first (if they exist)
drop policy if exists orgs_select_if_member on public.orgs;
drop policy if exists orgs_insert_any_user on public.orgs;
drop policy if exists orgs_update_admins on public.orgs;

drop policy if exists org_members_select_if_member on public.org_members;
drop policy if exists org_members_insert_admin on public.org_members;
drop policy if exists org_members_delete_admin on public.org_members;

drop policy if exists profiles_select_self_or_same_org on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

drop policy if exists usage_events_select_member on public.usage_events;
drop policy if exists usage_events_insert_member on public.usage_events;

drop policy if exists usage_daily_select_member on public.usage_daily;

drop policy if exists audit_log_select_admin on public.audit_log;

-- Now run the main migration (000_init_core.sql) after this