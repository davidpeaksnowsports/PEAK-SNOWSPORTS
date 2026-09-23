-- Peak HQ — the portal for employed office and booking staff, at /hq.
--
-- A third population in this Supabase project, alongside instructors
-- (/portal) and GAP students (/gap). Each has its own profile table and none
-- reads another's. A valid session is not access to anything: only a row in
-- the area's own table is.
--
-- Two lessons from earlier migrations are built in from the start:
--
--   * No sign-up trigger creates staff profiles (see 0006). Nothing in a
--     sign-up is un-forgeable, and public sign-up is on for GAP enrolment.
--     A staff_members row is inserted by an admin, deliberately.
--
--   * Members cannot write staff_members at all, so there are no privileged
--     columns to guard with a trigger (see 0002/0003 for what that costs).
--     Everything a member may edit lives in staff_onboarding, where every
--     column is theirs.
--
-- Deliberately NOT collected here: numéro de sécurité sociale, IBAN, identity
-- documents. Those go straight to payroll. This holds what the first week
-- needs and nothing more.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create type public.staff_role as enum ('staff', 'manager', 'admin');

create table public.staff_members (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  role        public.staff_role not null default 'staff',
  job_title   text,
  start_date  date,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.staff_members is
  'Peak HQ profile, one row per employed staff member. Created by an admin, never by a trigger. Members can read their own row and cannot write it.';

create table public.staff_onboarding (
  member_id               uuid primary key references public.staff_members (id) on delete cascade,
  preferred_name          text check (char_length(preferred_name) <= 80),
  phone                   text check (char_length(phone) <= 40),
  emergency_name          text check (char_length(emergency_name) <= 120),
  emergency_relationship  text check (char_length(emergency_relationship) <= 60),
  emergency_phone         text check (char_length(emergency_phone) <= 40),
  jacket_size             text check (jacket_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  accounts_needed         text[] not null default '{}',
  notes                   text check (char_length(notes) <= 2000),
  submitted_at            timestamptz,
  updated_at              timestamptz not null default now()
);

comment on table public.staff_onboarding is
  'What a new starter tells us before their first week. Personal data: readable by the member and by managers, deleted with the account. No payroll identifiers — those go to payroll directly.';

create table public.staff_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  detail      text,
  link        text,
  sort        integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.staff_checklist_ticks (
  member_id  uuid not null references public.staff_members (id) on delete cascade,
  item_id    uuid not null references public.staff_checklist_items (id) on delete cascade,
  done_at    timestamptz not null default now(),
  primary key (member_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Role helpers
--
-- SECURITY DEFINER so a policy can ask "is the caller a manager?" without
-- the lookup itself going through the policy it is part of. Every helper
-- requires an ACTIVE row: deactivating someone removes their access without
-- deleting their history.
-- ---------------------------------------------------------------------------

create function public.staff_role_of_me()
returns public.staff_role
language sql stable security definer set search_path = public as $$
  select role from public.staff_members
  where id = auth.uid() and active;
$$;

create function public.staff_is_active()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_members where id = auth.uid() and active
  );
$$;

create function public.staff_is_manager()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.staff_role_of_me() in ('manager', 'admin'), false);
$$;

create function public.staff_is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.staff_role_of_me() = 'admin', false);
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.staff_role_of_me()',
    'public.staff_is_active()',
    'public.staff_is_manager()',
    'public.staff_is_admin()'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create function public.staff_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger staff_members_touch
  before update on public.staff_members
  for each row execute function public.staff_touch_updated_at();

create trigger staff_onboarding_touch
  before update on public.staff_onboarding
  for each row execute function public.staff_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security. Default deny; every policy is `to authenticated`.
-- ---------------------------------------------------------------------------

alter table public.staff_members         enable row level security;
alter table public.staff_onboarding      enable row level security;
alter table public.staff_checklist_items enable row level security;
alter table public.staff_checklist_ticks enable row level security;

-- staff_members: read your own row; managers read everyone; only admins write.
create policy "staff read own profile"
  on public.staff_members for select to authenticated
  using (id = auth.uid());

create policy "managers read all staff"
  on public.staff_members for select to authenticated
  using (public.staff_is_manager());

create policy "admins manage staff"
  on public.staff_members for all to authenticated
  using (public.staff_is_admin())
  with check (public.staff_is_admin());

-- staff_onboarding: an active member owns their own row outright. Managers
-- read all of them (they need emergency contacts); nobody else can.
create policy "staff read own onboarding"
  on public.staff_onboarding for select to authenticated
  using (member_id = auth.uid() and public.staff_is_active());

create policy "staff create own onboarding"
  on public.staff_onboarding for insert to authenticated
  with check (member_id = auth.uid() and public.staff_is_active());

create policy "staff update own onboarding"
  on public.staff_onboarding for update to authenticated
  using (member_id = auth.uid() and public.staff_is_active())
  with check (member_id = auth.uid() and public.staff_is_active());

create policy "managers read all onboarding"
  on public.staff_onboarding for select to authenticated
  using (public.staff_is_manager());

create policy "admins manage onboarding"
  on public.staff_onboarding for all to authenticated
  using (public.staff_is_admin())
  with check (public.staff_is_admin());

-- Checklist items: any active member reads them; admins edit them.
create policy "staff read checklist"
  on public.staff_checklist_items for select to authenticated
  using (public.staff_is_active());

create policy "admins manage checklist"
  on public.staff_checklist_items for all to authenticated
  using (public.staff_is_admin())
  with check (public.staff_is_admin());

-- Ticks: a member ticks and unticks their own; managers see everyone's.
create policy "staff read own ticks"
  on public.staff_checklist_ticks for select to authenticated
  using (member_id = auth.uid() and public.staff_is_active());

create policy "staff tick"
  on public.staff_checklist_ticks for insert to authenticated
  with check (member_id = auth.uid() and public.staff_is_active());

create policy "staff untick"
  on public.staff_checklist_ticks for delete to authenticated
  using (member_id = auth.uid() and public.staff_is_active());

create policy "managers read all ticks"
  on public.staff_checklist_ticks for select to authenticated
  using (public.staff_is_manager());

-- ---------------------------------------------------------------------------
-- First-week checklist. Edit or add rows in the table editor; `active = false`
-- retires an item without losing who ticked it.
-- ---------------------------------------------------------------------------

insert into public.staff_checklist_items (sort, title, detail, link) values
  (10,  'Read our mission and values',
        'What we are trying to do, and how we expect to do it.',
        '/hq/what-we-do/mission-and-values'),
  (20,  'Read the code of conduct',
        'The standard everyone representing Peak is held to.',
        '/hq/policies/code-of-conduct'),
  (30,  'Read the safeguarding policy',
        'Many of our clients are children. This one matters.',
        '/hq/policies/safeguarding'),
  (40,  'Read how we work',
        'The working principles that keep a team across four resorts consistent.',
        '/hq/how-we-work/systems-of-work'),
  (50,  'Join your Google Chat spaces',
        'Which space is for what is in How we communicate.',
        '/hq/how-we-work/how-we-communicate'),
  (60,  'Set up your Peak email and signature',
        'Read the email policy first.',
        '/hq/policies/email'),
  (70,  'Get your SkiOperator login and shadow a booking',
        'Ask Marc. Every enquiry and booking is worked in SkiOperator.',
        null),
  (80,  'Learn what we sell',
        'Every product, and the page to send a client for each one.',
        '/hq/what-we-do'),
  (90,  'Read the booking playbook',
        'Phone etiquette, email templates and how an enquiry becomes a booking.',
        '/hq/playbook'),
  (100, 'Read the accident and lost skier procedure',
        'What happens on the hill, so you know what a call from an instructor means.',
        '/hq/how-we-work/accident-and-lost-skier');
