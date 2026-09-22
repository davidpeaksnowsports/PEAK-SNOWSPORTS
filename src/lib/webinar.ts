/**
 * The parents' webinar on the GAP course: one source of truth for the date,
 * the times and the joining details.
 *
 * Read by the registration page (/gap-webinar), the band that promotes it on
 * /gap-course, and the confirmation email sent by /api/webinar-registration.
 * To run the next one, edit the block below. Nothing else hardcodes a date.
 *
 * SPLIT ON PURPOSE: the public half (dates, times, platform name) is safe to
 * render. The joining details are NOT in this file, and must not be added to
 * it: this repo is public on GitHub, and a Meet link plus a dial-in PIN
 * committed here is a link anyone can find and use. They come from the
 * environment instead, and only ever reach a registered person's inbox.
 */

export const WEBINAR = {
  /** Used as the page headline, the email subject and the calendar entry. */
  title: 'The GAP course, explained for parents',
  /**
   * Start and end in UTC. On 7 October 2026 Paris is on CEST (UTC+2), so the
   * 5:00pm French start is 15:00 UTC. Change both if the date moves across a
   * clock change.
   */
  startUtc: '2026-10-07T15:00:00Z',
  endUtc: '2026-10-07T16:00:00Z',
  /** ISO with offset, for schema.org. */
  startLocal: '2026-10-07T17:00:00+02:00',
  endLocal: '2026-10-07T18:00:00+02:00',
  dateLabel: 'Wednesday 7 October 2026',
  /** We are in France, most parents are in the UK. Spell out both. */
  timeLabel: '5:00pm to 6:00pm French time (4:00pm UK)',
  /** The same time split in two, for the places where it is set at display size. */
  timeShort: '5pm to 6pm',
  timeNote: 'French time. 4pm in the UK.',
  durationLabel: '1 hour',
  platform: 'Google Meet',
  /** Where people register. */
  path: '/gap-webinar',
} as const;

/** True once the webinar has finished. */
export function webinarHasPassed(now: Date = new Date()): boolean {
  return now.getTime() > new Date(WEBINAR.endUtc).getTime();
}

export interface JoinDetails {
  url: string;
  dialIn?: string;
  pin?: string;
  morePhones?: string;
}

/**
 * Joining details, from the environment. Server-side only, and only ever
 * emailed to someone who has registered.
 *
 * Set WEBINAR_JOIN_URL in Vercel (Production + Preview) and in your local
 * .env. Returns null when it is not configured, in which case the
 * confirmation email promises the link by email instead of inventing one.
 */
export function joinDetails(): JoinDetails | null {
  const url = process.env.WEBINAR_JOIN_URL?.trim();
  if (!url) return null;
  return {
    url,
    dialIn: process.env.WEBINAR_DIAL_IN?.trim() || undefined,
    pin: process.env.WEBINAR_DIAL_PIN?.trim() || undefined,
    morePhones: process.env.WEBINAR_MORE_PHONES?.trim() || undefined,
  };
}

/** RFC 5545 escaping: backslash, semicolon and comma, and newline as \n. */
const icsEscape = (v: string) =>
  v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** 2026-10-07T15:00:00Z becomes 20261007T150000Z. */
const icsStamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * RFC 5545 line folding: no content line may exceed 75 octets, and a
 * continuation starts with a single space. Lenient parsers cope without it,
 * Outlook does not, and the DESCRIPTION line here is well over the limit.
 * Counts bytes rather than characters so accented text cannot split badly.
 */
function icsFold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  // First line takes 75 octets, continuations 74 (the leading space is one).
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never cut mid-character: back up off any UTF-8 continuation byte.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString('utf8'));
    start = end;
    limit = 74;
  }
  return parts.join('\r\n ');
}

/**
 * A calendar file for the webinar, attached to the confirmation email so the
 * time lands in the parent's diary rather than in their good intentions.
 * Carries the joining link in both DESCRIPTION and LOCATION, which is where
 * Google, Apple and Outlook each look for a "join" button.
 */
export function webinarIcs(joining: JoinDetails | null, now: Date = new Date()): string {
  const description = [
    'A one-hour session on the Peak GAP ski instructor course, for parents.',
    '',
    joining
      ? `Join on ${WEBINAR.platform}: ${joining.url}`
      : 'We will email you the joining link before the session.',
    joining?.dialIn ? `Or dial in: ${joining.dialIn}${joining.pin ? ` PIN: ${joining.pin}` : ''}` : '',
    '',
    'Questions beforehand: hello@peaksnowsports.com',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Peak Snowsports//GAP webinar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:gap-webinar-${WEBINAR.startUtc.slice(0, 10)}@peaksnowsports.com`,
    `DTSTAMP:${icsStamp(now.toISOString())}`,
    `DTSTART:${icsStamp(WEBINAR.startUtc)}`,
    `DTEND:${icsStamp(WEBINAR.endUtc)}`,
    `SUMMARY:${icsEscape(`Peak Snowsports: ${WEBINAR.title}`)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(joining?.url ?? WEBINAR.platform)}`,
    'ORGANIZER;CN=Peak Snowsports:mailto:hello@peaksnowsports.com',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Peak GAP webinar starts in 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(icsFold)
    .join('\r\n');
}
