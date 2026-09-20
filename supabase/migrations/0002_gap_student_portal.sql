-- GAP student portal — MVP schema.
--
-- Shares the Supabase project with the instructor portal (0001) but nothing
-- else: a GAP student is not an instructor, and `public.instructors` stays
-- untouched. Membership lives in `gap_members`, keyed on the same auth.users.
--
-- Run against the Supabase project referenced by SUPABASE_URL:
--   supabase db push
-- or paste into the SQL editor in the dashboard.
--
-- Shape of the thing: a cohort owns the course content (programme,
-- announcements, workbook modules, resources, checklist, resort guide,
-- essentials). A student owns their own work (self-assessments, module
-- progress, checklist ticks, experience log, feedback, check-ins, actions).
-- Coaches write the coach half of the assessment and verify experience hours.
--
-- RLS is default-deny throughout. A student sees their own cohort and their
-- own rows; a coach sees their cohort; an admin sees everything.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.gap_role            as enum ('student', 'coach', 'admin');
create type public.gap_activity_kind   as enum ('on_snow', 'off_snow', 'rest', 'assessment', 'travel');
create type public.gap_criterion_group as enum ('technical', 'teaching', 'professional');
create type public.gap_score_source    as enum ('self', 'coach');
create type public.gap_module_status   as enum ('not_started', 'in_progress', 'complete');
create type public.gap_log_status      as enum ('pending', 'verified', 'rejected');
create type public.gap_feedback_kind   as enum ('session', 'course', 'support');
create type public.gap_task_status     as enum ('open', 'done', 'cancelled');
create type public.gap_resource_kind   as enum ('video', 'slides', 'reading', 'exercise', 'template', 'link');

-- ---------------------------------------------------------------------------
-- Cohorts and membership
-- ---------------------------------------------------------------------------

create table public.gap_cohorts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  resort      text not null default '',
  starts_on   date not null,
  ends_on     date not null,
  -- The assessment the whole course points at. Drives the "N days until
  -- assessment" line on the dashboard, so it is separate from ends_on.
  assessment_on date,
  -- Total ski-school shadowing hours a student is expected to log.
  experience_target_hours numeric(5,1) not null default 35,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on)
);

comment on table public.gap_cohorts is
  'One GAP intake. Everything a student sees is scoped to their cohort.';

create table public.gap_members (
  id          uuid primary key references auth.users (id) on delete cascade,
  cohort_id   uuid references public.gap_cohorts (id) on delete set null,
  name        text not null,
  role        public.gap_role not null default 'student',
  phone       text,
  -- Emergency + dietary/medical are the sensitive fields. They live here
  -- rather than in a public profile because only the member and staff on the
  -- same cohort can read this table at all.
  emergency_name    text,
  emergency_phone   text,
  emergency_relation text,
  dietary     text,
  medical     text,
  arrival_notes text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.gap_members is
  'Portal profile for GAP students and coaches, one row per auth user. A coach or admin row may have a null cohort_id only if admin — coaches are scoped to a cohort.';

create index gap_members_cohort_idx on public.gap_members (cohort_id);

-- ---------------------------------------------------------------------------
-- Access helpers
--
-- SECURITY DEFINER so policies on gap_members can read gap_members without
-- recursing. Same pattern as portal_role_of in 0001.
-- ---------------------------------------------------------------------------

create function public.gap_role_of(uid uuid)
returns public.gap_role
language sql stable security definer set search_path = public as $$
  select role from public.gap_members where id = uid and active;
$$;

create function public.gap_cohort_of(uid uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select cohort_id from public.gap_members where id = uid and active;
$$;

create function public.gap_is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.gap_role_of(auth.uid()) = 'admin', false);
$$;

/** Coach or admin. The write side of the portal. */
create function public.gap_is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.gap_role_of(auth.uid()) in ('coach', 'admin'), false);
$$;

