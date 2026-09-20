/**
 * Course arithmetic and shared domain vocabulary.
 *
 * Pure functions with no Supabase import so they can be reasoned about — and
 * later tested — without a database. Everything here is the stuff the portal
 * repeats on every page: which week are we in, what does a 4 mean, how ready
 * is this student.
 */

/** The six-point acquisition scale. Developmental, not a mark out of six. */
export const SCALE: { score: number; label: string; meaning: string }[] = [
  { score: 1, label: 'Introduced', meaning: 'Met the idea. Not yet doing it.' },
  { score: 2, label: 'Understanding', meaning: 'Can explain it. Patchy in practice.' },
  { score: 3, label: 'Developing', meaning: 'Doing it, with prompting and inconsistency.' },
  { score: 4, label: 'Demonstrating', meaning: 'Doing it unprompted in familiar conditions.' },
  { score: 5, label: 'Consistent', meaning: 'Holds up across terrain, groups and pressure.' },
  { score: 6, label: 'Assessment ready', meaning: 'Would stand up on the day.' },
];

export const scaleLabel = (score: number | null | undefined) =>
  SCALE.find((s) => s.score === score)?.label ?? '—';

export const GROUPS = [
  { key: 'technical', label: 'Technical skiing' },
  { key: 'teaching', label: 'Teaching' },
  { key: 'professional', label: 'Professional' },
] as const;

export type CriterionGroup = (typeof GROUPS)[number]['key'];

export const ACTIVITY_KINDS: Record<string, { label: string; tone: string }> = {
  on_snow: { label: 'On snow', tone: 'accent' },
  off_snow: { label: 'Off snow', tone: 'ink' },
  rest: { label: 'Rest day', tone: 'muted' },
  assessment: { label: 'Assessment', tone: 'accent' },
  travel: { label: 'Travel', tone: 'muted' },
};

/** Days between two dates, ignoring time of day and DST. */
export function daysBetween(from: Date | string, to: Date | string): number {
  const a = new Date(from);
  const b = new Date(to);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

/**
 * Which week of the course today falls in, and how many there are.
 *
 * Week 1 starts on the cohort's first day, so a course beginning on a Sunday
 * has a week running Sunday to Saturday — the course's own week, not the
 * calendar's. Before the start it reports week 0, which the dashboard renders
 * as a countdown rather than "Week 0 of 6".
 */
export function courseWeek(
  cohort: { starts_on: string; ends_on: string },
  today: Date = new Date(),
): { week: number; totalWeeks: number; daysUntilStart: number; finished: boolean } {
  const elapsed = daysBetween(cohort.starts_on, today);
  const length = daysBetween(cohort.starts_on, cohort.ends_on) + 1;
  const totalWeeks = Math.max(1, Math.ceil(length / 7));

  if (elapsed < 0) {
    return { week: 0, totalWeeks, daysUntilStart: -elapsed, finished: false };
  }
  return {
    week: Math.min(totalWeeks, Math.floor(elapsed / 7) + 1),
    totalWeeks,
    daysUntilStart: 0,
    finished: elapsed >= length,
  };
}

/**
 * Readiness for one group of criteria.
 *
 * Coach scores only. A student's own view of themselves belongs on the
 * criterion, beside the coach's, but it must not move the headline number —
 * the headline is what a coach is telling them, and a self-assessment that
 * inflated it would be worse than useless.
 *
 * The denominator is every active criterion in the group, not every criterion
 * scored so far. An unassessed criterion counts as zero rather than being
 * skipped, so "78% ready" in week two means "we have seen 78% of what you need
 * to show", not "of the three things we happened to look at, you did well".
 */
export function readiness(
  criteria: { id: string; group: string }[],
  latestCoachScore: Map<string, number>,
  group: string,
): { percent: number; scored: number; total: number; averaged: number | null } {
  const inGroup = criteria.filter((c) => c.group === group);
  if (inGroup.length === 0) {
    return { percent: 0, scored: 0, total: 0, averaged: null };
  }

  let sum = 0;
  let scored = 0;
  for (const c of inGroup) {
    const s = latestCoachScore.get(c.id);
    if (s !== undefined) {
      sum += s;
      scored += 1;
    }
  }

  return {
    percent: Math.round((sum / (inGroup.length * 6)) * 100),
    scored,
    total: inGroup.length,
    averaged: scored ? Math.round((sum / scored) * 10) / 10 : null,
  };
}

/**
 * Traffic light for a readiness percentage.
 *
 * Thresholds are deliberately generous early and unforgiving late: 60% in week
 * one is fine, 60% in the final week is not. Passing the week lets one set of
 * thresholds serve the whole course.
 */
export function readinessTone(
  percent: number,
  week: number,
  totalWeeks: number,
): 'ahead' | 'on-track' | 'watch' {
  const through = totalWeeks > 0 ? Math.min(1, week / totalWeeks) : 0;
  // Expect to land around 5/6 (83%) by the end, tracking linearly from 30%.
  const expected = 30 + through * 53;
  if (percent >= expected + 8) return 'ahead';
  if (percent >= expected - 10) return 'on-track';
  return 'watch';
}

export const TONE_LABEL: Record<string, string> = {
  ahead: 'Ahead of where we expect',
  'on-track': 'Developing as planned',
  watch: 'Needs attention this week',
};

/** Minutes to a one-decimal hours figure, as the BASI log sheet wants it. */
export const toHours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

/** "Mon 12 Jan" / "Mon 12 Jan, 09:00". Europe/Paris — the course is in France. */
const TZ = 'Europe/Paris';

export const fmtDate = (value: string | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  }).format(new Date(value));

export const fmtLongDate = (value: string | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(value));

export const fmtTime = (value: string | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(value));

/** The Paris-local calendar day of an instant, as YYYY-MM-DD. */
export const dayKey = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TZ,
  }).format(new Date(value));

/** Navigation. Order is the order of a student's day, not an alphabet. */
export const GAP_SECTIONS = [
  { href: '/gap', label: 'Dashboard', exact: true },
  { href: '/gap/programme', label: 'Programme' },
  { href: '/gap/progress', label: 'My progress' },
  { href: '/gap/workbook', label: 'Workbook' },
  { href: '/gap/learning', label: 'Learning hub' },
  { href: '/gap/experience', label: 'Experience log' },
  { href: '/gap/resort', label: 'Resort guide' },
  { href: '/gap/checklist', label: 'Checklist' },
  { href: '/gap/essentials', label: 'Essentials' },
  { href: '/gap/feedback', label: 'Feedback' },
];
