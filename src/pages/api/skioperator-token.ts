/**
 * Mints a short-lived embed token from SkiOperator using our server-only
 * secure key. The browser calls this endpoint; the endpoint calls SkiOperator
 * with the secret; only the token is returned to the browser — so the secret
 * never reaches the client.
 *
 * Tokens are short-lived and must not be cached or persisted.
 *
 * Required env var (Vercel Preview + Production, and local .env):
 *   SKI_OPERATOR_SECURE_KEY — the sec_… key (NO PUBLIC_ prefix, never expose)
 */
import type { APIRoute } from 'astro';

const SKI_OPERATOR_ORIGIN = 'https://www.ski-operator.com';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const debug = new URL(request.url).searchParams.get('debug') === '1';

  try {
    // Read at runtime via process.env so Vercel injects the secret fresh per
    // invocation; rotating the key needs no rebuild.
    const SKI_OPERATOR_SECURE_KEY = process.env.SKI_OPERATOR_SECURE_KEY;

    if (!SKI_OPERATOR_SECURE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Booking system not configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SkiOperator validates the request origin against the allowlist
    // configured for this tenant. Requests from other origins are rejected
    // upstream. On Vercel, request.url is the full public URL.
    const origin = new URL(request.url).origin;

    let upstream: Response;
    try {
      upstream = await fetch(`${SKI_OPERATOR_ORIGIN}/api/v1/embed/token/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secure_api_key: SKI_OPERATOR_SECURE_KEY,
          domain: origin,
        }),
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Could not reach booking system.',
          detail: debug ? String(err) : undefined,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const bodyText = await upstream.text();

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: 'Booking system rejected the token request.',
          upstream_status: upstream.status,
          upstream_body: debug ? bodyText.slice(0, 500) : undefined,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Booking system returned non-JSON response.',
          upstream_status: upstream.status,
          upstream_body: debug ? bodyText.slice(0, 500) : undefined,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    // Catch-all so any unexpected throw becomes a structured response
    // instead of Vercel's default empty 500 page.
    return new Response(
      JSON.stringify({
        error: 'Internal error in token endpoint.',
        detail: debug ? String(err) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
