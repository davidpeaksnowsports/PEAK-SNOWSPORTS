/**
 * Publish authored knowledge hub documents to the PRIVATE portal dataset.
 *
 *   node --env-file=.env scripts/portal/seed-knowledge.mjs [--dry-run]
 *
 * Unlike import-docs.mjs, which converts David's .docx sources, these are
 * written by hand as markdown with frontmatter. They still do not live in this
 * repo, which is public: they sit in `portal-content/knowledge/`, which is
 * gitignored, and are seeded from there.
 *
 * Markdown, not Portable Text by hand, because the former is editable by a
 * person. The conversion adds the `_key` that Sanity requires on every array
 * item, which the converter omits.
 *
 * NOTE: portalDoc.body supports blocks and images only. No tables. Write lists.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import matter from 'gray-matter';
import { markdownToPortableText } from '@portabletext/markdown';
import { createClient } from '@sanity/client';

const DRY_RUN = process.argv.includes('--dry-run');
const DIR = process.env.PORTAL_CONTENT_DIR || 'portal-content/knowledge';

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'un1s8qq9';
const DATASET = process.env.SANITY_PORTAL_DATASET || 'portal';
const TOKEN =
  process.env.SANITY_PORTAL_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN;

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!existsSync(DIR)) fail(`No such directory: ${DIR}`);
if (!DRY_RUN && !TOKEN) fail('Set SANITY_PORTAL_WRITE_TOKEN (or SANITY_WRITE_TOKEN).');

let keySeed = 0;
const withKeys = (value) => {
  if (Array.isArray(value)) return value.map(withKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = withKeys(v);
    if (out._type && !out._key) out._key = `k${(keySeed++).toString(36)}`;
    return out;
  }
  return value;
};

const client = DRY_RUN
  ? null
  : createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      token: TOKEN,
      apiVersion: '2024-10-01',
      useCdn: false,
    });

const files = (await readdir(DIR)).filter((f) => f.endsWith('.md')).sort();

console.log(
  `\n  ${DRY_RUN ? 'Dry run' : `Publishing to ${PROJECT_ID}/${DATASET}`} — ` +
    `${files.length} documents\n`,
);

let ok = 0;
const problems = [];

for (const file of files) {
  const raw = await readFile(path.join(DIR, file), 'utf8');
  const { data, content } = matter(raw);

  for (const required of ['title', 'slug', 'category']) {
    if (!data[required]) problems.push(`${file}: missing "${required}"`);
  }
  if (problems.length) continue;

  if (content.includes('|---')) {
    problems.push(`${file}: contains a markdown table, which Portable Text drops. Use a list.`);
    continue;
  }

  const body = withKeys(markdownToPortableText(content.trim()));

  if (!DRY_RUN) {
    await client.createOrReplace({
      _id: `portalDoc-${data.slug}`,
      _type: 'portalDoc',
      title: data.title,
      slug: { _type: 'slug', current: data.slug },
      section: 'knowledge',
      knowledgeCategory: data.category,
      tier: 2,
      summary: data.summary,
      ...(data.order != null ? { order: data.order } : {}),
      body,
    });
  }

  ok += 1;
  console.log(`  ✓ ${data.slug.padEnd(28)} ${data.category.padEnd(10)} ${String(body.length).padStart(3)} blocks`);
}

console.log(`\n  ${ok}/${files.length} ${DRY_RUN ? 'converted' : 'published'}.`);
if (problems.length) {
  console.log('\n  Problems:');
  for (const p of problems) console.log(`    · ${p}`);
  process.exit(1);
}
console.log('');
