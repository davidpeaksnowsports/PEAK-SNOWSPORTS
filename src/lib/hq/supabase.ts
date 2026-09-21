/**
 * Supabase auth for Peak HQ, the staff portal at /hq.
 *
 * A thin layer over the instructor portal's client, like the GAP portal's:
 * same Supabase project, same env vars, same httpOnly-cookie, entirely
 * server-side auth. What differs is the profile. A staff member is a row in
 * `staff_members`, created by an admin — never by a sign-up trigger (see
 * migration 0006 for why no trigger can do that safely).
 *
 * Env vars (shared, no PUBLIC_ prefix, server-only):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { createPortalClient, isPortalConfigured } from '../portal/supabase';

export const isHqConfigured = isPortalConfigured;

export function createHqClient(
  cookies: AstroCookies,
  request: Request,
): SupabaseClient {
  return createPortalClient(cookies, request);
}

export type HqRole = 'staff' | 'manager' | 'admin';

export interface HqUser {
  id: string;
  email: string;
  name: string;
  role: HqRole;
  jobTitle: string | null;
  startDate: string | null;
  /** True once the onboarding form has been submitted. */
  onboarded: boolean;
}

/** Managers and admins see the team overview, with emergency contacts. */
export const isManager = (user: HqUser) =>
  user.role === 'manager' || user.role === 'admin';

/**
 * The staff profile for an authenticated user, or null.
 *
 * Takes the client rather than building one, because it must be the client
 * holding the session: straight after signInWithPassword the new session
 * exists only on that client and in the outgoing Set-Cookie headers, so a
 * client built from the incoming request would see nobody.
 *
 * No staff_members row — or an inactive one — means no access. The project
 * also holds instructors and GAP students, every one with a valid session.
 */
export async function hqProfileFor(
  supabase: SupabaseClient,
  user: User,
): Promise<HqUser | null> {
  const { data: profile } = await supabase
    .from('staff_members')
    .select(
      `name, role, job_title, start_date, active,
       onboarding:staff_onboarding ( submitted_at )`,
    )
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.active === false) return null;

  // PostgREST types an embedded to-one relation as an array; it is one row.
  const onboarding = (
    Array.isArray(profile.onboarding) ? profile.onboarding[0] : profile.onboarding
  ) as { submitted_at: string | null } | null | undefined;

  return {
    id: user.id,
    email: user.email ?? '',
    name: profile.name || user.email?.split('@')[0] || 'Staff',
    role: profile.role as HqRole,
    jobTitle: profile.job_title ?? null,
    startDate: profile.start_date ?? null,
    onboarded: Boolean(onboarding?.submitted_at),
  };
}

/**
 * Resolve the signed-in staff member from the request, or null. getUser()
 * rather than getSession(): it revalidates the JWT, which an auth guard needs.
 */
export async function getHqUser(
  cookies: AstroCookies,
  request: Request,
): Promise<HqUser | null> {
  if (!isHqConfigured) return null;

  const supabase = createHqClient(cookies, request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return hqProfileFor(supabase, user);
}
