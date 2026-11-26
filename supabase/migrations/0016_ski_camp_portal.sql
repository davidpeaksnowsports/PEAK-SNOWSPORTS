-- The ski camp portal, at /camps, for skiers booked on a Peak ski camp.
--
-- A fourth population in this Supabase project, alongside instructors
-- (/portal), GAP students (/gap) and office staff (/hq). Same rule as the
-- others: a valid session is not access. Only a row in camp_members is.
--
-- What it holds is deliberately thin. The content (knowledge hub, ski system,
-- video library, ski fit) is in the private Sanity dataset, and the camp
-- schedule is the public one the /ski-camps page already reads. Postgres holds
-- only who the camper is, which camp they are on, and which fitness sessions
-- they have ticked off.
--
-- Built on the lessons already paid for:
--
--   * Sign-up goes through the join code table from 0009, with a new 'camps'
--     area. The metadata carries a claim; area_for_join_code decides whether
--     it is true. New accounts always land on 'camper'.
--
--   * Campers cannot write camp_members at all, so there are no privileged
--     columns to guard with a trigger (see 0002/0003 for what that costs).
--     Everything a camper may change lives in camp_choices and
--     camp_fitness_ticks, where every column is theirs.
--
--   * No medical, dietary or insurance details. Campers are paying clients and
--     that data belongs in SkiOperator with the booking, not in a tick-box
--     portal.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create type public.camp_role as enum ('camper', 'coach', 'admin');

create table public.camp_members (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  role        public.camp_role not null default 'camper',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.camp_members is
  'Ski camp portal profile. Created by the join-code trigger (always as camper) or by an admin. Members read their own row and cannot write it.';

create table public.camp_choices (
  member_id      uuid primary key references public.camp_members (id) on delete cascade,
  -- The Sanity _id of a skiCamp document in the public dataset. Not a foreign
  -- key because the schedule lives in Sanity; the page ignores an id that no
  -- longer matches a camp.
  camp_id        text check (char_length(camp_id) <= 120),
  location_slug  text check (char_length(location_slug) <= 64),
  level          text check (level in ('intermediate', 'advanced')),
  updated_at     timestamptz not null default now()
);

comment on table public.camp_choices is
  'Which camp a member says they are on. Personalisation only, not access: it picks the countdown, the venue notes and the fitness week. Every column is the member''s own.';

create table public.camp_fitness_ticks (
  member_id    uuid not null references public.camp_members (id) on delete cascade,
  -- "<campDoc _id>:<session _key>" from the ski fit programme in Sanity.
  session_key  text not null check (char_length(session_key) between 3 and 160),
  done_at      timestamptz not null default now(),
  primary key (member_id, session_key)
);

comment on table public.camp_fitness_ticks is
  'Ski fit sessions a member has marked done. Keyed by Sanity ids, so a session renamed in the Studio keeps its ticks.';

-- ---------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER, active rows only, as in 0008.
-- ---------------------------------------------------------------------------

create function public.camp_role_of_me()
returns public.camp_role
language sql stable security definer set search_path = public as $$
  select role from public.camp_members
  where id = auth.uid() and active;
$$;

create function public.camp_is_active()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.camp_members where id = auth.uid() and active
  );
$$;

create function public.camp_is_coach()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.camp_role_of_me() in ('coach', 'admin'), false);
$$;

create function public.camp_is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.camp_role_of_me() = 'admin', false);
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.camp_role_of_me()',
    'public.camp_is_active()',
    'public.camp_is_coach()',
    'public.camp_is_admin()'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create function public.camp_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger camp_members_touch
  before update on public.camp_members
  for each row execute function public.camp_touch_updated_at();

create trigger camp_choices_touch
  before update on public.camp_choices
  for each row execute function public.camp_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security. Default deny; every policy is `to authenticated`.
-- ---------------------------------------------------------------------------

alter table public.camp_members       enable row level security;
alter table public.camp_choices       enable row level security;
alter table public.camp_fitness_ticks enable row level security;

-- camp_members: read your own row; coaches read everyone; only admins write.
create policy "campers read own profile"
  on public.camp_members for select to authenticated
  using (id = auth.uid());

create policy "coaches read all campers"
  on public.camp_members for select to authenticated
  using (public.camp_is_coach());

