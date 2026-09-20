/**
 * Auth guard for the two signed-in areas: the instructor portal at /portal and
 * the GAP student portal at /gap.
 *
 * Middleware runs only for on-demand routes, so every guarded page sets
 * `export const prerender = false`. A page that forgets that would be built as
 * static HTML and served without ever passing through here — so each layout
 * asserts on its own `Astro.locals` user rather than trusting the guard alone.
 *
 * It also carries the site's CSRF check for form submissions — see
 * `isSameSiteForm` below. Everything outside those two prefixes passes through
 * untouched apart from that check.
 */
import { defineMiddleware } from 'astro:middleware';
import { getPortalUser, isPortalConfigured } from './lib/portal/supabase';
import { getGapUser, isGapConfigured } from './lib/gap/supabase';

/** Reachable without a session. Everything else under /portal requires one. */
const PUBLIC_PORTAL_ROUTES = new Set([
  '/portal/login',
  '/portal/logout',
  '/portal/forgot-password',
  '/portal/reset-password',
]);

const PUBLIC_GAP_ROUTES = new Set([
  '/gap/join',
  '/gap/login',
  '/gap/logout',
  '/gap/forgot-password',
  '/gap/reset-password',
]);

const normalise = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

/**
 * Segment-exact prefix test. `startsWith('/gap')` would also match the public
 * marketing page /gap-course and put it behind a login — which is exactly the
 * page that sells the course.
 */
const under = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

/* ------------------------------------------------------------------ CSRF -- */

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Content types a plain HTML form can produce, and therefore the ones a page on
 * another origin can submit without CORS permission. JSON is excluded on
 * purpose: a cross-origin fetch cannot set `Content-Type: application/json`
 * without a preflight the browser will refuse.
 */
const FORM_CONTENT_TYPES = [
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
];

/** First value of a possibly comma-joined proxy header. */
const firstValue = (header: string | null) =>
  header ? (header.split(',')[0] ?? '').trim() : '';

/**
 * Is this form submission coming from our own site?
 *
 * This replaces Astro's built-in `security.checkOrigin`, which is disabled in
 * astro.config.mjs. That check compares the Origin header against the URL it
 * reconstructs from the request, and behind Vercel's proxy that URL carries the
 * internal host rather than the public one — so every form POST on the deployed
 * site was rejected with "Cross-site POST form submissions are forbidden",
 * while localhost, with no proxy in front of it, worked perfectly.
 *
 * Comparing against the forwarded host instead is what the built-in check is
 * trying to do, done with the headers the proxy actually sets. It needs no
 * allowlist: www, staging, preview deployments and localhost all satisfy it,
 * and none of them satisfies it for a request originating anywhere else.
 */
function isSameSiteForm(request: Request): boolean {
  const host = firstValue(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
  );
  if (!host) return false;

  const proto =
    firstValue(request.headers.get('x-forwarded-proto')) ||
    new URL(request.url).protocol.replace(':', '');

  const origin = request.headers.get('origin');
  if (origin) return origin === `${proto}://${host}`;

  // A few clients omit Origin on same-origin form posts. Referer is a weaker
  // signal but a real one; with neither, the request is refused.
  const referer = request.headers.get('referer');
  if (!referer) return false;
  try {
    return new URL(referer).host === host;
  } catch {
    return false;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;

  // Site-wide, not just the portals: the no-JS fallback on the public enquiry
  // and job-application forms posts urlencoded too.
  if (UNSAFE_METHODS.has(request.method)) {
    const contentType = request.headers.get('content-type') ?? '';
    const isForm = FORM_CONTENT_TYPES.some((t) => contentType.includes(t));
    if (isForm && !isSameSiteForm(request)) {
      return new Response('Cross-site form submission blocked.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
      });
    }
  }

  const path = normalise(context.url.pathname);
  const area = under(path, '/portal')
    ? 'portal'
    : under(path, '/gap')
      ? 'gap'
      : null;

  if (!area) return next();

  // Belt and braces: no response from a guarded area should ever be cached by
  // a CDN or indexed, whether it renders a document or a redirect.
  const finish = async () => {
    const response = await next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  };

  const configured = area === 'portal' ? isPortalConfigured : isGapConfigured;
  const loginPath = `/${area === 'portal' ? 'portal' : 'gap'}/login`;
  const publicRoutes = area === 'portal' ? PUBLIC_PORTAL_ROUTES : PUBLIC_GAP_ROUTES;
  const home = area === 'portal' ? '/portal' : '/gap/dashboard';

  // Without Supabase configured there is no way to authenticate anyone. Let the
  // login page render its setup notice, and keep every other route shut.
  if (!configured) {
    context.locals.portalUser = null;
    context.locals.gapUser = null;
    if (path === loginPath) return finish();
    return context.redirect(loginPath, 302);
  }

  const user =
    area === 'portal'
      ? await getPortalUser(context.cookies, context.request)
      : await getGapUser(context.cookies, context.request);

  // Only ever populate the locals for the area being served. A coach who is
  // also an instructor holds one Supabase session, but /portal must not read a
  // GAP profile or vice versa.
  if (area === 'portal') {
    context.locals.portalUser = user as App.Locals['portalUser'];
    context.locals.gapUser = null;
  } else {
    context.locals.gapUser = user as App.Locals['gapUser'];
    context.locals.portalUser = null;
  }

  if (publicRoutes.has(path)) {
    // Already signed in and heading for the login page — send them onward.
    if (user && path === loginPath) return context.redirect(home, 302);
    return finish();
  }

  if (!user) {
    // Preserve where they were going so login can return them there. Only the
    // path is carried, never a full URL, so this can't be used as an open
    // redirect onto another host.
    const target = `${context.url.pathname}${context.url.search}`;
    return context.redirect(
      `${loginPath}?next=${encodeURIComponent(target)}`,
      302,
    );
  }

  return finish();
});
