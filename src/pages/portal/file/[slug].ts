/**
 * Hand a signed-in instructor a file from the private portal-files bucket.
 *
 * The page links here, never to storage. This mints a signed URL good for two
 * minutes and redirects to it, so the link in the page is stable and useless
 * on its own: copied into a chat it gets someone a login screen, and a leaked
 * signed URL is dead within minutes.
 *
 * Middleware has already bounced anyone without a session. Whether this
 * particular account may read the bucket is decided by storage RLS, which
 * requires an active instructors row (migration 0011).
 */
import type { APIRoute } from 'astro';
import { createPortalClient, type PortalUser } from '../../../lib/portal/supabase';
import { fileBySlug } from '../../../lib/portal/files';

export const prerender = false;

const SIGNED_URL_TTL_SECONDS = 120;

export const GET: APIRoute = async ({ params, locals, cookies, request }) => {
  const user = locals.portalUser as PortalUser | null;
  if (!user) return new Response('Not found', { status: 404 });

  const file = params.slug ? fileBySlug(params.slug) : null;
  if (!file) return new Response('Not found', { status: 404 });

  const db = createPortalClient(cookies, request);
  const { data: signed, error } = await db.storage
    .from('portal-files')
    .createSignedUrl(file.path, SIGNED_URL_TTL_SECONDS, { download: file.filename });

  if (error || !signed?.signedUrl) {
    console.error('[portal] signing failed for', file.path, error?.message);
    return new Response('That file could not be fetched. Tell the office.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: signed.signedUrl, 'Cache-Control': 'private, no-store' },
  });
};
