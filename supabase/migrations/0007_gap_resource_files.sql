-- Let a learning-hub resource be a file we host rather than a link we point at.
--
-- Until now every resource was a URL, which is right for a Vimeo recording or
-- the BASI website but wrong for the workshop decks: those are course material
-- students have paid for, and the repository that builds this site is public,
-- so they can go neither in `public/` nor anywhere else that serves them
-- unauthenticated.
--
-- They live in the private `gap-resources` storage bucket instead. A resource
-- now carries either a `url` (external) or a `storage_path` (ours). The portal
-- never links to storage directly — /gap/resource/[id] checks the session and
-- mints a short-lived signed URL, so a link copied out of the page stops
-- working in minutes and cannot be shared.

alter table public.gap_resources
  add column storage_path text;

comment on column public.gap_resources.storage_path is
  'Object path in the private gap-resources bucket, e.g. morzine-2027/workshops/x.pdf. Mutually exclusive with url in practice: storage_path wins when both are set.';

-- `url` was NOT NULL because a resource was always a link. A hosted file has no
-- external URL, so the requirement becomes "one of the two".
alter table public.gap_resources
  alter column url drop not null;

alter table public.gap_resources
  add constraint gap_resources_has_a_target
  check (url is not null or storage_path is not null);

-- ---------------------------------------------------------------------------
-- Storage access
--
-- storage.objects is default-deny, and a signed URL can only be minted for an
-- object the caller may read — so without a policy the portal could not issue
-- one either. This grants exactly what the portal needs and nothing more: a
-- signed-in GAP member may read objects under their own cohort's prefix.
--
-- Scoping to the cohort folder matters. Next season's material will sit beside
-- this season's in the same bucket, and a member of one intake has no business
-- reading another's.
--
-- Anonymous requests match nothing, so the bucket stays shut to the anon key
-- with no session — which is every request that has not been through a login.
-- ---------------------------------------------------------------------------

create policy "gap members read their own cohort's files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'gap-resources'
    and exists (
      select 1
      from public.gap_members m
      join public.gap_cohorts c on c.id = m.cohort_id
      where m.id = auth.uid()
        and m.active
        and storage.objects.name like c.slug || '/%'
    )
  );
