-- Instructor portal — Phase 1 schema.
--
-- Just identity for now: who is signed in, what they are called, and which
-- document tier they may read. The training tracker, ops forms and ideas
-- tables land in later phases.
--
-- Run against the Supabase project referenced by SUPABASE_URL:
--   supabase db push
-- or paste into the SQL editor in the dashboard.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create type public.portal_role as enum ('instructor', 'office', 'admin');

create table public.instructors (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  role        public.portal_role not null default 'instructor',
  resorts     text[] not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.instructors is
  'Portal profile, one row per auth user. `role` decides which document tiers are visible: instructors see tiers 1 and 2, office and admin see all three.';

-- ---------------------------------------------------------------------------
-- Role lookup
--
-- SECURITY DEFINER so it can read instructors without going through RLS. A
-- policy on instructors that SELECTs from instructors would recurse forever;
-- this is the standard way out of that.
-- ---------------------------------------------------------------------------

create function public.portal_role_of(uid uuid)
returns public.portal_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.instructors where id = uid;
$$;

revoke execute on function public.portal_role_of(uuid) from public, anon;
grant execute on function public.portal_role_of(uuid) to authenticated;

create function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.instructors where id = auth.uid()) = 'admin',
    false
  );
$$;

revoke execute on function public.is_portal_admin() from public, anon;
grant execute on function public.is_portal_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Default deny. An instructor can read and lightly edit their own row and
-- nothing else; admins can see and manage everyone.
-- ---------------------------------------------------------------------------

alter table public.instructors enable row level security;

create policy "read own profile"
  on public.instructors for select
  to authenticated
  using (id = auth.uid());

create policy "admins read all profiles"
  on public.instructors for select
  to authenticated
  using (public.is_portal_admin());

create policy "admins manage profiles"
  on public.instructors for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

-- Deliberately narrow: a user may correct their own display name, but not
-- promote themselves. Role and resorts are admin-only, enforced by the trigger
-- below rather than by column privileges, which policies cannot express.
create policy "update own profile"
  on public.instructors for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create function public.instructors_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_portal_admin() then
    new.updated_at := now();
    return new;
  end if;

  -- Non-admins keep whatever role and resorts they already had, whatever the
  -- update tried to set.
  new.role    := old.role;
  new.resorts := old.resorts;
  new.active  := old.active;
  new.updated_at := now();
  return new;
end;
$$;

create trigger instructors_guard_privileged_columns
  before update on public.instructors
  for each row execute function public.instructors_guard_privileged_columns();

-- ---------------------------------------------------------------------------
-- Profile creation
--
-- Accounts are created by an admin in the Supabase dashboard (there is no
-- public sign-up — the portal is invite-only). This trigger makes sure every
-- auth user gets a profile row so the portal never renders a nameless session.
-- ---------------------------------------------------------------------------

create function public.handle_new_portal_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.instructors (id, name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_portal
  after insert on auth.users
  for each row execute function public.handle_new_portal_user();