/** Can the caller see this cohort at all? Admins: any. Everyone else: theirs. */
create function public.gap_can_see_cohort(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when target is null then false
    when public.gap_is_admin() then true
    else target = public.gap_cohort_of(auth.uid())
  end;
$$;

/**
 * Can the caller act on this student's records? True for the student
 * themselves, and for staff on the same cohort. This is the single gate every
 * student-owned table uses, so "who can read my reflections" has one answer in
 * one place.
 */
create function public.gap_can_see_student(target uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when target = auth.uid() then true
    when public.gap_is_admin() then true
    when public.gap_is_staff() then
      (select cohort_id from public.gap_members where id = target)
        = public.gap_cohort_of(auth.uid())
    else false
  end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.gap_role_of(uuid)',
    'public.gap_cohort_of(uuid)',
    'public.gap_is_admin()',
    'public.gap_is_staff()',
    'public.gap_can_see_cohort(uuid)',
    'public.gap_can_see_student(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Cohort-owned content
-- ---------------------------------------------------------------------------

create table public.gap_activities (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references public.gap_cohorts (id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  title         text not null,
  kind          public.gap_activity_kind not null default 'on_snow',
  location      text,
  meeting_point text,
  map_url       text,
  coach         text,
  objective     text,
  bring         text,
  preparation   text,
  -- Free text rather than a module FK: the programme is edited by coaches in a
  -- hurry, and a dangling reference would break the page.
  workbook_module text,
  published     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.gap_activities is
  'The course programme. Coaches move these constantly as weather and snow change, so the student view always reads live.';

create index gap_activities_cohort_time_idx
  on public.gap_activities (cohort_id, starts_at);

create table public.gap_announcements (
  id           uuid primary key default gen_random_uuid(),
  cohort_id    uuid not null references public.gap_cohorts (id) on delete cascade,
  title        text not null,
  body         text not null,
  pinned       boolean not null default false,
  published_at timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null
);

create index gap_announcements_cohort_idx
  on public.gap_announcements (cohort_id, published_at desc);

create table public.gap_workbook_modules (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.gap_cohorts (id) on delete cascade,
  number      smallint not null,
  title       text not null,
  summary     text,
  -- MVP: the workbook itself stays a download, with completion tracked around
  -- it. Interactive module pages are phase two.
  download_url text,
  due_on      date,
  created_at  timestamptz not null default now(),
  unique (cohort_id, number)
);

create table public.gap_resources (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.gap_cohorts (id) on delete cascade,
  week        smallint,
  topic       text not null default 'General',
  title       text not null,
  kind        public.gap_resource_kind not null default 'link',
  url         text not null,
  description text,
  sort        smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index gap_resources_cohort_idx on public.gap_resources (cohort_id, week, sort);

create table public.gap_guide_entries (
  id         uuid primary key default gen_random_uuid(),
  cohort_id  uuid not null references public.gap_cohorts (id) on delete cascade,
  category   text not null,
  name       text not null,
  detail     text,
  address    text,
  map_url    text,
  phone      text,
  hours      text,
  sort       smallint not null default 0
);

create index gap_guide_cohort_idx on public.gap_guide_entries (cohort_id, category, sort);

create table public.gap_essentials (
  id        uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.gap_cohorts (id) on delete cascade,
  category  text not null,
  title     text not null,
  body      text not null,
  -- Emergency procedures and key contacts pin to the top of their category and
  -- are linked from the dashboard.
  urgent    boolean not null default false,
  sort      smallint not null default 0
);

create index gap_essentials_cohort_idx on public.gap_essentials (cohort_id, category, sort);

create table public.gap_checklist_items (
  id        uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.gap_cohorts (id) on delete cascade,
  section   text not null,
  label     text not null,
  note      text,
  required  boolean not null default false,
  -- Pre-arrival tasks are a different beast from "pack thermals": they have a
  -- deadline and the office chases them.
  pre_arrival boolean not null default false,
  sort      smallint not null default 0
);

create index gap_checklist_cohort_idx
  on public.gap_checklist_items (cohort_id, pre_arrival, sort);

-- ---------------------------------------------------------------------------
-- Benchmark criteria
--
-- Global rather than per-cohort: this is the BASI-shaped framework the whole
-- school assesses against. `active` retires a criterion without deleting the
-- history of scores that point at it.
-- ---------------------------------------------------------------------------

create table public.gap_criteria (
  id         uuid primary key default gen_random_uuid(),
  -- Named group_key, not "group": `group` is a reserved word, and a column
  -- that has to be quoted in every statement is a bug waiting on the first
  -- person who forgets. The app aliases it back to `group` in its select.
  group_key  public.gap_criterion_group not null,
  code       text not null unique,
  label      text not null,
  help       text,
  sort       smallint not null default 0,
  active     boolean not null default true
);

comment on table public.gap_criteria is
  'The six-point benchmark framework. Headings are configurable to match the relevant BASI course — edit here, not in code.';

create table public.gap_scores (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.gap_members (id) on delete cascade,
  criterion_id uuid not null references public.gap_criteria (id) on delete cascade,
  source       public.gap_score_source not null,
  score        smallint not null check (score between 1 and 6),
  comment      text,
  action       text,
  evidence_url text,
  assessed_by  uuid references auth.users (id) on delete set null,
  assessed_at  timestamptz not null default now()
);

comment on table public.gap_scores is
  'Append-only assessment history. The portal reads the latest and previous row per (student, criterion, source) so a trend is available without a separate snapshot table.';

create index gap_scores_lookup_idx
  on public.gap_scores (student_id, criterion_id, source, assessed_at desc);

-- ---------------------------------------------------------------------------
-- Student-owned records
-- ---------------------------------------------------------------------------

create table public.gap_module_progress (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.gap_members (id) on delete cascade,
  module_id   uuid not null references public.gap_workbook_modules (id) on delete cascade,
  status      public.gap_module_status not null default 'not_started',
  notes       text,
  evidence_url text,
  coach_comment text,
  updated_at  timestamptz not null default now(),
  unique (student_id, module_id)
);

create table public.gap_checklist_progress (
  student_id uuid not null references public.gap_members (id) on delete cascade,
  item_id    uuid not null references public.gap_checklist_items (id) on delete cascade,
  done       boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (student_id, item_id)
);

create table public.gap_experience_log (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.gap_members (id) on delete cascade,
  happened_on     date not null,
  organisation    text not null,
  instructor_observed text,
  location        text,
  group_level     text,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  student_role    text,
  objective       text,
  observations    text,
  reflection      text,
  evidence_url    text,
  status          public.gap_log_status not null default 'pending',
  verifier_note   text,
  verified_by     uuid references auth.users (id) on delete set null,
  verified_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.gap_experience_log is
  'Shadowing and ski-school hours in a BASI-compatible shape. Students cannot set status — the guard trigger forces every student write back to pending.';

create index gap_experience_student_idx
  on public.gap_experience_log (student_id, happened_on desc);

create table public.gap_tasks (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.gap_members (id) on delete cascade,
  title      text not null,
  detail     text,
  due_on     date,
  status     public.gap_task_status not null default 'open',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gap_tasks is
  'Personal action plan. Coaches assign, students mark done.';

create index gap_tasks_student_idx on public.gap_tasks (student_id, status, due_on);

create table public.gap_feedback (
  id         uuid primary key default gen_random_uuid(),
  cohort_id  uuid references public.gap_cohorts (id) on delete set null,
  student_id uuid references public.gap_members (id) on delete set null,
  kind       public.gap_feedback_kind not null,
  -- Support requests carry a category (accommodation, coaching, welfare…).
  category   text,
  subject    text,
  rating     smallint check (rating between 1 and 5),
  body       text not null,
  -- Confidential feedback is readable by admins only, not by the coach it may
  -- be about. Enforced in the policy, not in the page.
  confidential boolean not null default false,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

create index gap_feedback_cohort_idx on public.gap_feedback (cohort_id, created_at desc);

create table public.gap_checkins (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.gap_members (id) on delete cascade,
  week       smallint not null,
  confidence smallint check (confidence between 1 and 5),
  energy     smallint check (energy between 1 and 5),
  improved   text,
  struggling text,
  focus      text,
  wants_chat boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, week)
);

comment on table public.gap_checkins is
  'Two-minute weekly reflection. wants_chat is the flag that matters — it is how a struggling student raises a hand without having to start the conversation.';

-- ---------------------------------------------------------------------------
-- Guards
--
-- Policies decide which rows you may touch. These triggers decide which
-- columns, which policies cannot express.
-- ---------------------------------------------------------------------------

/** Students may correct their own details but never their role or cohort. */
create function public.gap_members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.gap_is_admin() then return new; end if;
  new.role      := old.role;
  new.cohort_id := old.cohort_id;
  new.active    := old.active;
  return new;
end;
$$;

create trigger gap_members_guard
  before update on public.gap_members
  for each row execute function public.gap_members_guard();

/**
 * A self-assessment is the student's own view; a coach assessment is the
 * coach's. Neither may be filed under the other's name, and assessed_by is
 * always the caller.
 */
create function public.gap_scores_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.assessed_by := auth.uid();
  new.assessed_at := now();
  if not public.gap_is_staff() then
    new.source     := 'self';
    new.student_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger gap_scores_guard
  before insert on public.gap_scores
  for each row execute function public.gap_scores_guard();

/**
 * Verification is a coach act. A student editing their own entry — including
 * editing one that was already verified — sends it back to pending, because
 * the hours on a verified entry must be the hours a coach actually saw.
 */
create function public.gap_experience_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();

  if public.gap_is_staff() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.verified_by := auth.uid();
      new.verified_at := now();
    end if;
    return new;
  end if;

  new.status       := 'pending';
  new.verifier_note := null;
  new.verified_by  := null;
  new.verified_at  := null;
  if tg_op = 'INSERT' then new.student_id := auth.uid(); end if;
  return new;
end;
$$;

create trigger gap_experience_guard
  before insert or update on public.gap_experience_log
  for each row execute function public.gap_experience_guard();

/** Coaches assign actions; students may only move the status. */
create function public.gap_tasks_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.gap_is_staff() then return new; end if;
  new.title      := old.title;
  new.detail     := old.detail;
  new.due_on     := old.due_on;
  new.student_id := old.student_id;
  return new;
end;
$$;

create trigger gap_tasks_guard
  before update on public.gap_tasks
  for each row execute function public.gap_tasks_guard();

/**
 * The coach comment on a workbook module is the coach's. Without this a
 * student owns the row — it is their reflection — and could write their own
 * feedback into it.
 */
create function public.gap_module_progress_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.gap_is_staff() then return new; end if;
  new.student_id    := auth.uid();
  new.coach_comment := case when tg_op = 'UPDATE' then old.coach_comment else null end;
  return new;
end;
$$;

create trigger gap_module_progress_guard
  before insert or update on public.gap_module_progress
  for each row execute function public.gap_module_progress_guard();

/**
 * `handled` is the coach dashboard's queue flag. A student setting it on
 * submission would file a support request that never appears in the queue.
 */
create function public.gap_feedback_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.gap_is_staff() then return new; end if;
  new.handled    := false;
  new.student_id := auth.uid();
  return new;
end;
$$;

create trigger gap_feedback_guard
  before insert on public.gap_feedback
  for each row execute function public.gap_feedback_guard();

create function public.gap_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger gap_checklist_progress_touch
  before update on public.gap_checklist_progress
  for each row execute function public.gap_touch_updated_at();

create trigger gap_activities_touch
  before update on public.gap_activities
  for each row execute function public.gap_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.gap_cohorts            enable row level security;
alter table public.gap_members            enable row level security;
alter table public.gap_activities         enable row level security;
alter table public.gap_announcements      enable row level security;
alter table public.gap_workbook_modules   enable row level security;
alter table public.gap_resources          enable row level security;
alter table public.gap_guide_entries      enable row level security;
alter table public.gap_essentials         enable row level security;
alter table public.gap_checklist_items    enable row level security;
alter table public.gap_criteria           enable row level security;
alter table public.gap_scores             enable row level security;
alter table public.gap_module_progress    enable row level security;
alter table public.gap_checklist_progress enable row level security;
alter table public.gap_experience_log     enable row level security;
alter table public.gap_tasks              enable row level security;
alter table public.gap_feedback           enable row level security;
alter table public.gap_checkins           enable row level security;

-- Cohorts -------------------------------------------------------------------

create policy "see own cohort" on public.gap_cohorts for select to authenticated
  using (public.gap_can_see_cohort(id));

create policy "admins manage cohorts" on public.gap_cohorts for all to authenticated
  using (public.gap_is_admin()) with check (public.gap_is_admin());

-- Members -------------------------------------------------------------------

create policy "see own profile" on public.gap_members for select to authenticated
  using (id = auth.uid());

-- Staff see the cohort roster. Students deliberately do not: a student
-- directory is a phase-two feature and it would expose dietary and medical
-- notes held on the same row.
create policy "staff see cohort roster" on public.gap_members for select to authenticated
  using (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id));

create policy "update own profile" on public.gap_members for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "admins manage members" on public.gap_members for all to authenticated
  using (public.gap_is_admin()) with check (public.gap_is_admin());

-- Cohort content ------------------------------------------------------------
--
-- One shape repeated: read if the cohort is yours, write if you are staff on
-- it. Written out per table rather than generated, so each is greppable.

create policy "read activities" on public.gap_activities for select to authenticated
  using (public.gap_can_see_cohort(cohort_id) and (published or public.gap_is_staff()));
create policy "staff write activities" on public.gap_activities for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id))
  with check (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id));

create policy "read announcements" on public.gap_announcements for select to authenticated
  using (public.gap_can_see_cohort(cohort_id));
create policy "staff write announcements" on public.gap_announcements for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id))
  with check (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id));

