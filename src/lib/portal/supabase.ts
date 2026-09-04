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
import type { SupabaseClient } from '@supabase/supabase-js';
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
  /** 'instructor' | 'office' | 'admin' — drives which policy tier is visible. */
  role: 'instructor' | 'office' | 'admin';
  resorts: string[];
}

/**
 * Resolve the current user, or null. Uses getUser() rather than getSession()
 * because getUser() revalidates the JWT against Supabase — getSession() trusts
 * whatever is in the cookie, which is not good enough for an auth guard.
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

  // The profile row carries name, role and resorts. RLS lets a user read only
  // their own row, so this cannot leak anyone else's profile.
  const { data: profile } = await supabase
    .from('instructors')
    .select('name, role, resorts')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? '',
    // Fall back to the local-part of the email so a user whose profile row
    // hasn't been created yet still sees something sensible rather than blank.
    name: profile?.name ?? user.email?.split('@')[0] ?? 'Instructor',
    role: (profile?.role as PortalUser['role']) ?? 'instructor',
    resorts: profile?.resorts ?? [],
  };
}

/**
 * Which document tiers a role may read. Tier 3 (employer policies) is never
 * returned for an instructor — not merely hidden in the nav, but filtered out
 * of every query, so a guessed URL returns a 404 rather than the document.
 */
export function visibleTiers(role: PortalUser['role']): number[] {
  return role === 'instructor' ? [1, 2] : [1, 2, 3];
}
