/**
 * Experience log as a CSV, for external submission.
 *
 * Verified and pending rows both export, with the status column saying which
 * is which — a student sending this to a ski school or a course director needs
 * the whole record, not a filtered version of it.
 *
 * Staff can export another student's log by passing ?student=<id>; RLS refuses
 * anyone whose cohort doesn't match, so no check is needed here beyond what
 * the query itself enforces.
 */
import type { APIRoute } from 'astro';
import { createGapClient, type GapUser } from '../../lib/gap/supabase';
import { toHours } from '../../lib/gap/course';

export const prerender = false;

const COLUMNS = [
  ['happened_on', 'Date'],
  ['organisation', 'Ski school'],
  ['instructor_observed', 'Instructor observed'],
  ['location', 'Location'],
  ['group_level', 'Group level'],
  ['hours', 'Hours'],
  ['student_role', 'Role'],
  ['objective', 'Lesson objective'],
  ['observations', 'Key observations'],
  ['reflection', 'Reflection'],
  ['status', 'Verification'],
  ['verified_at', 'Verified on'],
] as const;

/**
 * RFC 4180 quoting. A leading =, +, - or @ is prefixed with a single quote so
 * a spreadsheet treats a reflection starting "=" as text rather than running
 * it as a formula.
 */
function cell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const GET: APIRoute = async ({ locals, cookies, request, url }) => {
  const user = locals.gapUser as GapUser | null;
  if (!user) return new Response('Not found', { status: 404 });

  const studentId = url.searchParams.get('student') || user.id;

  const db = createGapClient(cookies, request);
  const { data } = await db
    .from('gap_experience_log')
    .select('*')
    .eq('student_id', studentId)
    .order('happened_on');

  const rows = (data ?? []).map((e) => ({
    ...e,
    hours: toHours(e.duration_minutes),
    verified_at: e.verified_at ? String(e.verified_at).slice(0, 10) : '',
  }));

  const csv = [
    COLUMNS.map(([, label]) => cell(label)).join(','),
    ...rows.map((r) =>
      COLUMNS.map(([key]) => cell((r as Record<string, unknown>)[key])).join(','),
    ),
  ].join('\r\n');

  // BOM so Excel opens UTF-8 accents (Châtel, Avoriaz) correctly.
  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="experience-log.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
};
