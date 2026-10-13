/**
 * Put a file in the private portal-files bucket.
 *
 *   node --env-file=.env scripts/portal/upload-file.mjs <local file> <path in bucket>
 *
 * e.g. … upload-file.mjs ~/Downloads/template.docx templates/template.docx
 *
 * Uses the service role key, which is why this runs from a terminal and never
 * from the site. Add the file to src/lib/portal/files.ts to surface it.
 */
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const [local, remote] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!local || !remote) {
  console.error('\n  usage: upload-file.mjs <local file> <path in bucket>\n');
  process.exit(1);
}
if (!url || !key) {
  console.error('\n  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n');
  process.exit(1);
}

const TYPES = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pdf': 'application/pdf',
};

const body = await readFile(local);
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { error } = await supabase.storage.from('portal-files').upload(remote, body, {
  contentType: TYPES[extname(local).toLowerCase()] ?? 'application/octet-stream',
  upsert: true,
});

if (error) {
  console.error(`\n  upload failed: ${error.message}\n`);
  process.exit(1);
}
console.log(`\n  uploaded ${basename(local)} → portal-files/${remote}\n`);
