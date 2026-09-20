/**
 * The cohort programme as an iCalendar feed.
 *
 * Served behind the same auth guard as every other /gap route — middleware
 * matches on the path prefix, so this needs no check of its own beyond reading
 * the user middleware already resolved.
 *
 * A caveat worth knowing: most calendar apps will not send cookies when they
 * refresh a subscription, so this URL works as a one-off download rather than
 * a live subscription. Making it subscribable means a signed, per-student
 * token URL — worth doing, but it is a phase-two job, not a reason to ship no
 * calendar export at all.
 */
import type { APIRoute } from 'astro';
import { createGapClient, type GapUser } from '../../lib/gap/supabase';

export const prerender = false;

/** RFC 5545 wants CRLF, escaped separators, and no stray line breaks. */
const esc = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** UTC basic format: 20270118T083000Z */
const stamp = (value: string | Date) =>
  new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * Fold lines at 75 octets as the spec requires. Calendar apps are forgiving
 * about this until a long objective meets Outlook, at which point they are not.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

export const GET: APIRoute = async ({ locals, cookies, request }) => {
  const user = locals.gapUser as GapUser | null;
  if (!user?.cohort) return new Response('Not found', { status: 404 });

  const db = createGapClient(cookies, request);
  const { data } = await db
    .from('gap_activities')
    .select('*')
    .eq('cohort_id', user.cohort.id)
    .order('starts_at');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Peak Snowsports//GAP Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`Peak GAP — ${user.cohort.name}`)}`,
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  for (const a of data ?? []) {
    // No end time means a single point in the day; give it an hour so it
    // renders as a block rather than vanishing into an all-day row.
    const end =
      a.ends_at ?? new Date(new Date(a.starts_at).getTime() + 3_600_000);

    const description = [
      a.objective,
      a.bring && `Bring: ${a.bring}`,
      a.preparation && `Prepare: ${a.preparation}`,
      a.coach && `Coach: ${a.coach}`,
      a.map_url,
    ]
      .filter(Boolean)
      .join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@peaksnowsports.com`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(a.starts_at)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(a.title)}`,
      ...(a.meeting_point || a.location
        ? [`LOCATION:${esc(a.meeting_point || a.location)}`]
        : []),
      ...(description ? [`DESCRIPTION:${esc(description)}`] : []),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.map(fold).join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="peak-gap-${user.cohort.slug}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
};
