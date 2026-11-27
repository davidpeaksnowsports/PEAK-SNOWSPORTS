/**
 * Supabase auth for the ski camp portal at /camps.
 *
 * A thin layer over the instructor portal's client, like the GAP and HQ ones:
 * same Supabase project, same env vars, same httpOnly-cookie, entirely
 * server-side auth. What differs is the profile. A camper is a row in
 * `camp_members`, created by the join-code trigger (see migration 0016).
 *
 * Env vars (shared, no PUBLIC_ prefix, server-only):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { createPortalClient, isPortalConfigured } from '../portal/supabase';

export const isCampsConfigured = isPortalConfigured;

export function createCampsClient(
  cookies: AstroCookies,
  request: Request,
): SupabaseClient {
  return createPortalClient(cookies, request);
}

export type CampRole = 'camper' | 'coach' | 'admin';
export type CampLevel = 'intermediate' | 'advanced';

/** Which camp the member says they are on. Personalisation, not access. */
export interface CampChoice {
  campId: string | null;
  locationSlug: string | null;
  level: CampLevel | null;
}

export interface CampUser {
  id: string;
  email: string;
  name: string;
  role: CampRole;
  choice: CampChoice | null;
}

/**
 * The camp profile for an authenticated user, or null.
 *
 * Takes the client rather than building one, because it must be the client
 * holding the session: straight after signInWithPassword the new session
 * exists only on that client and in the outgoing Set-Cookie headers.
 *
 * No camp_members row, or an inactive one, means no access. The project also
 * holds instructors, GAP students and office staff, every one with a valid
 * session. Never add a fallback profile here.
 */
export async function campProfileFor(
  supabase: SupabaseClient,
  user: User,
): Promise<CampUser | null> {
  const { data: profile } = await supabase
    .from('camp_members')
    .select(
      `name, role, active,
       choice:camp_choices ( camp_id, location_slug, level )`,
    )
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.active === false) return null;

  // PostgREST types an embedded to-one relation as an array; it is one row.
  const choice = (
    Array.isArray(profile.choice) ? profile.choice[0] : profile.choice
  ) as { camp_id: string | null; location_slug: string | null; level: string | null } | null | undefined;

  return {
    id: user.id,
    email: user.email ?? '',
    name: profile.name || user.email?.split('@')[0] || 'Skier',
    role: (profile.role as CampRole) ?? 'camper',
    choice: choice
      ? {
          campId: choice.camp_id,
          locationSlug: choice.location_slug,
          level: (choice.level as CampLevel | null) ?? null,
        }
      : null,
  };
}

/**
 * Resolve the signed-in camper from the request, or null. getUser() rather
 * than getSession(): it revalidates the JWT, which an auth guard needs.
 */
export async function getCampUser(
  cookies: AstroCookies,
  request: Request,
): Promise<CampUser | null> {
  if (!isCampsConfigured) return null;

  const supabase = createCampsClient(cookies, request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return campProfileFor(supabase, user);
}

/**
 * Give a signed-in user camp portal access, and return their profile.
 *
 * Sign-up is open (migration 0017): anyone with a Peak login, or anyone who
 * has just confirmed their email, becomes a camper the first time they arrive.
 * `join_camps` adds only the caller, only as a camper, and never changes an
 * existing row, so a deactivated camper stays out. Null means no access.
 */
export async function joinCamps(
  supabase: SupabaseClient,
  user: User,
): Promise<CampUser | null> {
  const existing = await campProfileFor(supabase, user);
  if (existing) return existing;

  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null;
  const { error } = await supabase.rpc('join_camps', { display_name: name });
  if (error) {
    console.error('[camps] join_camps failed:', error.message);
    return null;
  }
  return campProfileFor(supabase, user);
}
