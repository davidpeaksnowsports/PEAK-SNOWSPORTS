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
  // TEMP DEBUG: probe the runtime to figure out why prod is returning empty 500.
  const debug = new URL(request.url).searchParams.get('debug') === '1';
  if (debug) {
    const keyPresent = !!process.env.SKI_OPERATOR_SECURE_KEY;
    const envKeys = Object.keys(process.env).filter(k => /SKI|OPERATOR/i.test(k));
    return new Response(
      JSON.stringify({ ok: true, keyPresent, matchedEnvKeys: envKeys, node: process.version }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // Read at runtime via process.env (not import.meta.env, which would bake the
  // value into the function bundle at build time). Vercel injects the secret
  // fresh per invocation, so rotating the key needs no rebuild.
  const SKI_OPERATOR_SECURE_KEY = process.env.SKI_OPERATOR_SECURE_KEY;

  if (!SKI_OPERATOR_SECURE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Booking system not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // SkiOperator validates the request origin against the allowlist configured
  // for this tenant. Requests from other origins are rejected upstream.
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
      JSON.stringify({ error: 'Could not reach booking system.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({
        error: 'Booking system rejected the token request.',
        upstream_status: upstream.status,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await upstream.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
