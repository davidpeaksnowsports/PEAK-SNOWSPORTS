-- Stop handing an instructor profile to every account that gets created.
--
-- `handle_new_portal_user` from 0001 inserted a row into public.instructors for
-- EVERY new auth.users row, unconditionally. When it was written that was the
-- only thing accounts existed for, so it was true by default.
--
-- It stopped being true when the GAP portal started creating accounts in the
-- same Supabase project. A student created for /gap also got an instructors row
-- at the default 'instructor' role, which grants read access to tier 1 and
-- tier 2 documents in /portal: safeguarding, pay rates, the code of conduct.
-- Nothing in the GAP portal hinted at it, and nothing in /portal rejected them,
-- because as far as that area was concerned they were a perfectly ordinary
-- instructor.
--
-- The GAP trigger already gates on `gap: true` in user metadata. This makes the
-- instructor trigger symmetrical: explicit opt-in, default deny. An account now
-- gets an instructors row only when it is created as an instructor account:
--
--   Authentication → Users → Add user → User Metadata:
--     { "portal": true, "name": "Ada Lovelace" }
--
-- This is also what makes it safe to consider self-registration later. With an
-- unconditional trigger, any signup route — an enrolment form, an invite link,
-- a reopened public signup — would have handed the handbook to whoever used it.

create or replace function public.handle_new_portal_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Explicit opt-in only.
  if coalesce(new.raw_user_meta_data ->> 'portal', 'false') not in ('true', 't', '1') then
    return new;
  end if;

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

-- ---------------------------------------------------------------------------
-- Clean up what the old trigger already created.
--
-- Any account that holds a GAP profile but was never meant to be an instructor
-- loses the instructor profile it was given by accident. Deliberately narrow:
-- it only removes rows that are still untouched defaults — role 'instructor',
-- no resorts — so a real instructor who also happens to coach on the GAP course
-- keeps their profile. Nothing references instructors.id yet, so there is
-- nothing to cascade.
-- ---------------------------------------------------------------------------

delete from public.instructors i
where exists (select 1 from public.gap_members g where g.id = i.id)
  and i.role = 'instructor'
  and coalesce(array_length(i.resorts, 1), 0) = 0;
