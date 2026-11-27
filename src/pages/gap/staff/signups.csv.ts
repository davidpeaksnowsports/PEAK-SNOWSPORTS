/**
 * The sign-up list as a CSV, for the office.
 *
 * Includes the pre-arrival details students submit, because the thing somebody
 * actually wants this for is a dietary list for the chalet or a sheet of
 * emergency contacts to take up the hill.
 *
 * Staff only. The roster comes from gap_cohort_signups(), which returns
 * nothing to a student, and the detail columns come from gap_members, which
 * RLS limits to the caller's own cohort.
 */
import type { APIRoute } from 'astro';
import { createGapClient, isStaff, type GapUser } from '../../../lib/gap/supabase';

export const prerender = false;

const COLUMNS = [
  ['name', 'Name'],
  ['email', 'Email'],
  ['joined_at', 'Joined'],
  ['email_confirmed', 'Email confirmed'],
  ['last_sign_in_at', 'Last sign-in'],
  ['onboarding_submitted_at', 'Details sent'],
  ['date_of_birth', 'Date of birth'],
  ['phone', 'Mobile'],
  ['emergency_name', 'Emergency contact'],
  ['emergency_relation', 'Relationship'],
  ['emergency_phone', 'Emergency phone'],
  ['medical', 'Medical'],
  ['dietary', 'Dietary'],
  ['insurance_provider', 'Insurer'],
  ['insurance_policy', 'Policy number'],
  ['height_cm', 'Height (cm)'],
  ['weight_kg', 'Weight (kg)'],
  ['ski_boot_size', 'Boot size'],
  ['arrival_notes', 'Travel'],
] as const;

/**
 * RFC 4180 quoting. A leading =, +, - or @ is prefixed with a single quote so
 * a spreadsheet treats "=2+2" in a free-text field as text rather than a
 * formula.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let s = typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');

export const GET: APIRoute = async ({ locals, cookies, request }) => {
  const user = locals.gapUser as GapUser | null;
  if (!user || !isStaff(user)) return new Response('Not found', { status: 404 });

  const db = createGapClient(cookies, request);

  const [{ data: signups }, { data: members }] = await Promise.all([
    db.rpc('gap_cohort_signups'),
    db
      .from('gap_members')
      .select(
        'id, date_of_birth, phone, emergency_name, emergency_relation, emergency_phone, medical, dietary, insurance_provider, insurance_policy, height_cm, weight_kg, ski_boot_size, arrival_notes',
      ),
  ]);

  const detail = new Map(
    (members ?? []).map((m) => [m.id as string, m as Record<string, unknown>]),
  );

  const rows: Record<string, unknown>[] = ((signups ?? []) as Record<string, unknown>[])
    .filter((s) => s.role === 'student')
    .map((s) => ({
      ...s,
      ...(detail.get(s.id as string) ?? {}),
      joined_at: day(s.joined_at),
      last_sign_in_at: day(s.last_sign_in_at),
      onboarding_submitted_at: day(s.onboarding_submitted_at),
    }));

  const csv = [
    COLUMNS.map(([, label]) => cell(label)).join(','),
    ...rows.map((r) => COLUMNS.map(([key]) => cell(r[key])).join(',')),
  ].join('\r\n');

  // BOM so Excel opens UTF-8 accents correctly.
  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gap-signups-${user.cohort?.slug ?? 'cohort'}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
};
