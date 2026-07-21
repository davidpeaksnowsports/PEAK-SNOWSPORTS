/**
 * Receives partner-programme enquiries from /partners and does two things:
 *
 *   1. Notifies the team at hello@peaksnowsports.com with the lead's details.
 *   2. Emails the enquirer a thank-you with the 2026/27 rate card attached.
 *
 * The rate card is public at /downloads/peak-snowsports-partner-programme-2627.pdf,
 * but we prefer the emailed copy: it starts a real thread and captures the lead.
 *
 * Required env vars (Vercel + local .env, Preview + Production):
 *   RESEND_API_KEY         , the re_… key (NO PUBLIC_ prefix)
 * Optional:
 *   PARTNER_ENQUIRY_TO     , recipient(s), comma-separated. Default hello@peaksnowsports.com
 *   PARTNER_ENQUIRY_FROM   , verified Resend sender. Default "Peak Snowsports <partners@peaksnowsports.com>"
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
  companyName?: string;
  role?: string;
  website?: string;
  category?: string;
  resorts?: string;
  message?: string;
  company?: string; // honeypot — real users never fill this
}

const RATE_CARD_PATH = '/downloads/peak-snowsports-partner-programme-2627.pdf';
const RATE_CARD_FILENAME = 'peak-snowsports-partner-programme-2627.pdf';

const SPONSORSHIP_PATH = '/downloads/peak-snowsports-sponsorship-deck.pdf';
const SPONSORSHIP_FILENAME = 'peak-snowsports-sponsorship-deck.pdf';

// Category value we watch for to switch the outgoing PDF from the referral
// rate card to the sponsorship deck. Kept in sync with the form's dropdown.
const SPONSORSHIP_CATEGORY = 'Sponsorship';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clean = (v: unknown, max = 2000) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

async function fetchPdfBase64(origin: string, path: string): Promise<string | null> {
  try {
    const resp = await fetch(new URL(path, origin));
    if (!resp.ok) return null;
    const bytes = new Uint8Array(await resp.arrayBuffer());
    // base64 without pulling in Node Buffer types
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

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
  const companyName = clean(body.companyName, 200);
  const role = clean(body.role, 120);
  const website = clean(body.website, 200);
  const category = clean(body.category, 120);
  const resorts = clean(body.resorts, 200);
  const message = clean(body.message, 4000);

  if (!name || !email || !isEmail(email) || !companyName) {
    return json(
      { error: 'Please give us your name, a valid email, and your company.' },
      422,
    );
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return json(
      { error: 'Enquiry email is not configured yet.', fallback: true },
      503,
    );
  }

  const teamTo = (process.env.PARTNER_ENQUIRY_TO ?? 'hello@peaksnowsports.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from =
    process.env.PARTNER_ENQUIRY_FROM ??
    'Peak Snowsports <partners@peaksnowsports.com>';

  const origin = new URL(request.url).origin;
  const isSponsorship = category === SPONSORSHIP_CATEGORY;
  const attachmentPath = isSponsorship ? SPONSORSHIP_PATH : RATE_CARD_PATH;
  const attachmentFilename = isSponsorship ? SPONSORSHIP_FILENAME : RATE_CARD_FILENAME;
  const attachmentLabel = isSponsorship ? 'sponsorship deck' : '2026/27 rate card';
  const attachmentBase64 = await fetchPdfBase64(origin, attachmentPath);
  const attachmentUrl = new URL(attachmentPath, origin).toString();

  const enquiryKind = isSponsorship ? 'sponsorship' : 'partner';

  const teamLines = [
    `New ${enquiryKind} enquiry from the website.`,
    '',
    `Name:      ${name}`,
    `Email:     ${email}`,
    phone ? `Phone:     ${phone}` : null,
    `Company:   ${companyName}`,
    role ? `Role:      ${role}` : null,
    website ? `Website:   ${website}` : null,
    category ? `Category:  ${category}` : null,
    resorts ? `Resort(s): ${resorts}` : null,
    '',
    'Message:',
    message || '(no message)',
    '',
    `A copy of the ${attachmentLabel} has ${attachmentBase64 ? 'been' : 'NOT been'} sent to the enquirer.`,
  ].filter((l) => l !== null);

  const firstName = name.split(/\s+/)[0] || 'there';
  const partnerLines = isSponsorship
    ? [
        `Hi ${firstName},`,
        '',
        'Thanks for your interest in sponsoring Peak Snowsports. The Winter 2026/27 sponsorship deck is attached.',
        '',
        'It covers the three tiers (Premier, Partner, Supporter), what each includes across logo placement, kids\' bibs, social and website presence, and the co-branded content add-on. We only take three sponsors per season, and Premier is exclusive by category, so worth flagging any category-specific interest when you reply.',
        '',
        'One of our team will be in touch shortly to talk about fit. If you would like to jump on a call, reply with a time that suits you.',
        '',
        'Best,',
        'The Peak Snowsports team',
        '',
        '— Peak Snowsports · Morzine, France',
        'hello@peaksnowsports.com · +44 1483 616 522',
        `Can't see the attachment? Download the deck here: ${attachmentUrl}`,
      ]
    : [
        `Hi ${firstName},`,
        '',
        'Thanks for your interest in the Peak Snowsports partner programme. The 2026/27 rate card is attached.',
        '',
        'It covers the 10% commission structure, the five ways your team or booking flow can refer guests, and the private, group and off-piste products we offer across Avoriaz-Morzine, Châtel and Les Gets.',
        '',
        'One of our team will be in touch shortly to talk about how we might work together. If you would rather jump straight on a call, reply to this email with a time that suits you.',
        '',
        'Best,',
        'The Peak Snowsports team',
        '',
        '— Peak Snowsports · Morzine, France',
        'hello@peaksnowsports.com · +44 1483 616 522',
        `Can't see the attachment? Download the rate card here: ${attachmentUrl}`,
      ];

  // Fire team notification first; if that fails, the enquirer won't get the
  // "we've got it" attachment either — better than a silent black hole.
  try {
    const teamResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: teamTo,
        reply_to: email,
        subject: `${isSponsorship ? 'Sponsorship' : 'Partner'} enquiry — ${companyName} (${name})`,
        text: teamLines.join('\n'),
      }),
    });
    if (!teamResp.ok) {
      return json(
        {
          error: 'Could not send your enquiry. Please email hello@peaksnowsports.com instead.',
          fallback: true,
        },
        502,
      );
    }
  } catch {
    return json(
      {
        error: 'Could not send your enquiry. Please email hello@peaksnowsports.com instead.',
        fallback: true,
      },
      502,
    );
  }

  // Send the enquirer their rate card. Failure here doesn't fail the whole
  // request — we've captured the lead and can send the deck manually if needed.
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: teamTo[0],
        subject: isSponsorship
          ? 'Your Peak Snowsports sponsorship deck · Winter 2026/27'
          : 'Your Peak Snowsports partner rate card · 2026/27',
        text: partnerLines.join('\n'),
        attachments: attachmentBase64
          ? [
              {
                filename: attachmentFilename,
                content: attachmentBase64,
                content_type: 'application/pdf',
              },
            ]
          : undefined,
      }),
    });
  } catch {
    // Swallow — team is already notified.
  }

  return json({ ok: true });
};
