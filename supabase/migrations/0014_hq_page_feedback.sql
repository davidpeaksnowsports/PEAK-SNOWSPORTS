-- ---------------------------------------------------------------------------
-- 0014: "Was this unclear?" on every Peak HQ document.
--
-- A member of staff can leave a note against the page they are reading. They
-- can write their own notes and read them back; managers read everyone's, on
-- /hq/team, and mark them dealt with. Nobody edits or deletes someone else's.
--
-- The page is identified by its Sanity slug, not a foreign key: documents live
-- in Sanity, not this database. A renamed slug leaves old notes pointing at
-- the old name, which is fine for a review list.
-- ---------------------------------------------------------------------------

create table public.hq_page_feedback (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.staff_members (id) on delete cascade,
  doc_slug     text not null check (doc_slug ~ '^[a-z0-9-]{1,96}$'),
  doc_title    text not null check (char_length(doc_title) between 1 and 200),
  note         text check (note is null or char_length(note) <= 2000),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index hq_page_feedback_open on public.hq_page_feedback (created_at desc)
  where resolved_at is null;

alter table public.hq_page_feedback enable row level security;

create policy "staff leave feedback"
  on public.hq_page_feedback for insert to authenticated
  with check (
    member_id = auth.uid()
    and public.staff_is_active()
    and resolved_at is null
  );

create policy "staff read own feedback"
  on public.hq_page_feedback for select to authenticated
  using (member_id = auth.uid());

create policy "managers read all feedback"
  on public.hq_page_feedback for select to authenticated
  using (public.staff_is_manager());

create policy "managers resolve feedback"
  on public.hq_page_feedback for update to authenticated
  using (public.staff_is_manager())
  with check (public.staff_is_manager());

-- Managers may only change resolved_at. Column grants, not a policy: RLS
-- decides which rows, grants decide which columns.
revoke update on public.hq_page_feedback from authenticated;
grant update (resolved_at) on public.hq_page_feedback to authenticated;
revoke all on public.hq_page_feedback from anon;
