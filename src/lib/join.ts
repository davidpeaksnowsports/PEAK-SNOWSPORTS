/**
 * Join-code sign-up, shared by the instructor hub (/portal/join) and Peak HQ
 * (/hq/join).
 *
 * The code is the gate, and it is checked in the database, never here: a
 * trigger on sign-up and the `redeem_join_code` function both call
 * `area_for_join_code`, which no browser-facing role may execute. See
 * migration 0009.
 *
 * Nothing in this file can tell you whether a code is valid before an account
 * exists, and that is deliberate. An endpoint that answered "is this code
 * right?" for anyone who asked would let someone work through the keyspace
 * from the outside. The cost is that a mistyped code still creates an account
 * — one that reaches nothing, because every area refuses a session with no
 * profile row. The migration carries the SQL to clear those out.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type JoinArea = 'portal' | 'hq';

export const AREA_LABEL: Record<JoinArea, string> = {
  portal: 'the instructor hub',
  hq: 'Peak HQ',
};

export const AREA_HOME: Record<JoinArea, string> = {
  portal: '/portal',
  hq: '/hq',
};

export const MIN_PASSWORD = 10;

export interface JoinFields {
  name: string;
  email: string;
  code: string;
}

const str = (v: FormDataEntryValue | null, max = 200) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export function readFields(form: FormData): JoinFields & { password: string } {
  return {
    name: str(form.get('name'), 120),
    email: str(form.get('email'), 200),
    code: str(form.get('code'), 64),
    password: typeof form.get('password') === 'string' ? String(form.get('password')) : '',
  };
}

/**
 * Create an account. The profile row is created by the sign-up trigger if, and
 * only if, the code matches that area's.
 *
 * Returns a message to show rather than throwing: every failure here is
 * something the person can act on.
 */
export async function signUpWithCode(
  supabase: SupabaseClient,
  fields: JoinFields & { password: string },
  emailRedirectTo: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { name, email, password, code } = fields;

  if (!name) return { ok: false, error: 'Tell us your name.' };
  if (!email) return { ok: false, error: 'Add your email address.' };
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `Use a password of at least ${MIN_PASSWORD} characters.` };
  }
  if (!code) return { ok: false, error: 'Add the join code you were given.' };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, join_code: code }, emailRedirectTo },
  });

  if (error) {
    // Supabase reports an existing address as a generic error, and we do not
    // want to confirm which addresses are registered either way.
    return {
      ok: false,
      error:
        'We could not create that account. If you already have a Peak login, use the second form below instead.',
    };
  }
  return { ok: true };
}

/**
 * Add an area to an account that already exists. Signs in first, because the
 * redeem function runs as the signed-in user.
 *
 * This is how one login holds both an instructor profile and an HQ profile.
 * Redeeming a code twice does nothing, and never changes a role you already
 * have.
 */
export async function linkExistingAccount(
  supabase: SupabaseClient,
  email: string,
  password: string,
  code: string,
  name?: string,
): Promise<{ ok: true; area: JoinArea } | { ok: false; error: string }> {
  if (!email || !password) {
    return { ok: false, error: 'Enter your email address and password.' };
  }
  if (!code) return { ok: false, error: 'Add the join code you were given.' };

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { ok: false, error: 'That email address and password do not match.' };
  }

  const { data, error } = await supabase.rpc('redeem_join_code', {
    candidate: code,
    display_name: name || null,
  });

  if (error) {
    console.error('[join] redeem failed:', error.message);
    await supabase.auth.signOut();
    return { ok: false, error: 'Something went wrong. Try again, and tell the office if it persists.' };
  }

  if (!data) {
    // Signed in fine, but the code was wrong. Don't leave them holding a
    // session they didn't ask for.
    await supabase.auth.signOut();
    return { ok: false, error: 'That join code was not recognised. Check it with the office.' };
  }

  return { ok: true, area: data as JoinArea };
}
