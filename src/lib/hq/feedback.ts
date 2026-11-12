/**
 * "Was this unclear?" notes on Peak HQ documents (migration 0014).
 *
 * Runs as the signed-in member through the anon key, so row-level security
 * scopes it: staff write and read their own notes, managers read all and mark
 * them dealt with.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PageFeedback {
  id: string;
  doc_slug: string;
  doc_title: string;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
  member?: { name: string } | null;
}

export async function leaveFeedback(
  supabase: SupabaseClient,
  memberId: string,
  doc: { slug: string; title: string },
  note: FormDataEntryValue | null,
): Promise<boolean> {
  const text = typeof note === 'string' ? note.trim().slice(0, 2000) : '';
  const { error } = await supabase.from('hq_page_feedback').insert({
    member_id: memberId,
    doc_slug: doc.slug,
    doc_title: doc.title.slice(0, 200),
    note: text === '' ? null : text,
  });
  if (error) console.error('[hq] feedback insert failed:', error.message);
  return !error;
}

/** Open notes, newest first. Managers see everyone's; RLS sees to that. */
export async function openFeedback(supabase: SupabaseClient): Promise<PageFeedback[]> {
  const { data, error } = await supabase
    .from('hq_page_feedback')
    .select('id, doc_slug, doc_title, note, created_at, resolved_at, member:staff_members ( name )')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('[hq] feedback read failed:', error.message);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    ...row,
    member: Array.isArray(row.member) ? row.member[0] : row.member,
  }));
}

export async function resolveFeedback(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('hq_page_feedback')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('[hq] feedback resolve failed:', error.message);
}
