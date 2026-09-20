/**
 * The origin a visitor actually typed, as opposed to the one the server thinks
 * it is serving.
 *
 * `Astro.url.origin` is reconstructed from the incoming request, and behind
 * Vercel's proxy that carries an internal host rather than
 * https://www.peaksnowsports.com. Anywhere that value is merely logged the
 * difference is invisible; anywhere it is handed to another service it is a
 * bug, because the other service sees a URL that does not belong to us.
 *
 * That is what broke email confirmation and password reset. Supabase is given
 * a `redirectTo`, checks it against the project's redirect allow list, finds a
 * host that is not on it, silently discards it and falls back to the project's
 * Site URL — so students confirming their email landed on the website's home
 * page instead of the portal.
 *
 * The same proxy headers that fixed the CSRF check fix this: x-forwarded-host
 * and x-forwarded-proto are what the edge sets, and they hold the public host
 * on production, staging, preview deployments and localhost alike.
 */

/** First value of a possibly comma-joined proxy header. */
const firstValue = (header: string | null) =>
  header ? (header.split(',')[0] ?? '').trim() : '';

/**
 * Resolve the public origin, e.g. "https://www.peaksnowsports.com".
 *
 * `fallback` is the request URL as Astro sees it — used only when no proxy
 * headers are present, which is the case for `astro dev`.
 */
export function publicOrigin(request: Request, fallback: URL): string {
  const host = firstValue(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
  );
  if (!host) return fallback.origin;

  const proto =
    firstValue(request.headers.get('x-forwarded-proto')) ||
    fallback.protocol.replace(':', '');

  return `${proto}://${host}`;
}

/** An absolute URL on the public origin, for handing to another service. */
export function publicUrl(path: string, request: Request, fallback: URL): string {
  return new URL(path, publicOrigin(request, fallback)).toString();
}
