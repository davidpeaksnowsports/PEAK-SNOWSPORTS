-- Self sign-up for the instructor hub and Peak HQ, gated on a join code.
--
-- 0006 removed the old sign-up trigger because it keyed off raw_user_meta_data,
-- which whoever is signing up writes themselves. This brings sign-up back on
-- the only footing that works, the one the GAP portal already uses: the
-- metadata carries a *claim*, and a table decides whether it is true.
--
--   * The code names the area. A sign-up asking for 'portal' gets nothing;
--     matching the HQ code gets an HQ profile and only that.
--   * New accounts always land on the lowest role, 'instructor' or 'staff'.
--     Nobody signs themselves up as a manager or an admin.
--   * Nobody can read the codes. The table has RLS on and no policies at all,
--     so staff cannot look up the instructor code, or vice versa. Only
--     SECURITY DEFINER functions and the service role see them.
--
-- A code is a shared secret, like the office door key: anyone holding one can
-- make an account. Rotate them each season, and set `active = false` to close
-- sign-up. The codes themselves are NOT in this repo, which is public; see
-- PORTAL.md for how to set them.

create table public.area_join_codes (
  area        text primary key check (area in ('portal', 'hq')),
  code        text not null unique check (char_length(code) between 8 and 64),
  label       text,
  expires_at  timestamptz,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

comment on table public.area_join_codes is
  'One join code per signed-in area. Readable only by SECURITY DEFINER functions: RLS is on with no policies, so authenticated users cannot read it at all.';

alter table public.area_join_codes enable row level security;
-- Deliberately no policies. Default deny is the whole point.

-- ---------------------------------------------------------------------------
-- Which area does this code open, if any?
--
-- Not callable by anon or authenticated: exposing it would turn the code into
-- something an attacker could test against for free. The two functions below
-- are DEFINER and owned by the same role, so they can call it.
-- ---------------------------------------------------------------------------

create function public.area_for_join_code(candidate text)
returns text
language sql stable security definer set search_path = public as $$
  select area
  from public.area_join_codes
  where active
    and (expires_at is null or expires_at > now())
    and upper(btrim(code)) = upper(btrim(candidate))
  limit 1;
$$;

revoke execute on function public.area_for_join_code(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- New account: create the profile for whichever area the code names.
-- ---------------------------------------------------------------------------

create function public.handle_join_code_signup()
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
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created_join
  after insert on auth.users
  for each row execute function public.handle_join_code_signup();

-- ---------------------------------------------------------------------------
-- Existing account: add a second area.
--
-- This is how one person holds both an instructors row and a staff_members row
-- on a single login. `on conflict do nothing` means redeeming a code you have
-- already used changes nothing, and in particular never demotes an admin.
-- ---------------------------------------------------------------------------

create function public.redeem_join_code(candidate text, display_name text default null)
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
  end if;

  return target;
end;
$$;

revoke execute on function public.redeem_join_code(text, text) from public, anon;
grant execute on function public.redeem_join_code(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Housekeeping
--
-- A wrong code still creates an auth account, it just has no profile and so
-- reaches nothing. To clear those out:
--
--   delete from auth.users u
--   where u.last_sign_in_at is null
--     and u.created_at < now() - interval '7 days'
--     and not exists (select 1 from public.instructors   i where i.id = u.id)
--     and not exists (select 1 from public.staff_members s where s.id = u.id)
--     and not exists (select 1 from public.gap_members   g where g.id = u.id);
-- ---------------------------------------------------------------------------
