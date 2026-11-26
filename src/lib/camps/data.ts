/**
 * The two things a camper writes: which camp they are on, and which ski fit
 * sessions they have done. Both go through RLS as the signed-in member, so a
 * camper can only ever touch their own rows (migration 0016).
 *
 * Inputs are checked against the content they claim to refer to. That is not
 * a security boundary (RLS is), it just stops a stale form saving a camp or a
 * session that no longer exists.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CampDoc, ScheduledCamp } from './content';
import { sessionKey } from './camp';
import type { CampLevel } from './supabase';

const LEVELS: CampLevel[] = ['intermediate', 'advanced'];

export async function saveChoice(
  db: SupabaseClient,
  memberId: string,
  form: FormData,
  camps: ScheduledCamp[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  // One select carries both halves: "<camp _id>|<venue slug>".
  const [campId = '', locationSlug = ''] = String(form.get('camp') ?? '').split('|');
  const level = String(form.get('level') ?? '') as CampLevel;

  const camp = camps.find((c) => c._id === campId);
  if (!camp || !camp.locations.some((l) => l.slug === locationSlug)) {
    return { ok: false, error: 'Choose your camp from the list.' };
  }
  if (!LEVELS.includes(level)) {
    return { ok: false, error: 'Choose intermediate or advanced.' };
  }

  const { error } = await db.from('camp_choices').upsert(
    {
      member_id: memberId,
      camp_id: campId,
      location_slug: locationSlug,
      level,
    },
    { onConflict: 'member_id' },
  );
  if (error) {
    console.error('[camps] save choice failed:', error.message);
    return { ok: false, error: 'That did not save. Try again in a moment.' };
  }
  return { ok: true };
}

export async function listTicks(db: SupabaseClient, memberId: string): Promise<Set<string>> {
  const { data, error } = await db
    .from('camp_fitness_ticks')
    .select('session_key')
    .eq('member_id', memberId);
  if (error) console.error('[camps] ticks fetch failed:', error.message);
  return new Set((data ?? []).map((r) => r.session_key as string));
}

/**
 * Tick or untick one session. `key` must be a session in `docs`, so a tick
 * can only ever be for something on the page the camper is looking at.
 */
export async function setTick(
  db: SupabaseClient,
  memberId: string,
  form: FormData,
  docs: CampDoc[],
): Promise<boolean> {
  const key = String(form.get('session') ?? '');
  const done = form.get('done') === '1';
  const valid = docs.some((d) => (d.sessions ?? []).some((s) => sessionKey(d, s._key) === key));
  if (!valid) return false;

  const { error } = done
    ? await db
        .from('camp_fitness_ticks')
        // ON CONFLICT DO NOTHING: ticking twice is a no-op, and it needs only
        // the insert policy. A DO UPDATE would need an update policy too.
        .upsert(
          { member_id: memberId, session_key: key },
          { onConflict: 'member_id,session_key', ignoreDuplicates: true },
        )
    : await db
        .from('camp_fitness_ticks')
        .delete()
        .eq('member_id', memberId)
        .eq('session_key', key);

  if (error) {
    console.error('[camps] tick failed:', error.message);
    return false;
  }
  return true;
}
