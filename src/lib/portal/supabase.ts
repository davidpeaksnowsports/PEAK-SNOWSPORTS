/**
 * Supabase client for the instructor portal.
 *
 * Auth is entirely server-side: login is a plain HTML form that POSTs to an
 * Astro endpoint, the endpoint calls Supabase, and the session lands in
 * httpOnly cookies. Nothing Supabase-related is shipped to the browser, which
 * keeps the portal in line with the rest of the site (~zero JS by default) and
 * means the anon key never needs a PUBLIC_ prefix.
 *
 * Required env vars (Vercel + local .env, Preview and Production):
 *   SUPABASE_URL        , https://<project>.supabase.co
 *   SUPABASE_ANON_KEY   , the anon/publishable key. Safe by design — row-level
 *                         security is what protects the data, not this key.
 *
 * The service-role key is deliberately NOT used here. Nothing in the portal's
 * request path should be able to bypass RLS.
 */
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const url = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const anonKey =
  import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

/** True when both env vars are present. Pages render a setup notice when false. */
export const isPortalConfigured = Boolean(url && anonKey);

/**
 * Cookies Supabase writes are httpOnly and lax: the portal has no client-side
 * JS reading the session, and lax still allows the reset-password redirect
 * back from the email link.
 */
const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: import.meta.env.PROD,
} as const;

/**
 * Parse the incoming Cookie header. Astro's `cookies` object can get and set by
 * name but cannot enumerate, and @supabase/ssr needs every cookie at once so it
 * can reassemble sessions that were split across chunks.
 */
function readCookieHeader(request: Request) {
  const header = request.headers.get('cookie');
  if (!header) return [];
  return header
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return { name: pair, value: '' };
      return {
        name: pair.slice(0, idx),
        value: decodeURIComponent(pair.slice(idx + 1)),
      };
    });
}

/**
 * Build a request-scoped Supabase client bound to Astro's cookie jar. Must be
 * created per request — the session lives in the cookies of *this* visitor.
 */
export function createPortalClient(
  cookies: AstroCookies,
  request: Request,
): SupabaseClient {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => readCookieHeader(request),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          cookies.set(name, value, { ...COOKIE_OPTIONS, ...options });
        }
      },
    },
  });
}

/** The signed-in instructor's profile, as the portal needs it. */
export interface PortalUser {
  id: string;
  email: string;
  name: string;
  /** 'office' is legacy: office staff moved to Peak HQ (/hq). All roles see tiers 1–2. */
  role: 'instructor' | 'office' | 'admin';
  resorts: string[];
}

/**
 * The instructor profile for an authenticated user, or null.
 *
 * Takes the client rather than building one, because it must be the client
 * that holds the session. Straight after signInWithPassword the new session
 * exists only on that client and in the outgoing Set-Cookie headers — a client
 * built from the incoming request would see nobody.
 *
 * No instructors row means not an instructor, full stop. This project also
 * holds GAP students (who can self-enrol) and office staff, all with valid
 * sessions. A signed-in account is not an authorised one; only an
 * admin-created profile is. This used to fall back to a default 'instructor'
 * profile, which let any account read tier 1 and 2 documents.
 */
export async function portalProfileFor(
  supabase: SupabaseClient,
  user: User,
): Promise<PortalUser | null> {
  // RLS lets a user read only their own row, so this cannot leak anyone
  // else's profile.
  const { data: profile } = await supabase
    .from('instructors')
    .select('name, role, resorts, active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.active === false) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    name: profile.name || user.email?.split('@')[0] || 'Instructor',
    role: profile.role as PortalUser['role'],
    resorts: profile.resorts ?? [],
  };
}

/**
 * Resolve the current user from the request, or null. Uses getUser() rather
 * than getSession() because getUser() revalidates the JWT against Supabase —
 * getSession() trusts whatever is in the cookie, which is not good enough for
 * an auth guard.
 */
export async function getPortalUser(
  cookies: AstroCookies,
  request: Request,
): Promise<PortalUser | null> {
  if (!isPortalConfigured) return null;

  const supabase = createPortalClient(cookies, request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return portalProfileFor(supabase, user);
}

/**
 * Which document tiers the instructor hub shows. The same for every role:
 * tier 3 (staff-only documents) lives in Peak HQ at /hq, and there is no role
 * in this portal that should see it. It used to be visible to 'office' and
 * 'admin' here, from before office staff had a portal of their own.
 */
export function visibleTiers(_role: PortalUser['role']): number[] {
  return [1, 2];
}