create policy "admins manage campers"
  on public.camp_members for all to authenticated
  using (public.camp_is_admin())
  with check (public.camp_is_admin());

-- camp_choices: an active member owns their own row outright.
create policy "campers read own choice"
  on public.camp_choices for select to authenticated
  using (member_id = auth.uid() and public.camp_is_active());

create policy "campers create own choice"
  on public.camp_choices for insert to authenticated
  with check (member_id = auth.uid() and public.camp_is_active());

create policy "campers update own choice"
  on public.camp_choices for update to authenticated
  using (member_id = auth.uid() and public.camp_is_active())
  with check (member_id = auth.uid() and public.camp_is_active());

create policy "coaches read all choices"
  on public.camp_choices for select to authenticated
  using (public.camp_is_coach());

-- camp_fitness_ticks: the same. Nobody else needs them.
create policy "campers read own ticks"
  on public.camp_fitness_ticks for select to authenticated
  using (member_id = auth.uid() and public.camp_is_active());

create policy "campers add own ticks"
  on public.camp_fitness_ticks for insert to authenticated
  with check (member_id = auth.uid() and public.camp_is_active());

create policy "campers remove own ticks"
  on public.camp_fitness_ticks for delete to authenticated
  using (member_id = auth.uid() and public.camp_is_active());

-- ---------------------------------------------------------------------------
-- Join codes: add the 'camps' area.
--
-- The functions below replace the ones from 0009 with the same signatures and
-- the same behaviour for 'portal' and 'hq'. The only change is the third
-- branch. The camps code goes in the booking confirmation email, so it is
-- shared more widely than the others: rotate it every season.
-- ---------------------------------------------------------------------------

alter table public.area_join_codes
  drop constraint area_join_codes_area_check;

alter table public.area_join_codes
  add constraint area_join_codes_area_check
  check (area in ('portal', 'hq', 'camps'));

create or replace function public.handle_join_code_signup()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target text;
  nm text;
begin
  target := public.area_for_join_code(new.raw_user_meta_data ->> 'join_code');
  if target is null then
    -- No code, or not one of ours. The account exists but reaches nothing:
    -- every area refuses a session with no profile row.
    return new;
  end if;

  nm := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );

  if target = 'portal' then
    insert into public.instructors (id, name, role)
    values (new.id, nm, 'instructor')
    on conflict (id) do nothing;
  elsif target = 'hq' then
    insert into public.staff_members (id, name, role)
    values (new.id, nm, 'staff')
    on conflict (id) do nothing;
  elsif target = 'camps' then
    insert into public.camp_members (id, name, role)
    values (new.id, nm, 'camper')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.redeem_join_code(candidate text, display_name text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  target text;
  uid uuid := auth.uid();
  nm text;
  em text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  target := public.area_for_join_code(candidate);
  if target is null then
    return null;
  end if;

  select email into em from auth.users where id = uid;
  nm := coalesce(nullif(btrim(display_name), ''), split_part(em, '@', 1));

  if target = 'portal' then
    insert into public.instructors (id, name, role)
    values (uid, nm, 'instructor')
    on conflict (id) do nothing;
  elsif target = 'hq' then
    insert into public.staff_members (id, name, role)
    values (uid, nm, 'staff')
    on conflict (id) do nothing;
  elsif target = 'camps' then
    insert into public.camp_members (id, name, role)
    values (uid, nm, 'camper')
    on conflict (id) do nothing;
  end if;

  return target;
end;
$$;

-- Grants carry over on create or replace, but restate them so this file reads
-- correctly on its own.
revoke execute on function public.redeem_join_code(text, text) from public, anon;
grant execute on function public.redeem_join_code(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Housekeeping, updated from 0009 to include campers:
--
--   delete from auth.users u
--   where u.last_sign_in_at is null
--     and u.created_at < now() - interval '7 days'
--     and not exists (select 1 from public.instructors   i where i.id = u.id)
--     and not exists (select 1 from public.staff_members s where s.id = u.id)
--     and not exists (select 1 from public.gap_members   g where g.id = u.id)
--     and not exists (select 1 from public.camp_members  c where c.id = u.id);
-- ---------------------------------------------------------------------------
