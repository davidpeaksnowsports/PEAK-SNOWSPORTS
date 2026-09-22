/**
 * Registrations for the parents' webinar on the GAP course, from the form on
 * /gap-webinar. Two emails go out per registration, via Resend:
 *
 *   1. A notification to the team. This is the record that someone signed up,
 *      so if it fails, the registration fails and the form says so.
 *   2. A confirmation to the parent, carrying the joining link and an .ics
 *      calendar attachment. If this one fails we still report success, with
 *      `confirmed: false`, because the registration itself is safe and the
 *      team can follow up by hand.
 *
 * Joining details are never in the page or the repo. They come from the
 * environment (see src/lib/webinar.ts) and only reach a registered inbox.
 *
 * Required env vars (Vercel + local .env, Preview and Production):
 *   RESEND_API_KEY      , the re_… key (NO PUBLIC_ prefix, never expose)
 *   WEBINAR_JOIN_URL    , the video call link. Without it the confirmation
 *                         promises the link by email instead of sending it.
 * Optional:
 *   WEBINAR_DIAL_IN , WEBINAR_DIAL_PIN , WEBINAR_MORE_PHONES
 *   WEBINAR_TO          , recipient(s), comma-separated. Default hello@peaksnowsports.com
 *   GAP_ENQUIRY_FROM    , verified Resend sender. Default "Peak GAP <gap@peaksnowsports.com>"
 */
import type { APIRoute } from 'astro';
import { WEBINAR, joinDetails, webinarIcs, webinarHasPassed } from '../../lib/webinar';

export const prerender = false;

interface Registration {
  name?: string;
  email?: string;
  phone?: string;
  student?: string;
  attendance?: string;
  question?: string;
  company?: string; // honeypot, real people leave it empty
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clean = (v: unknown, max = 2000) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

async function sendEmail(key: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  // Accept JSON (fetch) or form-encoded (no-JS fallback).
  let body: Registration = {};
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Registration;
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as Registration;
    }
  } catch {
    return json({ error: 'Could not read your registration.' }, 400);
  }

  // Honeypot: a filled "company" field means a bot. Pretend success, do nothing.
  if (clean(body.company)) return json({ ok: true, confirmed: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 60);
  const student = clean(body.student, 120);
  const attendance = clean(body.attendance, 120);
  const question = clean(body.question, 4000);

  if (!name || !email || !isEmail(email)) {
    return json({ error: 'Please give us your name and a valid email.' }, 422);
  }

  // The form hides itself once the date passes, but a stale tab could still
  // post. Say so rather than confirming a seat at a webinar that has been.
  if (webinarHasPassed()) {
    return json(
      { error: 'That webinar has already run. Email hello@peaksnowsports.com and we will send you the recording.' },
      410,
    );
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    // Not configured, so nothing would be recorded. Tell the form to show the
    // email fallback rather than pretending someone has a place.
    return json({ error: 'We could not save your place automatically.', fallback: true }, 503);
  }

  const to = (process.env.WEBINAR_TO ?? 'hello@peaksnowsports.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.GAP_ENQUIRY_FROM ?? 'Peak GAP <gap@peaksnowsports.com>';
  const joining = joinDetails();

  const notification = [
    'New registration for the parents webinar.',
    '',
    `Name:       ${name}`,
    `Email:      ${email}`,
    phone ? `Phone:      ${phone}` : null,
    student ? `Student:    ${student}` : null,
    attendance ? `Attending:  ${attendance}` : null,
    '',
    'Question they want covered:',
    question || '(none)',
    '',
    `Webinar:    ${WEBINAR.dateLabel}, ${WEBINAR.timeLabel}`,
    joining ? null : 'NOTE: WEBINAR_JOIN_URL is not set, so their confirmation went out without the joining link.',
  ].filter((l) => l !== null);

  const recorded = await sendEmail(RESEND_API_KEY, {
    from,
    to,
    reply_to: email,
    subject: `Webinar registration: ${name}`,
    text: notification.join('\n'),
  });

  if (!recorded) {
    return json(
      { error: 'Could not save your registration. Please email hello@peaksnowsports.com.', fallback: true },
      502,
    );
  }

  const confirmationLines = [
    `Hi ${name.split(' ')[0]},`,
    '',
    `You are registered for our webinar on the Peak GAP ski instructor course. Here are the details.`,
    '',
    `When:  ${WEBINAR.dateLabel}, ${WEBINAR.timeLabel}`,
    `Where: ${WEBINAR.platform}, from wherever you are`,
    `Long:  ${WEBINAR.durationLabel}, including questions`,
    '',
    joining ? `Join here: ${joining.url}` : 'We will email you the joining link a few days before.',
    joining?.dialIn ? `Or dial in: ${joining.dialIn}${joining.pin ? `, PIN ${joining.pin}` : ''}` : null,
    joining?.morePhones ? `Other phone numbers: ${joining.morePhones}` : null,
    '',
    'The calendar file attached will put it straight in your diary.',
    '',
    'We will cover what the qualification actually is, how the six weeks run, how we look after students in resort, what it costs and what comes after. Bring your questions. If you would rather ask one privately, just reply to this email.',
    '',
    'If you cannot make it live, register anyway and we will send you the recording.',
    '',
    'See you there,',
    'David and the Peak team',
    'peaksnowsports.com',
  ].filter((l) => l !== null);

  const ics = webinarIcs(joining);
  const confirmed = await sendEmail(RESEND_API_KEY, {
    from,
    to: [email],
    reply_to: 'hello@peaksnowsports.com',
    subject: `You are registered: ${WEBINAR.title}, ${WEBINAR.dateLabel}`,
    text: confirmationLines.join('\n'),
    attachments: [
      {
        filename: 'peak-gap-webinar.ics',
        content: Buffer.from(ics, 'utf8').toString('base64'),
        content_type: 'text/calendar; charset=utf-8; method=PUBLISH',
      },
    ],
  });

  return json({ ok: true, confirmed });
};
