-- Accident reports, filed from the instructor hub.
--
-- Replaces the paper form an instructor would fill in after an incident. The
-- fields follow the BASI Instructor Accident Recording Form, which exists to
-- record what happened while it is fresh, in case the accident later leads to
-- a claim.
--
-- WHAT THIS TABLE HOLDS
--
-- Health data about an identifiable person, frequently a child: a casualty's
-- name, contact details and the injury they sustained. Under GDPR that is
-- special-category data. Three consequences, all deliberate:
--
--   * RETENTION: ten years, David's decision on 2026-10-13. Personal injury
--     claims in France can be brought up to ten years from consolidation of
--     the injury, and a report that has been deleted cannot defend anyone.
--     Nothing expires automatically; see the cleanup query at the end.
--
--   * VISIBILITY: every active instructor can read every report in full,
--     David's decision on 2026-10-13, reaffirmed when asked to confirm. The
--     alternative offered was to show the incident to everyone and keep the
--     casualty's identity and injury to admins. The identifying fields are
--     kept in their own columns below so that remains a policy change rather
--     than a data migration.
--
--   * THE PRIVACY NOTICE must say that instructors can view these records.
--     Clients are entitled to know who sees data about them. The current
--     notice predates all of this.
--
-- Office staff in Peak HQ cannot see these at all. Add a policy if the booking
-- team needs them for insurer or client follow-up.

create type public.accident_resort as enum
  ('Morzine', 'Avoriaz', 'Les Gets', 'Chatel', 'Other');

create table public.accident_reports (
  id              uuid primary key default gen_random_uuid(),

  -- Who filed it. The name is snapshotted because the report outlives the
  -- account: an instructor leaving must not erase a ten-year legal record.
  filed_by        uuid references public.instructors (id) on delete set null,
  filed_by_name   text not null,

  -- The incident
  occurred_at     timestamptz not null,
  resort          public.accident_resort not null,
  resort_other    text,
  location        text,
  weather         text,
  snow            text,
  terrain         text,
  activity        text,
  description     text not null,

  -- Group context
  group_standard  text,
  group_detail    text,

  -- ---------------------------------------------------------------------
  -- Identifying and health data. Separate columns on purpose: this is the
  -- part that would be withheld if report visibility is ever narrowed.
  -- ---------------------------------------------------------------------
  casualty_name     text,
  casualty_contact  text,
  casualty_age      text,
  casualty_injury   text,
  prior_conditions  text,
  witness_name      text,
  witness_contact   text,

  -- What happened next
  first_aid        text,
  patrol_involved  boolean not null default false,
  police_involved  boolean not null default false,
  actions_taken    text,
  who_helped       text,

  -- Evidence
  equipment        text,
  binding_settings text,
  gradient         text,
  evidence_notes   text,

  -- For the team
  lessons          text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.accident_reports is
  'Accident and injury reports filed by instructors. Contains special-category health data about named individuals. Retention: 10 years. Readable by every active instructor, by decision of 2026-10-13.';

create index accident_reports_occurred_at_idx
  on public.accident_reports (occurred_at desc);

-- ---------------------------------------------------------------------------
-- Is the caller an instructor in good standing? SECURITY DEFINER so a policy
-- can ask without recursing through the policy it is part of.
-- ---------------------------------------------------------------------------

create function public.portal_is_active()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.instructors where id = auth.uid() and active
  );
$$;

revoke execute on function public.portal_is_active() from public, anon;
grant execute on function public.portal_is_active() to authenticated;

create trigger accident_reports_touch
  before update on public.accident_reports
  for each row execute function public.staff_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.accident_reports enable row level security;

-- Every active instructor reads every report, in full. See the note above.
create policy "instructors read reports"
  on public.accident_reports for select to authenticated
  using (public.portal_is_active());

-- File your own. filed_by is pinned to the caller by the guard below, so a
-- report cannot be filed in someone else's name.
create policy "instructors file reports"
  on public.accident_reports for insert to authenticated
  with check (public.portal_is_active() and filed_by = auth.uid());

-- Correct your own account of what happened. Reports are evidence, so edits
-- are limited to the person who wrote it, and admins.
create policy "authors amend own reports"
  on public.accident_reports for update to authenticated
  using (filed_by = auth.uid() and public.portal_is_active())
  with check (filed_by = auth.uid() and public.portal_is_active());

create policy "admins manage reports"
  on public.accident_reports for all to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

-- Nobody but an admin deletes a report: the ten-year clock is the point.
create function public.accident_reports_guard()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_portal_admin() or auth.uid() is null then
    return new;
  end if;
  -- A non-admin can never reassign authorship, on insert or on amendment.
  new.filed_by := coalesce(old.filed_by, auth.uid());
  if tg_op = 'UPDATE' then
    new.filed_by_name := old.filed_by_name;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger accident_reports_guard
  before insert or update on public.accident_reports
  for each row execute function public.accident_reports_guard();

-- ---------------------------------------------------------------------------
-- Retention: ten years from the incident.
--
-- Nothing deletes itself. Run this once a season, or put it behind a scheduled
-- job when you are ready:
--
--   delete from public.accident_reports
--   where occurred_at < now() - interval '10 years';
--
-- Deleting the whole row is right: an anonymised shell would still describe an
-- identifiable incident to anyone who was there.
-- ---------------------------------------------------------------------------
