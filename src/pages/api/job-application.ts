/**
 * Receives job applications from the form on /join and /join/[slug] and emails
 * them to the team via Resend's REST API. Same shape as gap-enquiry.ts — the
 * API key lives in process.env and never reaches the browser.
 *
 * The browser POSTs JSON (or a urlencoded form as a no-JS fallback). We
 * validate, drop spam via a honeypot, then forward to Resend. `reply_to` is the
 * applicant, so hitting reply in the inbox answers them directly.
 *
 * Required env vars (Vercel + local .env, Preview and Production):
 *   RESEND_API_KEY       , the re_… key (NO PUBLIC_ prefix, never expose)
 * Optional env vars:
 *   CAREERS_TO           , recipient(s), comma-separated. Default hello@peaksnowsports.com
 *   CAREERS_FROM         , verified Resend sender. Default "Peak Careers <careers@peaksnowsports.com>"
 *
 * If RESEND_API_KEY is absent the endpoint returns 503 with { fallback: true }
 * so the form can fall back to WhatsApp / email rather than failing silently.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

interface Application {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  nationality?: string;
  qualifications?: string;
  availability?: string;
  links?: string;
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

export const POST: APIRoute = async ({ request }) => {
  // Accept JSON (fetch) or form-encoded (no-JS fallback).
  let body: Application = {};
  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Application;
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as Application;
    }
  } catch {
    return json({ error: 'Could not read your application.' }, 400);
  }

  // Honeypot: a filled "company" field means a bot. Pretend success, do nothing.
  if (clean(body.company)) return json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 60);
  const role = clean(body.role, 120) || 'Not specified';
  const nationality = clean(body.nationality, 120);
  const qualifications = clean(body.qualifications, 500);
  const availability = clean(body.availability, 200);
  const links = clean(body.links, 600);
  const message = clean(body.message, 6000);

  if (!name || !email || !isEmail(email)) {
    return json({ error: 'Please give us your name and a valid email.' }, 422);
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    // Not configured yet — tell the form to show the WhatsApp / email fallback.
    return json({ error: 'Applications by form are not configured yet.', fallback: true }, 503);
  }

  const to = (process.env.CAREERS_TO ?? 'hello@peaksnowsports.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.CAREERS_FROM ?? 'Peak Careers <careers@peaksnowsports.com>';

  const lines = [
    `New job application from the website.`,
    ``,
    `Role:           ${role}`,
    `Name:           ${name}`,
    `Email:          ${email}`,
    phone ? `Phone:          ${phone}` : null,
    nationality ? `Nationality:    ${nationality}` : null,
    availability ? `Availability:   ${availability}` : null,
    qualifications ? `Qualifications: ${qualifications}` : null,
    links ? `Links:          ${links}` : null,
    ``,
    `About them:`,
    message || '(no message)',
  ].filter((l) => l !== null);

  let resendResp: Response;
  try {
    resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `Application — ${role} — ${name}`,
        text: lines.join('\n'),
      }),
    });
  } catch {
    return json(
      { error: 'Could not send your application. Please WhatsApp or email us instead.', fallback: true },
      502,
    );
  }

  if (!resendResp.ok) {
    return json(
      { error: 'Could not send your application. Please WhatsApp or email us instead.', fallback: true },
      502,
    );
  }

  return json({ ok: true });
};
