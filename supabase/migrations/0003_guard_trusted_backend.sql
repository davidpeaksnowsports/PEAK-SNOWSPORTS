-- Let trusted backend connections through the column guards.
--
-- The guard triggers in 0001 and 0002 protect privileged columns — role,
-- cohort, verification status, coach comments — by reverting anything a
-- non-admin tries to write. They decide "non-admin" from auth.uid(), and they
-- assumed auth.uid() is always populated.
--
-- It is not. A service-role client and a superuser session in the SQL editor
-- both have auth.uid() = null, so both were treated as the least privileged
-- caller possible and had their writes silently reverted. That made the whole
-- thing unbootstrappable:
--
--   * `update public.instructors set role = 'admin' ...` — the documented
--     first step in PORTAL.md — reverted itself and reported success.
--   * The same for gap_members. With no admin able to exist, no coach could be
--     promoted either, because only an admin may set a role.
--   * Seed and backfill scripts could not write gap_scores, gap_experience_log,
--     gap_module_progress or gap_feedback at all: the guard set student_id to
--     null and the not-null constraint rejected the row.
--
-- A null auth.uid() cannot be an ordinary visitor. Every policy on these tables
-- is granted `to authenticated`, so an anonymous request is refused before a
-- trigger ever runs. Null therefore means the service-role key or a superuser
-- session — contexts that already bypass RLS entirely and are trusted by
-- definition. Passing them through the guard grants nothing they did not
-- already have; it just stops the guard corrupting their writes.
--
-- The service-role key is still never used by anything the site serves. It
-- belongs to scripts run by hand and to the Supabase dashboard.

-- ---------------------------------------------------------------------------
-- 0001 — instructor portal
-- ---------------------------------------------------------------------------

create or replace function public.instructors_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();

  -- Trusted backend: service role or superuser. Leave the row exactly as sent.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_portal_admin() then
    return new;
  end if;

  -- Non-admins keep whatever role and resorts they already had, whatever the
  -- update tried to set.
  new.role    := old.role;
  new.resorts := old.resorts;
  new.active  := old.active;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 0002 — GAP student portal
-- ---------------------------------------------------------------------------

create or replace function public.gap_members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null then return new; end if;
  if public.gap_is_admin() then return new; end if;
  new.role      := old.role;
  new.cohort_id := old.cohort_id;
  new.active    := old.active;
  return new;
end;
$$;

create or replace function public.gap_scores_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- A backend caller supplies student_id, source and assessed_by itself, and
  -- may be filing a historical assessment, so assessed_at is left alone too.
  if auth.uid() is null then return new; end if;

  new.assessed_by := auth.uid();
  new.assessed_at := now();
  if not public.gap_is_staff() then
    new.source     := 'self';
    new.student_id := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.gap_experience_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();

  if auth.uid() is null then return new; end if;

  if public.gap_is_staff() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.verified_by := auth.uid();
      new.verified_at := now();
    end if;
    return new;
  end if;

  new.status        := 'pending';
  new.verifier_note := null;
  new.verified_by   := null;
  new.verified_at   := null;
  if tg_op = 'INSERT' then new.student_id := auth.uid(); end if;
  return new;
end;
$$;

create or replace function public.gap_module_progress_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null then return new; end if;
  if public.gap_is_staff() then return new; end if;
  new.student_id    := auth.uid();
  new.coach_comment := case when tg_op = 'UPDATE' then old.coach_comment else null end;
  return new;
end;
$$;

create or replace function public.gap_feedback_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if public.gap_is_staff() then return new; end if;
  new.handled    := false;
  new.student_id := auth.uid();
  return new;
end;
$$;

create or replace function public.gap_tasks_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null then return new; end if;
  if public.gap_is_staff() then return new; end if;
  new.title      := old.title;
  new.detail     := old.detail;
  new.due_on     := old.due_on;
  new.student_id := old.student_id;
  return new;
end;
$$;
