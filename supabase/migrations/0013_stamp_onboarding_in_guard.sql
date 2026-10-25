-- Stamp the onboarding submission in the guard, not in a separate call.
--
-- 0012 gave students a gap_mark_onboarding_submitted() function because the
-- guard refuses a student-supplied onboarding_submitted_at. That does not
-- work: SECURITY DEFINER changes the role, not auth.uid(), so the function's
-- own UPDATE still arrives at the guard as the student, and the guard dutifully
-- put the old null back. The details saved and the timestamp never did.
--
-- The simpler reading is that there is no separate act to record. A student
-- writing their own record IS the submission, and the guard is the one place
-- that already knows the write is theirs. So it stamps, instead of refusing.
--
--   * First write sets it. Later edits keep the original, so the column means
--     "when they first sent their details", not "when they last touched them";
--     updated_at already covers the second question.
--   * Staff clearing it reopens onboarding, and the student's next save stamps
--     it again, which is exactly what asking somebody to redo it should do.
--   * Staff still cannot set a time of their own choosing.

create or replace function public.gap_members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null then return new; end if;

  if public.gap_is_admin() then return new; end if;

  -- Staff editing somebody else: may clear the timestamp, never set one.
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

  -- Writing your own record is the submission. Keep the first time it happened.
  new.onboarding_submitted_at := coalesce(old.onboarding_submitted_at, now());
  return new;
end;
$$;

-- No longer reachable from anywhere, and it never worked.
drop function if exists public.gap_mark_onboarding_submitted();