create policy "read modules" on public.gap_workbook_modules for select to authenticated
  using (public.gap_can_see_cohort(cohort_id));
create policy "staff write modules" on public.gap_workbook_modules for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id))
  with check (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id));

create policy "read resources" on public.gap_resources for select to authenticated
  using (public.gap_can_see_cohort(cohort_id));
create policy "staff write resources" on public.gap_resources for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id))
  with check (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id));

create policy "read guide" on public.gap_guide_entries for select to authenticated
  using (public.gap_can_see_cohort(cohort_id));
create policy "staff write guide" on public.gap_guide_entries for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id))
  with check (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id));

create policy "read essentials" on public.gap_essentials for select to authenticated
  using (public.gap_can_see_cohort(cohort_id));
create policy "staff write essentials" on public.gap_essentials for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id))
  with check (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id));

create policy "read checklist" on public.gap_checklist_items for select to authenticated
  using (public.gap_can_see_cohort(cohort_id));
create policy "staff write checklist" on public.gap_checklist_items for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id))
  with check (public.gap_is_staff() and public.gap_can_see_cohort(cohort_id));

-- Criteria are global and readable by anyone signed in; only admins edit them.
create policy "read criteria" on public.gap_criteria for select to authenticated
  using (true);
create policy "admins write criteria" on public.gap_criteria for all to authenticated
  using (public.gap_is_admin()) with check (public.gap_is_admin());

