/**
 * The six-week programme as a planner: weeks of seven days, each day split
 * into morning, afternoon and evening, every session given a planner
 * category. Mirrors the layout of the course planner spreadsheet
 * ("GAP Avoriaz Course Planner"), which is how the coaches think about the
 * course, so the portal shows students the same picture.
 *
 * Categories are DERIVED from an activity's kind and title rather than stored,
 * so the existing rows in gap_activities need no new column and a coach who
 * adds "Shadowing" through the database gets the right colour for free.
 */
import { dayKey } from './course';

export type PlanCategory =
  | 'training'
  | 'shadowing'
  | 'exam'
  | 'first_aid'
  | 'workshop'
  | 'pt'
  | 'rest'
  | 'travel'
  | 'social';

/**
 * Key order is the order the legend reads in. Colours stay inside the Winter
 * Collection palette: the purple accent at four strengths, plus ink. Every
 * cell also carries its label in text, so colour is never the only signal.
 */
export const PLAN_KEY: Record<
  PlanCategory,
  { label: string; short: string; cell: string }
> = {
  training: { label: 'Training', short: 'Training', cell: 'bg-accent/15 text-accent' },
  shadowing: { label: 'Shadowing', short: 'Shadow', cell: 'bg-accent/40 text-ink' },
  exam: { label: 'BASI exam', short: 'Exam', cell: 'bg-accent text-paper' },
  first_aid: { label: 'First aid', short: 'First aid', cell: 'bg-ink text-paper' },
  workshop: { label: 'Workshops', short: 'Workshop', cell: 'bg-ink/10 text-ink' },
  pt: { label: 'Physical training', short: 'PT', cell: 'bg-paper text-accent ring-1 ring-inset ring-accent' },
  rest: { label: 'Rest', short: 'Rest', cell: 'bg-paper-2 text-ink-45' },
  travel: { label: 'Arrive / depart', short: 'Travel', cell: 'bg-ink-70 text-paper' },
  social: { label: 'Social', short: 'Social', cell: 'bg-paper text-ink-70 ring-1 ring-inset ring-ink/20' },
};

/**
 * What each week is for. The same six-week shape runs for every intake, so
 * these live with the code rather than per cohort. Weeks 3 and 4 share a
 * focus, as do 5 and 6, because that is how the course is built: two-week
 * blocks heading into the Level 2 exam.
 */
export const WEEK_THEMES: Record<number, { theme: string; goals: string[] }> = {
  1: {
    theme: 'Fundamental elements',
    goals: ['Fundamental elements'],
  },
  2: {
    theme: 'BASI Level 1 exam',
    goals: ['BASI Level 1 exam'],
  },
  3: {
    theme: 'Fundamentals and personal performance',
    goals: [
      'Fundamental elements',
      'Personal performance',
      'TIED model',
      'Skill acquisition',
      'Off snow workshops',
      'First aid course',
      'Ski school experience',
    ],
  },
  4: {
    theme: 'Fundamentals and personal performance',
    goals: [
      'Fundamental elements',
      'Personal performance',
      'TIED model',
      'Skill acquisition',
      'Off snow workshops',
      'First aid course',
      'Ski school experience',
    ],
  },
  5: {
    theme: 'Ski school experience and BASI Level 2',
    goals: ['Ski school experience', 'BASI Level 2 exam'],
  },
  6: {
    theme: 'Ski school experience and BASI Level 2',
    goals: ['Ski school experience', 'BASI Level 2 exam'],
  },
};

export interface PlanActivity {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meeting_point: string | null;
  map_url: string | null;
  coach: string | null;
  objective: string | null;
  bring: string | null;
  preparation: string | null;
  workbook_module: string | null;
}

export function planCategory(a: { kind: string; title: string; starts_at: string }): PlanCategory {
  const title = a.title.toLowerCase();
  if (a.kind === 'rest') return 'rest';
  if (a.kind === 'travel') return 'travel';
  if (title.includes('first aid')) return 'first_aid';
  if (a.kind === 'assessment') return 'exam';
  if (title.includes('shadow')) return 'shadowing';
  if (a.kind === 'on_snow') return 'training';
  if (title.includes('physical')) return 'pt';
  if (parisHour(a.starts_at) >= 18) return 'social';
  return 'workshop';
}

export type Slot = 'am' | 'pm' | 'eve';
export const SLOTS: { key: Slot; label: string }[] = [
  { key: 'am', label: 'Morning' },
  { key: 'pm', label: 'Afternoon' },
  { key: 'eve', label: 'Evening' },
];

const parisHour = (value: string) =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Paris',
    }).format(new Date(value)),
  );

const slotOf = (a: PlanActivity): Slot => {
  const h = parisHour(a.starts_at);
  return h < 12 ? 'am' : h < 18 ? 'pm' : 'eve';
};

export interface PlanDay {
  /** YYYY-MM-DD, Paris-local. */
  key: string;
  am: PlanActivity[];
  pm: PlanActivity[];
  eve: PlanActivity[];
  /**
   * True when one session fills the whole day: an exam, a rest day, a travel
   * day, or the same session morning and afternoon. The planner draws it as
   * one block across both rows, as the spreadsheet merges those cells.
   */
  allDay: boolean;
}

export interface PlanWeek {
  week: number;
  days: PlanDay[];
}

const ALL_DAY = new Set<PlanCategory>(['exam', 'rest', 'travel', 'first_aid']);

/**
 * Lay a cohort's activities out as weeks. Week 1 starts on the cohort's
 * start date, matching courseWeek(), so a Sunday start gives Sunday-to-
 * Saturday weeks exactly like the planner.
 */
export function buildPlan(
  activities: PlanActivity[],
  cohort: { starts_on: string; ends_on: string },
): PlanWeek[] {
  const byDay = new Map<string, PlanActivity[]>();
  for (const a of activities) {
    const k = dayKey(a.starts_at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(a);
  }

  const start = new Date(`${cohort.starts_on}T12:00:00Z`);
  const end = new Date(`${cohort.ends_on}T12:00:00Z`);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const weeks: PlanWeek[] = [];
  for (let w = 0; w < totalWeeks; w++) {
    const days: PlanDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + w * 7 + d);
      const key = date.toISOString().slice(0, 10);
      const items = (byDay.get(key) ?? []).sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at),
      );
      const day: PlanDay = {
        key,
        am: items.filter((a) => slotOf(a) === 'am'),
        pm: items.filter((a) => slotOf(a) === 'pm'),
        eve: items.filter((a) => slotOf(a) === 'eve'),
        allDay: false,
      };
      // Training and shadowing stay as two blocks even when morning and
      // afternoon share a title: the spreadsheet keeps them as two sessions.
      const [am] = day.am;
      day.allDay =
        day.am.length === 1 &&
        ALL_DAY.has(planCategory(am)) &&
        (day.pm.length === 0 || (day.pm.length === 1 && day.pm[0].title === am.title));
      days.push(day);
    }
    weeks.push({ week: w + 1, days });
  }
  return weeks;
}
