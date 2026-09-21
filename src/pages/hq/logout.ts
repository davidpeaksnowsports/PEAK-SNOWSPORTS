/**
 * Sign out. POST only — a GET would let any page on the internet sign a user
 * out by embedding <img src="/hq/logout">.
 */
import type { APIRoute } from 'astro';
import { createHqClient, isHqConfigured } from '../../lib/hq/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  if (isHqConfigured) {
    const supabase = createHqClient(cookies, request);
    await supabase.auth.signOut();
  }
  return redirect('/hq/login', 303);
};

/** A GET here means someone typed the URL. Send them home rather than 405. */
export const GET: APIRoute = ({ redirect }) => redirect('/hq', 302);
