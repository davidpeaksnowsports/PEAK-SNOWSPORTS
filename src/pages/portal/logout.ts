/**
 * Sign out. POST only — a GET would let any page on the internet sign a user
 * out by embedding <img src="/portal/logout">.
 */
import type { APIRoute } from 'astro';
import { createPortalClient, isPortalConfigured } from '../../lib/portal/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  if (isPortalConfigured) {
    const supabase = createPortalClient(cookies, request);
    await supabase.auth.signOut();
  }
  return redirect('/portal/login', 303);
};

/** A GET here means someone typed the URL. Send them home rather than 405. */
export const GET: APIRoute = ({ redirect }) => redirect('/portal', 302);
