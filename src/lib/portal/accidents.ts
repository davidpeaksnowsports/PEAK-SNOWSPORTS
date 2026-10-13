/**
 * Accident reports.
 *
 * Fields follow the BASI Instructor Accident Recording Form, which exists to
 * capture what happened while it is fresh in case the accident later leads to
 * a claim. Written on a phone, outside, probably cold, so the form asks for
 * the few things that matter first and lets the rest wait.
 *
 * Every read and write runs as the signed-in instructor through the anon key,
 * so row-level security (migration 0010) is what scopes it, not this file.
 *
 * These records hold health data about named people, often children. Retention
 * is ten years from the incident; see the migration.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const RESORTS = ['Morzine', 'Avoriaz', 'Les Gets', 'Chatel', 'Other'] as const;

export const WEATHER = [
  'Sunny',
  'Cloudy or overcast',
  'Snowing',
  'Raining',
  'Fog or flat light',
] as const;

export const SNOW = [
  'Fresh snow',
  'Icy',
  'Hard packed',
  'Spring or slushy',
  'Pisted',
  'Other',
] as const;

export const TERRAIN = [
  'Piste',
  'Off-piste',
  'Bumps',
  'Park or freestyle',
  'Race course',
] as const;

export const STANDARD = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

export interface AccidentReport {
  id: string;
  filed_by: string | null;
  filed_by_name: string;
  occurred_at: string;
  resort: string;
  resort_other: string | null;
  location: string | null;
  weather: string | null;
  snow: string | null;
  terrain: string | null;
  activity: string | null;
  description: string;
  group_standard: string | null;
  group_detail: string | null;
  casualty_name: string | null;
  casualty_contact: string | null;
  casualty_age: string | null;
  casualty_injury: string | null;
  prior_conditions: string | null;
  witness_name: string | null;
  witness_contact: string | null;
  first_aid: string | null;
  patrol_involved: boolean;
  police_involved: boolean;
  actions_taken: string | null;
  who_helped: string | null;
  equipment: string | null;
  binding_settings: string | null;
  gradient: string | null;
  evidence_notes: string | null;
  lessons: string | null;
  created_at: string;
  updated_at: string;
}

const LIST_FIELDS =
  'id, filed_by, filed_by_name, occurred_at, resort, resort_other, terrain, casualty_name, casualty_injury, created_at';

const text = (v: FormDataEntryValue | null, max: number) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return s === '' ? null : s;
};

const oneOf = <T extends readonly string[]>(
  v: FormDataEntryValue | null,
  allowed: T,
): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return (allowed as readonly string[]).includes(s) ? s : null;
};

export async function listReports(
  supabase: SupabaseClient,
): Promise<Pick<AccidentReport,
  'id' | 'filed_by' | 'filed_by_name' | 'occurred_at' | 'resort' | 'resort_other' | 'terrain' | 'casualty_name' | 'casualty_injury' | 'created_at'>[]> {
  const { data } = await supabase
    .from('accident_reports')
    .select(LIST_FIELDS)
    .order('occurred_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function getReport(
  supabase: SupabaseClient,
  id: string,
): Promise<AccidentReport | null> {
  const { data } = await supabase
    .from('accident_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as AccidentReport) ?? null;
}

/**
 * Validate and file. Only four things are required: when, where, what happened
 * and who was hurt. Everything else can be filled in later from the report
 * page, because standing on a piste is a bad place to be hunting for a binding
 * setting.
 */
