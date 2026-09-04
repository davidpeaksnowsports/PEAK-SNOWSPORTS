/**
 * Auth guard for the instructor portal.
 *
 * Middleware runs only for on-demand routes, so every /portal page sets
 * `export const prerender = false`. A portal page that forgets that would be
 * built as static HTML and served without ever passing through here — so the
 * layout asserts on `Astro.locals.portalUser` rather than trusting the guard
 * alone, and the build check below fails loudly in dev.
 *
 * Everything outside /portal passes straight through untouched.
 */
import { defineMiddleware } from 'astro:middleware';
import { getPortalUser, isPortalConfigured } from './lib/portal/supabase';

/** Reachable without a session. Everything else under /portal requires one. */
const PUBLIC_PORTAL_ROUTES = new Set([
  '/portal/login',
  '/portal/logout',
  '/portal/forgot-password',
  '/portal/reset-password',
]);

const normalise = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = normalise(context.url.pathname);

  if (!path.startsWith('/portal')) return next();

  // Belt and braces: no portal response should ever be cached by a CDN or
  // indexed, whether it renders a document or a redirect.
  const finish = async () => {
    const response = await next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  };

  // Without Supabase configured there is no way to authenticate anyone. Let the
  // login page render its setup notice, and keep every other route shut.
  if (!isPortalConfigured) {
    context.locals.portalUser = null;
    if (path === '/portal/login') return finish();
    return context.redirect('/portal/login', 302);
  }

  const user = await getPortalUser(context.cookies, context.request);
  context.locals.portalUser = user;

  if (PUBLIC_PORTAL_ROUTES.has(path)) {
    // Already signed in and heading for the login page — send them onward.
    if (user && path === '/portal/login') {
      return context.redirect('/portal', 302);
    }
    return finish();
  }

  if (!user) {
    // Preserve where they were going so login can return them there. Only the
    // path is carried, never a full URL, so this can't be used as an open
    // redirect onto another host.
    const next = `${context.url.pathname}${context.url.search}`;
    return context.redirect(
      `/portal/login?next=${encodeURIComponent(next)}`,
      302,
    );
  }

  return finish();
});
