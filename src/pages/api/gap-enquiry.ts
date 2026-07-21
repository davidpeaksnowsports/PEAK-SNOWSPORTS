/**
 * Receives GAP-course enquiries from the form on /gap-course and emails them
 * to the team via Resend's REST API. Mirrors the server-only pattern used by
 * skioperator-token.ts: the API key lives in process.env and never reaches the
 * browser.
 *
 * The browser POSTs JSON (or a urlencoded form as a no-JS fallback). We
 * validate, drop spam via a honeypot, then forward to Resend.
 *
 * Required env vars (Vercel + local .env, Preview and Production):
 *   RESEND_API_KEY     , the re_… key (NO PUBLIC_ prefix, never expose)
 * Optional env vars:
 *   GAP_ENQUIRY_TO     , recipient(s), comma-separated. Default hello@peaksnowsports.com
 *   GAP_ENQUIRY_FROM   , verified Resend sender. Default "Peak GAP <gap@peaksnowsports.com>"
 *
 * If RESEND_API_KEY is absent the endpoint returns 503 with { fallback: true }
 * so the form can fall back to WhatsApp / email rather than failing silently.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

interface Enquiry {
  name?: string;
  email?: string;
  phone?: string;
  intake?: string;
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
  const intake = clean(body.intake, 120);
  const message = clean(body.message, 4000);

  if (!name || !email || !isEmail(email)) {
    return json({ error: 'Please give us your name and a valid email.' }, 422);
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    // Not configured yet — tell the form to show the WhatsApp / email fallback.
    return json(
      {
        error: 'Enquiry email is not configured yet.',
        fallback: true,
      },
      503,
    );
  }

  const to = (process.env.GAP_ENQUIRY_TO ?? 'hello@peaksnowsports.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.GAP_ENQUIRY_FROM ?? 'Peak GAP <gap@peaksnowsports.com>';

  const lines = [
    `New GAP course enquiry from the website.`,
    ``,
    `Name:    ${name}`,
    `Email:   ${email}`,
    phone ? `Phone:   ${phone}` : null,
    intake ? `Intake:  ${intake}` : null,
    ``,
    `Message:`,
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
        subject: `GAP enquiry — ${name}${intake ? ` (${intake})` : ''}`,
        text: lines.join('\n'),
      }),
    });
  } catch {
    return json({ error: 'Could not send your enquiry. Please WhatsApp us instead.', fallback: true }, 502);
  }

  if (!resendResp.ok) {
    return json(
      { error: 'Could not send your enquiry. Please WhatsApp us instead.', fallback: true },
      502,
    );
  }

  return json({ ok: true });
};
