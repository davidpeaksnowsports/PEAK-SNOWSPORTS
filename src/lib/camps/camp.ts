/**
 * Date and programme logic for the ski camp portal. Pure functions, no I/O,
 * so the pages stay readable and this stays easy to check.
 *
 * Camp shape, from the public /ski-camps page: arrive Sunday, ski Monday to
 * Friday, check out Saturday if you booked accommodation. `startDate` on a
 * skiCamp document is the Monday.
 */
import type { CampChoice } from './supabase';
import type { CampDoc, ScheduledCamp } from './content';

const DAY = 86_400_000;

/** Today in the Alps, as YYYY-MM-DD. The server runs in UTC. */
export function todayInResort(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) => fromUtc(toUtc(iso) + days * DAY);

/** Whole days from `from` to `to`. Negative once `to` has passed. */
export const daysBetween = (from: string, to: string) =>
  Math.round((toUtc(to) - toUtc(from)) / DAY);

export interface CampWeek {
  arrive: string;
  firstDay: string;
  lastDay: string;
  checkOut: string;
}

export function campWeek(startDate: string): CampWeek {
  return {
    arrive: addDays(startDate, -1),
    firstDay: startDate,
    lastDay: addDays(startDate, 4),
    checkOut: addDays(startDate, 5),
  };
}

export type CampPhase = 'before' | 'arrival' | 'during' | 'after';

export function campPhase(startDate: string, today = todayInResort()): CampPhase {
  const d = daysBetween(today, startDate);
  if (d > 1) return 'before';
  if (d === 1) return 'arrival';
  if (d > -5) return 'during';
  return 'after';
}

/** The camp this member picked, if it is still on the schedule. */
export function findMyCamp(
  choice: CampChoice | null,
  camps: ScheduledCamp[],
): ScheduledCamp | null {
  if (!choice?.campId) return null;
  return camps.find((c) => c._id === choice.campId) ?? null;
}

/** Upcoming and running camps first; finished ones are history. */
export const isUpcoming = (camp: ScheduledCamp, today = todayInResort()) =>
  daysBetween(today, campWeek(camp.startDate).lastDay) >= 0;

const dateFmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts });

export const formatDay = (iso: string) =>
  dateFmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(toUtc(iso)));

export const formatLong = (iso: string) =>
  dateFmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(toUtc(iso)),
  );

/** "14–18 Dec 2026", or "29 Mar – 2 Apr 2027" across a month end. */
export function formatCampRange(startDate: string): string {
  const { firstDay, lastDay } = campWeek(startDate);
  const a = new Date(toUtc(firstDay));
  const b = new Date(toUtc(lastDay));
  const year = dateFmt({ year: 'numeric' }).format(b);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${dateFmt({ month: 'short' }).format(b)} ${year}`;
  }
  return `${dateFmt({ day: 'numeric', month: 'short' }).format(a)} – ${dateFmt({ day: 'numeric', month: 'short' }).format(b)} ${year}`;
}

/* ---------------------------------------------------------- Ski fit ---- */

/** Stable id for a tick: survives a session being renamed in the Studio. */
export const sessionKey = (doc: Pick<CampDoc, '_id'>, sessionKeyId: string) =>
  `${doc._id}:${sessionKeyId}`;

/** Blocks of the training plan (fitness docs with a weeksOut), furthest out first. */
export const planBlocks = (docs: CampDoc[]) =>
  docs
    .filter((d) => typeof d.weeksOut === 'number' && (d.sessions?.length ?? 0) > 0)
    .sort((a, b) => (b.weeksOut ?? 0) - (a.weeksOut ?? 0));

/**
 * Which block a skier this many weeks out should be doing: the one that
 * started most recently. Before the plan begins it is the first block, and
 * `early` says so; in camp week there is nothing left to do.
 */
export function currentBlock(
  blocks: CampDoc[],
  weeksOut: number | null,
): { block: CampDoc | null; early: boolean } {
  if (!blocks.length) return { block: null, early: false };
  if (weeksOut === null) return { block: blocks[0], early: false };
  if (weeksOut <= 0) return { block: null, early: false };
  const started = blocks.filter((b) => (b.weeksOut ?? 0) >= weeksOut);
  if (!started.length) return { block: blocks[0], early: true };
  return { block: started[started.length - 1], early: false };
}

/** Weeks to go, rounded up, so the Monday a week before camp reads as 1. */
export const weeksUntil = (startDate: string, today = todayInResort()) =>
  Math.ceil(daysBetween(today, startDate) / 7);

/* ------------------------------------------------------------ Video ---- */

export type ParsedVideo =
  | { kind: 'youtube'; id: string }
  | { kind: 'vimeo'; id: string; hash: string | null };

/**
 * A YouTube or Vimeo id from a watch, short, embed or player URL. Anything
 * else is null, and the page shows it as a plain link.
 */
export function parseVideo(url: string | null | undefined): ParsedVideo | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1);
    return /^[\w-]{6,}$/.test(id) ? { kind: 'youtube', id } : null;
  }
  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const v = u.searchParams.get('v');
    if (v && /^[\w-]{6,}$/.test(v)) return { kind: 'youtube', id: v };
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
    return m ? { kind: 'youtube', id: m[1] } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    // vimeo.com/123, vimeo.com/123/abcdef (unlisted), player.vimeo.com/video/123?h=abcdef
    const m = u.pathname.match(/^\/(?:video\/)?(\d{5,})(?:\/([\da-f]{6,}))?/i);
    if (!m) return null;
    return { kind: 'vimeo', id: m[1], hash: m[2] ?? u.searchParams.get('h') };
  }
  return null;
}