-- Student records -----------------------------------------------------------

create policy "read scores" on public.gap_scores for select to authenticated
  using (public.gap_can_see_student(student_id));
-- Students file self-assessments; the guard trigger pins source and student_id,
-- and this check refuses the row outright if it arrives claiming otherwise.
create policy "students self-assess" on public.gap_scores for insert to authenticated
  with check (student_id = auth.uid() and source = 'self');
create policy "staff assess" on public.gap_scores for insert to authenticated
  with check (public.gap_is_staff() and public.gap_can_see_student(student_id));
create policy "staff correct scores" on public.gap_scores for delete to authenticated
  using (public.gap_is_staff() and public.gap_can_see_student(student_id));

create policy "read module progress" on public.gap_module_progress for select to authenticated
  using (public.gap_can_see_student(student_id));
create policy "students own module progress" on public.gap_module_progress for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "staff comment on modules" on public.gap_module_progress for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_student(student_id))
  with check (public.gap_is_staff() and public.gap_can_see_student(student_id));

create policy "read checklist progress" on public.gap_checklist_progress for select to authenticated
  using (public.gap_can_see_student(student_id));
create policy "students own checklist" on public.gap_checklist_progress for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "read experience" on public.gap_experience_log for select to authenticated
  using (public.gap_can_see_student(student_id));
