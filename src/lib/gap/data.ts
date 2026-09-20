/**
 * Queries the portal repeats.
 *
 * Anything used by more than one page lives here so the shape of a "score" or
 * an "experience total" is defined once. Page-specific one-off selects stay in
 * the page — hiding a single .from() behind a wrapper helps nobody.
 *
 * Every function takes an already-authenticated client. RLS does the access
 * control, so none of these take a "can this person see it" argument.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { dayKey, toHours } from './course';

export interface Criterion {
  id: string;
  group: 'technical' | 'teaching' | 'professional';
  code: string;
  label: string;
  help: string | null;
  sort: number;
}

export interface Score {
  id: string;
  criterion_id: string;
  source: 'self' | 'coach';
  score: number;
  comment: string | null;
  action: string | null;
  evidence_url: string | null;
  assessed_at: string;
}

export async function listCriteria(db: SupabaseClient): Promise<Criterion[]> {
  const { data } = await db
    .from('gap_criteria')
    .select('id, group:group_key, code, label, help, sort')
    .eq('active', true)
    .order('group_key')
    .order('sort');
  return (data ?? []) as Criterion[];
}

/**
 * Every score a student has, newest first.
 *
 * The table is append-only history, so this is the raw material for "latest",
 * "previous" and "trend" without three round trips. A six-week course with ~25
 * criteria assessed weekly tops out in the low hundreds of rows — small enough
 * to sort in the page rather than in five separate queries.
 */
export async function listScores(
  db: SupabaseClient,
  studentId: string,
): Promise<Score[]> {
  const { data } = await db
    .from('gap_scores')
    .select('id, criterion_id, source, score, comment, action, evidence_url, assessed_at')
    .eq('student_id', studentId)
    .order('assessed_at', { ascending: false });
  return (data ?? []) as Score[];
}

export interface ScoreHistory {
  latest: Score | null;
  previous: Score | null;
  trend: 'up' | 'down' | 'flat' | null;
}

/** Index scores by criterion for one source, keeping latest and previous. */
export function byCriterion(
  scores: Score[],
  source: 'self' | 'coach',
): Map<string, ScoreHistory> {
  const out = new Map<string, ScoreHistory>();
  // `scores` arrives newest first, so the first two seen per criterion are the
  // two we want.
  for (const s of scores) {
    if (s.source !== source) continue;
    const existing = out.get(s.criterion_id);
    if (!existing) {
      out.set(s.criterion_id, { latest: s, previous: null, trend: null });
    } else if (!existing.previous) {
      existing.previous = s;
      existing.trend =
        existing.latest!.score > s.score
          ? 'up'
          : existing.latest!.score < s.score
            ? 'down'
            : 'flat';
    }
  }
  return out;
}

/** Just the latest coach score per criterion — what readiness() wants. */
export function latestCoachScores(scores: Score[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of scores) {
    if (s.source === 'coach' && !out.has(s.criterion_id)) {
      out.set(s.criterion_id, s.score);
    }
  }
  return out;
}

export interface ExperienceTotals {
  verified: number;
  pending: number;
  total: number;
  entries: number;
}

/**
 * Hours logged, split by verification state.
 *
 * Rejected entries count towards nothing — they are kept so the student can
 * see why, not so they can be re-submitted as hours.
 */
export async function experienceTotals(
  db: SupabaseClient,
  studentId: string,
): Promise<ExperienceTotals> {
  const { data } = await db
    .from('gap_experience_log')
    .select('duration_minutes, status')
    .eq('student_id', studentId);

  const rows = data ?? [];
  const sum = (status: string) =>
    rows
      .filter((r) => r.status === status)
      .reduce((n, r) => n + (r.duration_minutes ?? 0), 0);

  const verified = toHours(sum('verified'));
  const pending = toHours(sum('pending'));
  return { verified, pending, total: verified + pending, entries: rows.length };
}

/**
 * The next few things happening, from now.
 *
 * `limit` counts activities, not days — the dashboard wants "the next three
 * things", which may all be today or may span a rest day.
 */
export async function upcomingActivities(
  db: SupabaseClient,
  cohortId: string,
  limit = 3,
) {
  const { data } = await db
    .from('gap_activities')
    .select('*')
    .eq('cohort_id', cohortId)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(limit);
  return data ?? [];
}

/**
 * Everything on a given Paris-local day, in order.
 *
 * Paris is UTC+1 or +2 depending on the season, so rather than hardcode an
 * offset — which is wrong for half the year and silently moves an early or
 * late session into the wrong day — this fetches the day either side in UTC
 * and filters with the same Paris-local dayKey the page displays.
 */
export async function activitiesOn(
  db: SupabaseClient,
  cohortId: string,
  day: string,
) {
  const shift = (days: number) => {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
  };

  const { data } = await db
    .from('gap_activities')
    .select('*')
    .eq('cohort_id', cohortId)
    .gte('starts_at', shift(-1))
    .lt('starts_at', shift(2))
    .order('starts_at');

  return (data ?? []).filter((a) => dayKey(a.starts_at) === day);
}

export async function listAnnouncements(
  db: SupabaseClient,
  cohortId: string,
  limit = 5,
) {
  const { data } = await db
    .from('gap_announcements')
    .select('id, title, body, pinned, published_at')
    .eq('cohort_id', cohortId)
    .lte('published_at', new Date().toISOString())
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function openTasks(db: SupabaseClient, studentId: string) {
  const { data } = await db
    .from('gap_tasks')
    .select('id, title, detail, due_on, status')
    .eq('student_id', studentId)
    .eq('status', 'open')
    .order('due_on', { nullsFirst: false });
  return data ?? [];
}

/** Checklist completion as a fraction, for the dashboard's progress line. */
export async function checklistProgress(
  db: SupabaseClient,
  cohortId: string,
  studentId: string,
  preArrival?: boolean,
) {
  let itemQuery = db
    .from('gap_checklist_items')
    .select('id')
    .eq('cohort_id', cohortId);
  if (preArrival !== undefined) itemQuery = itemQuery.eq('pre_arrival', preArrival);

  const [{ data: items }, { data: done }] = await Promise.all([
    itemQuery,
    db
      .from('gap_checklist_progress')
      .select('item_id, done')
      .eq('student_id', studentId)
      .eq('done', true),
  ]);

  const ids = new Set((items ?? []).map((i) => i.id));
  const ticked = (done ?? []).filter((d) => ids.has(d.item_id)).length;
  return { done: ticked, total: ids.size };
}

export async function workbookProgress(
  db: SupabaseClient,
  cohortId: string,
  studentId: string,
) {
  const [{ data: modules }, { data: progress }] = await Promise.all([
    db.from('gap_workbook_modules').select('id').eq('cohort_id', cohortId),
    db
      .from('gap_module_progress')
      .select('module_id, status')
      .eq('student_id', studentId),
  ]);

  const ids = new Set((modules ?? []).map((m) => m.id));
  const complete = (progress ?? []).filter(
    (p) => ids.has(p.module_id) && p.status === 'complete',
  ).length;
  return { done: complete, total: ids.size };
}
