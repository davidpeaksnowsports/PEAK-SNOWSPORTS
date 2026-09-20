import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'node:fs';
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const DIR = '/private/tmp/claude-501/-Users-davidwalton/5ee8e3a6-9c36-454d-8501-69a175d93caa/scratchpad/ws';
const BUCKET = 'gap-resources';

// Private bucket: nothing here is reachable without a signed URL, which the
// portal mints only for a signed-in member.
const { data: buckets } = await db.storage.listBuckets();
if (!buckets.find(b => b.name === BUCKET)) {
  const { error } = await db.storage.createBucket(BUCKET, { public: false, fileSizeLimit: '50MB', allowedMimeTypes: ['application/pdf'] });
  if (error) throw error;
  console.log('created private bucket', BUCKET);
} else {
  console.log('bucket exists:', BUCKET, '| public:', buckets.find(b=>b.name===BUCKET).public);
}

for (const f of readdirSync(DIR).filter(f => f.endsWith('.pdf')).sort()) {
  const path = `morzine-2027/workshops/${f}`;
  const { error } = await db.storage.from(BUCKET).upload(path, readFileSync(`${DIR}/${f}`), { contentType: 'application/pdf', upsert: true });
  console.log(error ? `FAILED ${f}: ${error.message}` : `uploaded ${path}`);
}

const { data: listed } = await db.storage.from(BUCKET).list('morzine-2027/workshops');
console.log('\nin bucket:', listed.map(o => `${o.name} (${Math.round(o.metadata.size/1024)}KB)`).join(', '));
