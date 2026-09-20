-- Self-enrolment with a course code.
--
-- A student goes to /gap/join, gives their name, email and the code for their
-- intake, and gets an account. No office involvement and no passwords sent by
-- hand.
--
-- The security property that makes this safe is that **the code is checked in
-- the database, not in the page**. Signing up is a normal Supabase call with
-- the anon key, so anyone can make it directly, bypassing our form. What they
-- cannot bypass is this trigger: without a code that matches an open cohort,
-- no `gap_members` row is created, and `getGapUser` returns null for a session
-- with no profile. The account exists and can see nothing.
--
-- That is also why public sign-up can be turned back on. It was switched off in
-- migration 0003's era because `handle_new_portal_user` handed an instructors
-- row — and with it safeguarding, pay rates and the code of conduct — to every
-- account created. 0004 gated that behind `portal: true`, and this gates the
-- GAP side behind a code. Both profiles are now explicit opt-in, so an account
-- with neither is inert.

-- ---------------------------------------------------------------------------
-- The code
-- ---------------------------------------------------------------------------

alter table public.gap_cohorts
  add column join_code text;

comment on column public.gap_cohorts.join_code is
  'Course code students enter at /gap/join. NULL closes self-enrolment for the cohort. Rotate it by updating this column — existing accounts are unaffected.';

-- Case-insensitive uniqueness: students will type it in whatever case they
-- like, and two cohorts sharing a code would be ambiguous.
create unique index gap_cohorts_join_code_idx
  on public.gap_cohorts (lower(join_code))
  where join_code is not null;

-- ---------------------------------------------------------------------------
-- Code lookup for the join page
--
-- SECURITY DEFINER so an anonymous visitor can check a code without being able
-- to read gap_cohorts, which is behind RLS. It takes a code and returns the
-- cohort, so it never reveals a code anyone does not already have, and it
-- cannot be used to enumerate cohorts.
-- ---------------------------------------------------------------------------

create function public.gap_cohort_for_join_code(code text)
returns table (cohort_slug text, cohort_name text, resort text, starts_on date)
language sql
stable
security definer
set search_path = public
as $$
  select slug, name, resort, starts_on
  from public.gap_cohorts
  where active
    and join_code is not null
    and lower(join_code) = lower(trim(code))
  limit 1;
$$;

revoke execute on function public.gap_cohort_for_join_code(text) from public;
grant execute on function public.gap_cohort_for_join_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profile creation, now gated on the code
--
-- Replaces the version from 0002. A GAP profile is created only when the
-- metadata carries a code that matches an open cohort, and the profile is
-- attached to the cohort the CODE names — not to whatever cohort the metadata
-- asked for. Those are different things: trusting the metadata's cohort would
-- let someone with the code for one intake put themselves on another.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_gap_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  supplied_code text;
  target_cohort uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'gap', 'false') not in ('true', 't', '1') then
    return new;
  end if;

  supplied_code := nullif(trim(new.raw_user_meta_data ->> 'join_code'), '');
  if supplied_code is null then
    return new;
  end if;

  select id into target_cohort
    from public.gap_cohorts
   where active
     and join_code is not null
     and lower(join_code) = lower(supplied_code);

  -- No match: the account is created but stays profile-less and therefore
  -- cannot reach anything in the portal.
  if target_cohort is null then
    return new;
  end if;

  insert into public.gap_members (id, cohort_id, name)
  values (
    new.id,
    target_cohort,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Give the live cohort a code.
-- ---------------------------------------------------------------------------

update public.gap_cohorts set join_code = 'MORZINE27' where slug = 'morzine-2027';
