-- Downloadable files for the instructor hub: the invoice template, and
-- whatever else instructors need to take away and fill in.
--
-- A private bucket, not public/ in the repo, for the same reason everything
-- else is: github.com/davidpeaksnowsports/PEAK-SNOWSPORTS is public. Nothing
-- here is secret today, but a bucket that is private by default cannot leak
-- the next file somebody adds to it.
--
-- The site never links to storage. It links to /portal/file/<slug>, which
-- checks the session and mints a short-lived signed URL, the same pattern the
-- GAP portal uses for course material (0007).

insert into storage.buckets (id, name, public)
values ('portal-files', 'portal-files', false)
on conflict (id) do nothing;

-- Any instructor in good standing may read. Writes are service-role only, so
-- there is deliberately no insert, update or delete policy: files are added by
-- an admin from a terminal, not through the site.
create policy "instructors read portal files"
  on storage.objects for select to authenticated
  using (bucket_id = 'portal-files' and public.portal_is_active());
