/**
 * Sign out. POST only — a GET would let any page on the internet sign a
 * student out by embedding <img src="/gap/logout">.
 */
import type { APIRoute } from 'astro';
import { createGapClient, isGapConfigured } from '../../lib/gap/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  if (isGapConfigured) {
    const supabase = createGapClient(cookies, request);
    await supabase.auth.signOut();
  }
  return redirect('/gap/login', 303);
};

/** A GET here means someone typed the URL. Send them home rather than 405. */
export const GET: APIRoute = ({ redirect }) => redirect('/gap/dashboard', 302);
