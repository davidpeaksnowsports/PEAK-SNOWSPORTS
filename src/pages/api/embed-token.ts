// POST /api/embed-token
// Generates a fresh Arch embed token server-side and returns the ready-to-use
// iframe src. ARCH_SECURE_API_KEY is never forwarded to the browser.
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const embedPath: string  = typeof body?.embedPath  === 'string' ? body.embedPath  : '/products';
  const successUrl: string = typeof body?.successUrl === 'string' ? body.successUrl : `${import.meta.env.SITE_URL}/book`;

  const BOOKING_URL = import.meta.env.ARCH_BOOKING_URL;
  const SECURE_KEY  = import.meta.env.ARCH_SECURE_API_KEY;
  const DOMAIN      = import.meta.env.SITE_URL;

  try {
    const res = await fetch(`${BOOKING_URL}/api/v1/embed/token/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secure_api_key: SECURE_KEY, domain: DOMAIN }),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Token generation failed: ${res.status} ${res.statusText}` }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const data = await res.json();
    const qs = embedPath.includes('?') ? '&' : '?';
    const iframeSrc = `${BOOKING_URL}${embedPath}${qs}embed=1&embed_token=${data.token}&embed_parent_url=${encodeURIComponent(successUrl)}`;

    return new Response(
      JSON.stringify({ iframe_src: iframeSrc }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Could not reach booking system' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