export async function fileReport(
  supabase: SupabaseClient,
  user: { id: string; name: string },
  form: FormData,
): Promise<{ ok: true; id: string } | { ok: false; errors: string[]; values: Record<string, string> }> {
  const occurredDate = text(form.get('occurred_date'), 10);
  const occurredTime = text(form.get('occurred_time'), 5);
  const resort = oneOf(form.get('resort'), RESORTS);
  const description = text(form.get('description'), 8000);
  const casualtyName = text(form.get('casualty_name'), 200);

  const errors: string[] = [];
  if (!occurredDate) errors.push('Add the date of the incident.');
  if (!resort) errors.push('Choose the resort.');
  if (!casualtyName) errors.push('Add the name of the person who was hurt.');
  if (!description) errors.push('Describe what happened.');

  // Keep what they typed so a failed submission never loses the account of an
  // incident someone has just written out.
  const values: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === 'string' && k !== 'intent') values[k] = v;
  }
  if (errors.length) return { ok: false, errors, values };

  const occurredAt = new Date(`${occurredDate}T${occurredTime ?? '12:00'}`);
  if (Number.isNaN(occurredAt.getTime())) {
    return { ok: false, errors: ['That date and time did not make sense.'], values };
  }

  const row = {
    filed_by: user.id,
    filed_by_name: user.name,
    occurred_at: occurredAt.toISOString(),
    resort,
    resort_other: resort === 'Other' ? text(form.get('resort_other'), 120) : null,
    location: text(form.get('location'), 500),
    weather: oneOf(form.get('weather'), WEATHER),
    snow: oneOf(form.get('snow'), SNOW),
    terrain: oneOf(form.get('terrain'), TERRAIN),
    activity: text(form.get('activity'), 300),
    description,
    group_standard: oneOf(form.get('group_standard'), STANDARD),
    group_detail: text(form.get('group_detail'), 500),
    casualty_name: casualtyName,
    casualty_contact: text(form.get('casualty_contact'), 300),
    casualty_age: text(form.get('casualty_age'), 60),
    casualty_injury: text(form.get('casualty_injury'), 2000),
    prior_conditions: text(form.get('prior_conditions'), 1000),
    witness_name: text(form.get('witness_name'), 200),
    witness_contact: text(form.get('witness_contact'), 300),
    first_aid: text(form.get('first_aid'), 2000),
    patrol_involved: form.get('patrol_involved') === 'on',
    police_involved: form.get('police_involved') === 'on',
    actions_taken: text(form.get('actions_taken'), 2000),
    who_helped: text(form.get('who_helped'), 500),
    equipment: text(form.get('equipment'), 500),
    binding_settings: text(form.get('binding_settings'), 200),
    gradient: text(form.get('gradient'), 200),
    evidence_notes: text(form.get('evidence_notes'), 2000),
    lessons: text(form.get('lessons'), 2000),
  };

  const { data, error } = await supabase
    .from('accident_reports')
    .insert(row)
    .select('id')
    .single();

  if (error || !data) {
    console.error('[accident] file failed:', error?.message);
    return {
      ok: false,
      errors: ['That did not save. Try again, and call the office if it will not go through.'],
      values,
    };
  }
  return { ok: true, id: data.id };
}

/**
 * Tell the office a report has been filed.
 *
 * The email carries who, where and when, and nothing about the injury or the
 * casualty. Reading the report means signing in, which keeps health data about
 * a named client out of inboxes and whatever they sync to.
 *
 * Never throws: an email that fails must not lose a filed report.
 */
export async function notifyOffice(
  report: { id: string; filed_by_name: string; occurred_at: string; resort: string; resort_other: string | null },
  origin: string,
): Promise<void> {
  const key = import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!key) return;

  const to = (import.meta.env.ACCIDENT_NOTIFY_TO ?? process.env.ACCIDENT_NOTIFY_TO ??
    'hello@peaksnowsports.com') as string;
  const from = (import.meta.env.ACCIDENT_NOTIFY_FROM ?? process.env.ACCIDENT_NOTIFY_FROM ??
    'Peak Portal <hello@peaksnowsports.com>') as string;

  const where = report.resort === 'Other' ? report.resort_other || 'Other' : report.resort;
  const when = new Date(report.occurred_at).toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  });

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: to.split(',').map((t) => t.trim()),
        subject: `Accident report filed: ${where}, ${when}`,
        text: [
          `${report.filed_by_name} has filed an accident report.`,
          '',
          `Resort: ${where}`,
          `When:   ${when}`,
          '',
          'Details of the casualty and the injury are deliberately not in this',
          'email. Read the report in the portal:',
          `${origin}/portal/ops/reports/${report.id}`,
        ].join('\n'),
      }),
    });
  } catch (error) {
    console.error('[accident] notify failed:', error);
  }
}
