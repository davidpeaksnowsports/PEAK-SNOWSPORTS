/**
 * Keep the Supabase project from pausing, and say so when it has.
 *
 * Free-tier Supabase projects pause themselves after about a week without
 * activity. When that happens nothing looks broken: every page still renders,
 * the login form still appears, and submitting it simply fails. All three
 * portals go down together and the first anyone knows is a student saying
 * their password does not work. That happened on 2026-11-10.
 *
 * So this does two jobs, and the second is the more valuable one:
 *
 *   1. Makes a real query, daily, which is what stops the pause.
 *   2. Emails when the query fails, so a paused or broken project announces
 *      itself instead of waiting to be discovered.
 *
 * It is a workaround. A paid Supabase project never pauses, and if that
 * happens this can go.
 *
 * The query runs with the anon key against gap_cohort_for_join_code, which is
 * the one database function anonymous callers may execute. It is given a code
 * that matches nothing, so it returns no rows: the point is that Postgres
 * served a query, not what came back.
 */
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { notifyStaff } from '../../lib/gap/notify';

export const prerender = false;

/**
 * Astro exposes .env through import.meta.env in dev and process.env in a
 * Vercel function; the rest of the codebase reads both, so this does too.
 */
const env = (name: string) =>
  (import.meta.env as Record<string, string | undefined>)[name] ??
  process.env[name];

/** Vercel cron sends this; a browser hitting the URL does not. */
function authorised(request: Request): boolean {
  const secret = env('CRON_SECRET');
  // Without a secret configured the endpoint is harmless anyway: it performs
  // one read that returns nothing. Guarding it is still worth doing when the
  // secret exists, so the alert cannot be triggered by anyone passing by.
  if (!secret) return true;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export const GET: APIRoute = async ({ request }) => {
  if (!authorised(request)) {
    return new Response('Not found', { status: 404 });
  }

  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_ANON_KEY');

  if (!url || !key) {
    return Response.json(
      { ok: false, reason: 'SUPABASE_URL or SUPABASE_ANON_KEY is not set' },
      { status: 500 },
    );
  }

  const started = Date.now();
  let failure: string | null = null;

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await db.rpc('gap_cohort_for_join_code', {
      code: '__keepalive__',
    });
    if (error) failure = error.message;
  } catch (e) {
    // A paused project does not answer at all, so this is the branch that
    // catches the case the whole endpoint exists for.
    failure = e instanceof Error ? e.message : String(e);
  }

  const ms = Date.now() - started;

  if (failure) {
    // Logged as well as emailed. notifyStaff is deliberately best-effort and
    // swallows its own errors, so without this a Resend outage on the same day
    // would leave no trace of the Supabase one.
    console.error('[keep-supabase-awake] Supabase unreachable:', failure);

    const emailed = await notifyStaff({
      subject: 'Peak portals: Supabase is not responding',
      lines: [
        'The daily keep-alive check could not reach Supabase.',
        '',
        `Error: ${failure}`,
        '',
        'While this is the case nobody can sign in to /gap, /portal or /hq.',
        'The pages still load and the login form still appears, which is what',
        'makes it easy to miss.',
        '',
        'Most likely the project has paused itself, which free-tier projects do',
        'after about a week of inactivity. Restore it at:',
        'https://supabase.com/dashboard/project/puszptdfaurcvudinpmk',
        '',
        'A paid project never pauses, which would remove this failure mode.',
      ],
    });

    return Response.json({ ok: false, ms, error: failure, emailed }, { status: 503 });
  }

  return Response.json({ ok: true, ms });
};
