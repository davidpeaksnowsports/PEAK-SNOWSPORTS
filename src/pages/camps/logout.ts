/**
 * Sign out. POST only — a GET would let any page on the internet sign a user
 * out by embedding <img src="/camps/logout">.
 */
import type { APIRoute } from 'astro';
import { createCampsClient, isCampsConfigured } from '../../lib/camps/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  if (isCampsConfigured) {
    const supabase = createCampsClient(cookies, request);
    await supabase.auth.signOut();
  }
  return redirect('/camps/login', 303);
};

/** A GET here means someone typed the URL. Send them home rather than 405. */
export const GET: APIRoute = ({ redirect }) => redirect('/camps', 302);
