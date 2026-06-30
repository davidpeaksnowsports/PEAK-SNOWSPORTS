/**
 * Captures kit-list lead-magnet signups from /gap-course and emails the lead
 * to the team via Resend. Mirrors gap-enquiry.ts (server-only RESEND_API_KEY).
 *
 * The downloadable asset itself is a public file
 * (/downloads/peak-ski-instructor-kit-list.pdf); this endpoint exists to
 * capture the email, not to gate the file. So even when email isn't configured
 * we return ok with { captured: false } and let the form reveal the download —
 * we'd rather hand over the asset than lose the visitor.
 *
 * Required env vars (Vercel + local .env, Preview and Production):
 *   RESEND_API_KEY     , the re_… key (NO PUBLIC_ prefix)
 * Optional:
 *   LEAD_MAGNET_TO     , recipient(s), comma-separated. Default hello@peaksnowsports.com
 *   GAP_ENQUIRY_FROM   , verified Resend sender. Default "Peak GAP <gap@peaksnowsports.com>"
 */
import type { APIRoute } from 'astro';

export const prerender = false;

interface Lead {
  name?: string;
  email?: string;
  company?: string; // honeypot
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clean = (v: unknown, max = 200) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export const POST: APIRoute = async ({ request }) => {
  let body: Lead = {};
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Lead;
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as Lead;
    }
  } catch {
    return json({ error: 'Could not read your submission.' }, 400);
  }

  // Honeypot: a filled "company" field means a bot. Pretend success, do nothing.
  if (clean(body.company)) return json({ ok: true, captured: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  if (!email || !isEmail(email)) {
    return json({ error: 'Please give us a valid email.' }, 422);
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    // Not configured — still let the visitor have the asset; flag uncaptured.
    return json({ ok: true, captured: false });
  }

  const to = (process.env.LEAD_MAGNET_TO ?? 'hello@peaksnowsports.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.GAP_ENQUIRY_FROM ?? 'Peak GAP <gap@peaksnowsports.com>';

  const lines = [
    'New kit-list download — add to the GAP nurture list.',
    '',
    `Name:   ${name || '(not given)'}`,
    `Email:  ${email}`,
  ];

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
        subject: `Kit-list download — ${email}`,
        text: lines.join('\n'),
      }),
    });
    // Even if Resend errors, hand over the asset; just report capture state.
    return json({ ok: true, captured: resp.ok });
  } catch {
    return json({ ok: true, captured: false });
  }
};
