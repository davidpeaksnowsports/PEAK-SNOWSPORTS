-- Open sign-up for the ski camp portal: an email address, nothing else.
--
-- 0016 gated /camps on a join code, like the instructor hub and Peak HQ. By
-- David's decision, campers now sign in with an emailed link and no code. Camp
-- content is coaching material for clients, not policy or personal data, and
-- the friction of a code was costing more than it protected.
--
-- How it stays safe without a code:
--
--   * No trigger. Nothing here reads sign-up metadata, so nothing a sign-up
--     claims can grant anything (see 0006 and 0009 for why that matters).
--   * The caller can only add THEMSELVES, and only as 'camper', the lowest
--     role. Coaches and admins are still made by hand in SQL.
--   * `on conflict do nothing`: an existing row is never changed, so a
--     deactivated camper (active = false) cannot reactivate themselves, and a
--     coach is never demoted.
--   * It opens /camps only. Every other area still resolves against its own
--     table and still needs its code or an admin.
--
-- The 'camps' join code from 0016 still works if one is ever set, but the site
-- no longer asks for it.

create function public.join_camps(display_name text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  em text;
  nm text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select email into em from auth.users where id = uid;
  nm := left(coalesce(nullif(btrim(display_name), ''), split_part(em, '@', 1)), 120);

  insert into public.camp_members (id, name, role)
  values (uid, nm, 'camper')
  on conflict (id) do nothing;

  return exists (select 1 from public.camp_members where id = uid and active);
end;
$$;

comment on function public.join_camps(text) is
  'Adds the signed-in user to the ski camp portal as a camper. Never changes an existing row. Returns whether they now have active access.';

revoke execute on function public.join_camps(text) from public, anon;
grant execute on function public.join_camps(text) to authenticated;
