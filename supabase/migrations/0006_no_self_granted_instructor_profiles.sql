-- Stop creating instructor profiles from user metadata.
--
-- 0004 gated `handle_new_portal_user` on `portal: true` in raw_user_meta_data.
-- That was sound while sign-up was disabled and every account was made by an
-- admin. It stopped being sound the moment 0005 re-opened sign-up, because the
-- metadata on a self-service sign-up is supplied by whoever is signing up:
--
--   supabase.auth.signUp({ email, password,
--     options: { data: { portal: true } } })   -- → instructors row, tier 1+2
--
-- Verified against this project: that call produced an instructors row at the
-- default 'instructor' role, which reads safeguarding, pay rates and the code
-- of conduct.
--
-- There is no version of this trigger that is safe, because there is nothing
-- un-forgeable in a sign-up to key it on. The GAP trigger survives only because
-- it does not trust its input: it takes a code and checks it against
-- gap_cohorts, so a caller asserting membership proves nothing by itself.
-- Instructors have no such shared secret, and should not be given one — they
-- are staff, added deliberately, a handful of times a season.
--
-- So instructor profiles are now created explicitly by an admin. One row, once,
-- by someone who already has the rights to write it.

drop trigger if exists on_auth_user_created_portal on auth.users;
drop function if exists public.handle_new_portal_user();

-- ---------------------------------------------------------------------------
-- Clean up anything the metadata gate let through.
--
-- Narrow on purpose: only untouched defaults, and only where the row belongs to
-- an account that also holds a GAP profile or has never signed in. A real
-- instructor's profile is left alone.
-- ---------------------------------------------------------------------------

delete from public.instructors i
where i.role = 'instructor'
  and coalesce(array_length(i.resorts, 1), 0) = 0
  and (
    exists (select 1 from public.gap_members g where g.id = i.id)
    or exists (
      select 1 from auth.users u
      where u.id = i.id and u.last_sign_in_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- How to add an instructor now
--
--   1. Authentication → Users → Add user (no special metadata needed).
--   2. Then, in the SQL editor:
--
--        insert into public.instructors (id, name, role, resorts)
--        select id, 'Ada Lovelace', 'instructor', array['Morzine']
--        from auth.users where email = 'ada@example.com';
--
-- Roles: 'instructor' sees tiers 1–2, 'office' and 'admin' see all three.
-- ---------------------------------------------------------------------------

comment on table public.instructors is
  'Portal profile, one row per auth user. Created explicitly by an admin — there is deliberately no trigger, because sign-up metadata is supplied by the person signing up and cannot gate access. `role` decides which document tiers are visible.';
