/**
 * Mints a short-lived embed token from Arch using our server-only secret key.
 *
 * Per Arch's Option B (server-to-server) flow:
 *   POST {ARCH_BASE_URL}/api/v1/embed/token/generate
 *     body: { secure_api_key, domain }
 *     -> { token, ... }
 *
 * The browser calls this endpoint (no key in the page source); we call Arch
 * server-side; we return only the token. The secret never reaches the client.
 *
 * Required env vars (Vercel + local .env, both Preview and Production):
 *   ARCH_API_KEY    — the sec_… key (NO PUBLIC_ prefix, never expose)
 *   ARCH_BASE_URL   — e.g. https://peaksnowsports.com
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Read at runtime via process.env (not import.meta.env, which would
  // substitute the value at build time and bake it into the function
  // bundle). With process.env, Vercel injects the secret fresh per
  // invocation from project env vars — so rotating the key needs no rebuild.
  const ARCH_API_KEY = process.env.ARCH_API_KEY;
  const ARCH_BASE_URL = process.env.ARCH_BASE_URL;

  if (!ARCH_API_KEY || !ARCH_BASE_URL) {
    return new Response(
      JSON.stringify({ error: 'Booking system not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // The domain we're embedding on — Arch uses this to validate the request
  // against allowed domains configured in their dashboard.
  const origin = new URL(request.url).origin;

  let archResp: Response;
  try {
    archResp = await fetch(`${ARCH_BASE_URL}/api/v1/embed/token/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secure_api_key: ARCH_API_KEY,
        domain: origin,
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Could not reach booking system.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!archResp.ok) {
    return new Response(
      JSON.stringify({
        error: 'Booking system rejected the token request.',
        upstream_status: archResp.status,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await archResp.json();

  // Forward whatever Arch returns (presumably `{ token: "…" }`); browser-side
  // code can pick out what it needs. Don't cache — tokens are short-lived.
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
