/**
 * Supabase client for the GAP student portal.
 *
 * Deliberately a thin layer over the instructor portal's client rather than a
 * second one: same Supabase project, same env vars, same httpOnly-cookie,
 * entirely-server-side auth. What differs is the profile — a GAP member is a
 * row in `gap_members`, not `instructors` — so this module owns the lookup and
 * the GapUser type, and re-uses createPortalClient for the transport.
 *
 * Env vars (shared with /portal, no PUBLIC_ prefix, server-only):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { createPortalClient, isPortalConfigured } from '../portal/supabase';

export const isGapConfigured = isPortalConfigured;

export function createGapClient(
  cookies: AstroCookies,
  request: Request,
): SupabaseClient {
  return createPortalClient(cookies, request);
}

export type GapRole = 'student' | 'coach' | 'admin';

/** The cohort a member belongs to, as every page needs it. */
export interface GapCohort {
  id: string;
  name: string;
  slug: string;
  resort: string;
  starts_on: string;
  ends_on: string;
  assessment_on: string | null;
  experience_target_hours: number;
}

export interface GapUser {
  id: string;
  email: string;
  name: string;
  role: GapRole;
  cohortId: string | null;
  cohort: GapCohort | null;
}

export const isStaff = (user: GapUser) =>
  user.role === 'coach' || user.role === 'admin';

/**
 * Resolve the signed-in GAP member, or null.
 *
 * getUser() rather than getSession(): getUser() revalidates the JWT against
 * Supabase, getSession() trusts the cookie. An auth guard needs the former.
 *
 * Returns null for a valid Supabase user with no `gap_members` row — an
 * instructor signed into /portal must not fall through into the student
 * portal just because the cookie is the same.
 */
export async function getGapUser(
  cookies: AstroCookies,
  request: Request,
): Promise<GapUser | null> {
  if (!isGapConfigured) return null;

  const supabase = createGapClient(cookies, request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // RLS lets a member read only their own row, and the cohort join only
  // resolves for a cohort they are on.
  const { data: profile } = await supabase
    .from('gap_members')
    .select(
      `name, role, cohort_id, active,
       cohort:gap_cohorts (
         id, name, slug, resort, starts_on, ends_on,
         assessment_on, experience_target_hours
       )`,
    )
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.active === false) return null;

  // PostgREST types an embedded to-one relation as an array; it is one row.
  const cohort = (
    Array.isArray(profile.cohort) ? profile.cohort[0] : profile.cohort
  ) as GapCohort | null | undefined;

  return {
    id: user.id,
    email: user.email ?? '',
    name: profile.name || user.email?.split('@')[0] || 'Student',
    role: (profile.role as GapRole) ?? 'student',
    cohortId: profile.cohort_id ?? null,
    cohort: cohort ?? null,
  };
}