create policy "students read own experience" on public.gap_experience_log for select to authenticated
  using (student_id = auth.uid());
create policy "students log experience" on public.gap_experience_log for insert to authenticated
  with check (student_id = auth.uid());
create policy "students edit own experience" on public.gap_experience_log for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
-- Delete is pending-only. Once a coach has signed a session off, the record of
-- it stays: withdrawing it is an edit (which resets it to pending), not a
-- deletion. `for all` would have allowed the deletion silently.
create policy "students delete pending experience" on public.gap_experience_log for delete to authenticated
  using (student_id = auth.uid() and status = 'pending');
create policy "staff verify experience" on public.gap_experience_log for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_student(student_id))
  with check (public.gap_is_staff() and public.gap_can_see_student(student_id));

create policy "read tasks" on public.gap_tasks for select to authenticated
  using (public.gap_can_see_student(student_id));
create policy "students update own tasks" on public.gap_tasks for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "staff manage tasks" on public.gap_tasks for all to authenticated
  using (public.gap_is_staff() and public.gap_can_see_student(student_id))
  with check (public.gap_is_staff() and public.gap_can_see_student(student_id));

create policy "students read own feedback" on public.gap_feedback for select to authenticated
  using (student_id = auth.uid());
-- Confidential feedback bypasses the coach it might be about. Only admins.
create policy "staff read feedback" on public.gap_feedback for select to authenticated
  using (
    public.gap_can_see_cohort(cohort_id)
    and (
      (public.gap_is_staff() and not confidential)
      or public.gap_is_admin()
    )
  );
