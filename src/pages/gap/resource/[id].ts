/**
 * Hand a signed-in member a file from the private resources bucket.
 *
 * The portal never links to storage directly. It links here, and here mints a
 * short-lived signed URL and redirects to it. Three things follow from that:
 *
 *  - The link in the page is stable and meaningless on its own. Copying it out
 *    and sending it to somebody gets them a login page.
 *  - The signed URL expires in minutes, so even a leaked one dies quickly.
 *  - Access is decided per request against the current session, not baked into
 *    a URL at render time.
 *
 * Middleware has already established the session and bounced anyone without
 * one, so reaching this code means signed in. What it has not checked is
 * whether this particular resource belongs to this member's cohort — RLS does
 * that, twice: once selecting the row, once signing the object.
 */
import type { APIRoute } from 'astro';
import { createGapClient, type GapUser } from '../../../lib/gap/supabase';

export const prerender = false;

/**
 * Long enough to start a download on a slow chalet connection, short enough
 * that a URL pasted into a group chat is dead before anyone opens it.
 */
const SIGNED_URL_TTL_SECONDS = 120;

export const GET: APIRoute = async ({ params, locals, cookies, request }) => {
  const user = locals.gapUser as GapUser | null;
  if (!user) return new Response('Not found', { status: 404 });

  const id = params.id;
  if (!id) return new Response('Not found', { status: 404 });

  const db = createGapClient(cookies, request);

  // RLS limits this to resources on the member's own cohort, so a guessed id
  // from another intake returns nothing and is indistinguishable from a typo.
  const { data: resource } = await db
    .from('gap_resources')
    .select('title, storage_path')
    .eq('id', id)
    .maybeSingle();

  if (!resource?.storage_path) return new Response('Not found', { status: 404 });

  const { data: signed, error } = await db.storage
    .from('gap-resources')
    .createSignedUrl(resource.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: false,
    });

  if (error || !signed?.signedUrl) {
    return new Response('That file could not be opened. Tell a coach.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: signed.signedUrl,
      // Never cached, never indexed: the target is short-lived and personal.
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
};
