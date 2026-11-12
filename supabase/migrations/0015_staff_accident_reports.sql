-- ---------------------------------------------------------------------------
-- 0015: Peak HQ staff file and read accident reports.
--
-- David's decision, 12 November 2026: every active HQ staff member can file an
-- accident report and read every report in full, the same as instructors
-- (0010). Booking staff take the calls about incidents and deal with the
-- clients afterwards, so they need the record.
--
-- The reports hold special-category health data about named people, often
-- children. Widening who can read them is a privacy decision; the privacy
-- notice must say that office staff, as well as instructors, can view them.
-- ---------------------------------------------------------------------------

-- A report could only be filed by someone with an instructor profile. Staff
-- have a staff_members row instead, so authorship now points at the login
-- itself. Still `on delete set null`: the report outlives the account, and
-- filed_by_name keeps who filed it.
alter table public.accident_reports
  drop constraint accident_reports_filed_by_fkey;

alter table public.accident_reports
  add constraint accident_reports_filed_by_fkey
  foreign key (filed_by) references auth.users (id) on delete set null;

create policy "staff read reports"
  on public.accident_reports for select to authenticated
  using (public.staff_is_active());

create policy "staff file reports"
  on public.accident_reports for insert to authenticated
  with check (public.staff_is_active() and filed_by = auth.uid());

create policy "staff amend own reports"
  on public.accident_reports for update to authenticated
  using (filed_by = auth.uid() and public.staff_is_active())
  with check (filed_by = auth.uid() and public.staff_is_active());

comment on table public.accident_reports is
  'Accident and injury reports filed by instructors and HQ staff. Contains special-category health data about named individuals. Retention: 10 years. Readable by every active instructor (decision of 2026-10-13) and every active HQ staff member (decision of 2026-11-12).';
