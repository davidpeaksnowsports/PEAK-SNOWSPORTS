/**
 * Onboarding data for Peak HQ.
 *
 * Every read and write here runs as the signed-in member through the anon
 * key, so row-level security (migration 0008) is what scopes it: a member sees
 * and edits only their own row and ticks; a manager can read everyone's. The
 * page code never has to be the thing that enforces that.
 *
 * Deliberately absent: numéro de sécurité sociale, IBAN, identity documents.
 * Those go straight to payroll, never through this portal.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** Systems a new starter may need an account on. Stored as these keys. */
export const ACCOUNT_OPTIONS = [
  { key: 'email', label: 'Peak email address' },
  { key: 'skioperator', label: 'SkiOperator' },
  { key: 'google-chat', label: 'Google Chat' },
  { key: 'onedrive', label: 'OneDrive' },
  { key: 'sanity', label: 'Website editor (Sanity)' },
] as const;

export const JACKET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export interface Onboarding {
  preferred_name: string | null;
  phone: string | null;
  emergency_name: string | null;
  emergency_relationship: string | null;
  emergency_phone: string | null;
  jacket_size: string | null;
  accounts_needed: string[];
  notes: string | null;
  submitted_at: string | null;
}

const EMPTY: Onboarding = {
  preferred_name: null,
  phone: null,
  emergency_name: null,
  emergency_relationship: null,
  emergency_phone: null,
  jacket_size: null,
  accounts_needed: [],
  notes: null,
  submitted_at: null,
};

const clean = (v: FormDataEntryValue | null, max: number) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return s === '' ? null : s;
};

export async function getOnboarding(
  supabase: SupabaseClient,
  memberId: string,
): Promise<Onboarding> {
  const { data } = await supabase
    .from('staff_onboarding')
    .select(
      'preferred_name, phone, emergency_name, emergency_relationship, emergency_phone, jacket_size, accounts_needed, notes, submitted_at',
    )
    .eq('member_id', memberId)
    .maybeSingle();
  return data ? { ...EMPTY, ...data } : EMPTY;
}

/**
 * Validate and save the form. Returns the saved values, or a list of problems
 * the page should show beside the form. The phone and emergency contact are
 * required: they are the reason the form exists.
 */
export async function saveOnboarding(
  supabase: SupabaseClient,
  memberId: string,
  form: FormData,
): Promise<{ ok: true } | { ok: false; errors: string[]; values: Onboarding }> {
  const accountKeys = new Set<string>(ACCOUNT_OPTIONS.map((a) => a.key));
  const jacket = clean(form.get('jacket_size'), 4);

  const values: Onboarding = {
    preferred_name: clean(form.get('preferred_name'), 80),
    phone: clean(form.get('phone'), 40),
    emergency_name: clean(form.get('emergency_name'), 120),
    emergency_relationship: clean(form.get('emergency_relationship'), 60),
    emergency_phone: clean(form.get('emergency_phone'), 40),
    jacket_size: jacket && (JACKET_SIZES as readonly string[]).includes(jacket) ? jacket : null,
    accounts_needed: form
      .getAll('accounts_needed')
      .map(String)
      .filter((k) => accountKeys.has(k)),
    notes: clean(form.get('notes'), 2000),
    submitted_at: null,
  };

  const errors: string[] = [];
  if (!values.phone) errors.push('Add a phone number we can reach you on.');
  if (!values.emergency_name || !values.emergency_phone) {
    errors.push('Add an emergency contact, with their phone number.');
  }
  if (errors.length) return { ok: false, errors, values };

  const { error } = await supabase.from('staff_onboarding').upsert(
    {
      member_id: memberId,
      ...values,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'member_id' },
  );

  if (error) {
    console.error('[hq] onboarding save failed:', error.message);
    return {
      ok: false,
      errors: ['That did not save. Try again, and tell the office if it keeps happening.'],
      values,
    };
  }
  return { ok: true };
}

export interface ChecklistItem {
  id: string;
  title: string;
  detail: string | null;
  link: string | null;
  done: boolean;
}

export async function getChecklist(
  supabase: SupabaseClient,
  memberId: string,
): Promise<ChecklistItem[]> {
  const [{ data: items }, { data: ticks }] = await Promise.all([
    supabase
      .from('staff_checklist_items')
      .select('id, title, detail, link')
      .eq('active', true)
      .order('sort'),
    supabase.from('staff_checklist_ticks').select('item_id').eq('member_id', memberId),
  ]);
  const done = new Set((ticks ?? []).map((t) => t.item_id));
  return (items ?? []).map((i) => ({ ...i, done: done.has(i.id) }));
}

/** Tick or untick one item. Idempotent in both directions. */
export async function setTick(
  supabase: SupabaseClient,
  memberId: string,
  itemId: string,
  done: boolean,
): Promise<void> {
  if (done) {
    await supabase
      .from('staff_checklist_ticks')
      .upsert({ member_id: memberId, item_id: itemId }, { onConflict: 'member_id,item_id', ignoreDuplicates: true });
  } else {
    await supabase
      .from('staff_checklist_ticks')
      .delete()
      .eq('member_id', memberId)
      .eq('item_id', itemId);
  }
}

export interface TeamRow {
  id: string;
  name: string;
  role: string;
  job_title: string | null;
  start_date: string | null;
  active: boolean;
  onboarding: Onboarding | null;
  ticks: number;
}

/**
 * The whole team, for managers. RLS returns only the caller's own row to
 * anyone who is not a manager, so a non-manager calling this learns nothing —
 * the page also refuses them before calling it.
 */
export async function getTeam(supabase: SupabaseClient): Promise<{
  rows: TeamRow[];
  totalItems: number;
}> {
  const [{ data: members }, { data: onboarding }, { data: ticks }, { data: items }] =
    await Promise.all([
      supabase
        .from('staff_members')
        .select('id, name, role, job_title, start_date, active')
        .order('start_date', { ascending: false, nullsFirst: true }),
      supabase
        .from('staff_onboarding')
        .select(
          'member_id, preferred_name, phone, emergency_name, emergency_relationship, emergency_phone, jacket_size, accounts_needed, notes, submitted_at',
        ),
      supabase.from('staff_checklist_ticks').select('member_id, item_id'),
      supabase.from('staff_checklist_items').select('id').eq('active', true),
    ]);

  // Count only ticks on items still in use, so a retired item someone ticked
  // can't make the tally read "11 of 10".
  const live = new Set((items ?? []).map((i) => i.id));
  const byMember = new Map((onboarding ?? []).map((o) => [o.member_id, o]));
  const tickCount = new Map<string, number>();
  for (const t of ticks ?? []) {
    if (!live.has(t.item_id)) continue;
    tickCount.set(t.member_id, (tickCount.get(t.member_id) ?? 0) + 1);
  }

  return {
    totalItems: live.size,
    rows: (members ?? []).map((m) => {
      const o = byMember.get(m.id);
      return {
        ...m,
        onboarding: o ? { ...EMPTY, ...o } : null,
        ticks: tickCount.get(m.id) ?? 0,
      };
    }),
  };
}
