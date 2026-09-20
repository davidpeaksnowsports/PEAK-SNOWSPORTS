/**
 * Auth guard for the two signed-in areas: the instructor portal at /portal and
 * the GAP student portal at /gap.
 *
 * Middleware runs only for on-demand routes, so every guarded page sets
 * `export const prerender = false`. A page that forgets that would be built as
 * static HTML and served without ever passing through here — so each layout
 * asserts on its own `Astro.locals` user rather than trusting the guard alone.
 *
 * Everything outside those two prefixes passes straight through untouched.
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

export const onRequest = defineMiddleware(async (context, next) => {
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
  const home = area === 'portal' ? '/portal' : '/gap';

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
