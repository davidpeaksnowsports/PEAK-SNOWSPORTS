/**
 * Receives race-coaching enquiries from /lessons/race-coaching and emails them
 * to the team at hello@peaksnowsports.com, with reply-to set to the enquirer.
 *
 * Required env vars (Vercel + local .env, Preview + Production):
 *   RESEND_API_KEY              , the re_… key (NO PUBLIC_ prefix)
 * Optional:
 *   RACE_COACHING_ENQUIRY_TO    , recipient(s), comma-separated. Default hello@peaksnowsports.com
 *   RACE_COACHING_ENQUIRY_FROM  , verified Resend sender. Default "Peak Snowsports <hello@peaksnowsports.com>"
 *
 * If RESEND_API_KEY is absent the endpoint returns 503 with { fallback: true }
 * so the form can direct the visitor to email us instead.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

interface Enquiry {
  name?: string;
  email?: string;
  phone?: string;
  programme?: string;
  racers?: string;
  ages?: string;
  level?: string;
  dates?: string;
  message?: string;
  company?: string; // honeypot — real users never fill this
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clean = (v: unknown, max = 2000) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const FALLBACK_ERROR = 'Could not send your enquiry. Please email hello@peaksnowsports.com instead.';

export const POST: APIRoute = async ({ request }) => {
  let body: Enquiry = {};
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Enquiry;
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as Enquiry;
    }
  } catch {
    return json({ error: 'Could not read your submission.' }, 400);
  }

  // Honeypot: a filled "company" field means a bot. Pretend success, do nothing.
  if (clean(body.company)) return json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 60);
  const programme = clean(body.programme, 120);
  const racers = clean(body.racers, 20);
  const ages = clean(body.ages, 120);
  const level = clean(body.level, 120);
  const dates = clean(body.dates, 200);
  const message = clean(body.message, 4000);

  if (!name || !email || !isEmail(email)) {
    return json({ error: 'Please give us your name and a valid email.' }, 422);
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return json({ error: 'Enquiry email is not configured yet.', fallback: true }, 503);
  }

  const to = (process.env.RACE_COACHING_ENQUIRY_TO ?? 'hello@peaksnowsports.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from =
    process.env.RACE_COACHING_ENQUIRY_FROM ?? 'Peak Snowsports <hello@peaksnowsports.com>';

  const lines = [
    'New race coaching enquiry from the website.',
    '',
    `Name:       ${name}`,
    `Email:      ${email}`,
    phone ? `Phone:      ${phone}` : null,
    programme ? `Programme:  ${programme}` : null,
    racers ? `Racers:     ${racers}` : null,
    ages ? `Age(s):     ${ages}` : null,
    level ? `Level:      ${level}` : null,
    dates ? `Dates:      ${dates}` : null,
    '',
    'Message:',
    message || '(no message)',
  ].filter((l) => l !== null);

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `Race coaching enquiry — ${programme || 'General'} (${name})`,
        text: lines.join('\n'),
      }),
    });
    if (!resp.ok) return json({ error: FALLBACK_ERROR, fallback: true }, 502);
  } catch {
    return json({ error: FALLBACK_ERROR, fallback: true }, 502);
  }

  return json({ ok: true });
};