create policy "students submit feedback" on public.gap_feedback for insert to authenticated
  with check (student_id = auth.uid());
create policy "staff handle feedback" on public.gap_feedback for update to authenticated
  using (
    public.gap_can_see_cohort(cohort_id)
    and ((public.gap_is_staff() and not confidential) or public.gap_is_admin())
  )
  with check (public.gap_can_see_cohort(cohort_id));

create policy "read checkins" on public.gap_checkins for select to authenticated
  using (public.gap_can_see_student(student_id));
create policy "students own checkins" on public.gap_checkins for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Profile creation
--
-- There is no public sign-up: the office creates accounts in the Supabase
-- dashboard before the student travels. This trigger makes sure a GAP account
-- lands with a profile row. It only fires when the account is explicitly
-- marked as a GAP one, so instructor-portal accounts (0001) are untouched.
--
--   Authentication → Users → Add user → User Metadata:
--     { "gap": true, "name": "Ada Lovelace", "cohort": "morzine-2027" }
-- ---------------------------------------------------------------------------

create function public.handle_new_gap_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_cohort uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'gap', 'false') not in ('true', 't', '1') then
    return new;
  end if;

  select id into target_cohort
    from public.gap_cohorts
   where slug = nullif(new.raw_user_meta_data ->> 'cohort', '');

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

create trigger on_auth_user_created_gap
  after insert on auth.users
  for each row execute function public.handle_new_gap_user();
