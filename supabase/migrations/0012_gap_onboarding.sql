-- Pre-arrival onboarding in the portal, and a way for staff to see sign-ups.
--
-- Onboarding was a HubSpot form the portal linked out to. The answers went to
-- HubSpot, so a coach who needed an emergency contact had to go and find them
-- somewhere else, and nothing in the portal knew whether a student had filled
-- it in. The student record already had most of the fields and they were all
-- empty, because nothing ever wrote to them.
--
-- This adds what the form needs beyond those, and a timestamp so "who has
-- onboarded" is a fact rather than a self-reported tick.

-- ---------------------------------------------------------------------------
-- Fields the form needs
--
-- Deliberately narrow. Each one is here because somebody has a use for it:
-- BASI need a date of birth to register a candidate, bindings are set from
-- height and weight, and an insurer and policy number are no use in an
-- accident if they are in a filing cabinet in Surrey.
--
-- Still NOT collected: passport scans and any other identity document. Those
-- need retention rules and a lawful-basis record that a form does not give
-- them, and the course does not need them held to run.
-- ---------------------------------------------------------------------------

alter table public.gap_members
  add column date_of_birth      date,
  add column insurance_provider text,
  add column insurance_policy   text,
  add column height_cm          smallint check (height_cm between 100 and 250),
  add column weight_kg          smallint check (weight_kg between 30 and 250),
  add column ski_boot_size      text,
  add column onboarding_submitted_at timestamptz;

comment on column public.gap_members.onboarding_submitted_at is
  'Set when the student submits the pre-arrival form. Null means not done. This is what the staff sign-ups view reports, rather than the checklist tick, which is the student saying they did it.';

comment on column public.gap_members.medical is
  'Free text the student supplies about medication, allergies and conditions a coach would need to know in an incident. Readable only by the student and staff on their cohort. Not an identity document and not a medical record.';

-- ---------------------------------------------------------------------------
-- Sign-ups, for staff
--
-- A coach needs the things that live in auth.users: the email address to
-- contact someone on, whether they ever confirmed it, and whether they have
-- signed in since. RLS cannot reach auth.users, so this is the one SECURITY
-- DEFINER read that does.
--
-- It is narrow on purpose. It returns only the columns above, only for
-- members of a cohort the caller can see, and only when the caller is staff.
-- A student calling it gets an empty set rather than an error, which is the
-- same answer they get from every other staff-only thing.
-- ---------------------------------------------------------------------------

create function public.gap_cohort_signups()
returns table (
  id                      uuid,
  name                    text,
  role                    public.gap_role,
  email                   text,
  active                  boolean,
  joined_at               timestamptz,
  email_confirmed         boolean,
  last_sign_in_at         timestamptz,
  onboarding_submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.name,
    m.role,
    u.email::text,
    m.active,
    m.created_at,
    u.email_confirmed_at is not null,
    u.last_sign_in_at,
    m.onboarding_submitted_at
  from public.gap_members m
  join auth.users u on u.id = m.id
  where public.gap_is_staff()
    and public.gap_can_see_cohort(m.cohort_id)
  order by m.created_at desc;
$$;

revoke execute on function public.gap_cohort_signups() from public, anon;
grant execute on function public.gap_cohort_signups() to authenticated;

-- ---------------------------------------------------------------------------
-- Writing the form
--
-- gap_members_guard already stops a student changing their own role, cohort or
-- active flag, so the new columns need no extra protection: a student may
-- write their own and nobody else's, which is exactly what onboarding is.
--
-- The timestamp is the exception. It is evidence that the form was submitted,
-- so the server sets it and a student cannot. Staff can clear it, which is how
-- you ask somebody to do it again.
-- ---------------------------------------------------------------------------

create or replace function public.gap_members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null then return new; end if;

  if public.gap_is_admin() then return new; end if;

  -- Staff may clear the timestamp to reopen onboarding, but not backdate it.
  if public.gap_is_staff() and new.id <> auth.uid() then
    if new.onboarding_submitted_at is not null
       and new.onboarding_submitted_at is distinct from old.onboarding_submitted_at then
      new.onboarding_submitted_at := old.onboarding_submitted_at;
    end if;
    return new;
  end if;

  new.role      := old.role;
  new.cohort_id := old.cohort_id;
  new.active    := old.active;

  -- Submitting is an act the server records, not a field the form posts.
  new.onboarding_submitted_at := old.onboarding_submitted_at;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Stamping the submission
--
-- A separate SECURITY DEFINER call rather than a column the page writes, so
-- the guard above can stay absolute about it. Sets it once; calling again on
-- an edit leaves the original submission time alone.
-- ---------------------------------------------------------------------------

create function public.gap_mark_onboarding_submitted()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare stamped timestamptz;
begin
  if auth.uid() is null then
    raise exception 'no session';
  end if;

  update public.gap_members
     set onboarding_submitted_at = coalesce(onboarding_submitted_at, now())
   where id = auth.uid()
  returning onboarding_submitted_at into stamped;

  return stamped;
end;
$$;

revoke execute on function public.gap_mark_onboarding_submitted() from public, anon;
grant execute on function public.gap_mark_onboarding_submitted() to authenticated;
