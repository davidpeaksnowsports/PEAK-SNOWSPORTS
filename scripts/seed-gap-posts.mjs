/**
 * Publishes the three top-of-funnel GAP / ski-instructor journal posts into
 * Sanity. The live journal renders from Sanity (_type == "post"), so the
 * markdown files in src/content/journal are the editable source and this script
 * is how they go live.
 *
 * Idempotent: uses deterministic _id (post-<slug>) + createOrReplace, so
 * re-running updates in place rather than duplicating. Run:
 *   node --env-file=.env scripts/seed-gap-posts.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';
import { createClient } from '@sanity/client';
import { markdownToPortableText } from '@portabletext/markdown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const journalDir = join(__dirname, '..', 'src', 'content', 'journal');

const AUTHOR_REF = 'instructor-george-walton';
const FILES = [
  'how-to-become-a-ski-instructor.md',
  'how-much-does-a-ski-instructor-course-cost.md',
  'basi-level-1-vs-level-2.md',
];

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.PUBLIC_SANITY_DATASET,
  apiVersion: '2024-10-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

// Sanity requires a stable _key on every item in an array (blocks, children,
// markDefs). markdownToPortableText doesn't emit them, so add them.
let keyCounter = 0;
const nextKey = () => `k${(keyCounter++).toString(36)}`;
function addKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object') {
        const withKeys = addKeys(item);
        if (withKeys._key == null) withKeys._key = nextKey();
        return withKeys;
      }
      return item;
    });
  }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = addKeys(value[k]);
  }
  return value;
}

async function run() {
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error('SANITY_WRITE_TOKEN not set — run with `node --env-file=.env`.');
  }

  for (const file of FILES) {
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(journalDir, file), 'utf8');
    const { data: fm, content } = matter(raw);

    const body = addKeys(markdownToPortableText(content));

    // YAML may parse an unquoted `publishedAt: 2026-06-27` as a Date already.
    const publishedAt = (
      fm.publishedAt instanceof Date
        ? fm.publishedAt
        : new Date(`${fm.publishedAt}T09:00:00.000Z`)
    ).toISOString();

    const doc = {
      _id: `post-${slug}`,
      _type: 'post',
      title: fm.title,
      slug: { _type: 'slug', current: slug },
      author: { _type: 'reference', _ref: AUTHOR_REF },
      category: fm.category,
      excerpt: fm.excerpt,
      body,
      publishedAt,
      seoTitle: fm.seoTitle,
      seoDescription: fm.seoDescription,
    };

    const res = await client.createOrReplace(doc);
    console.log(`✓ ${res._id}  (${body.length} blocks)  ${fm.title}`);
  }
  console.log('\nDone. Posts live at /journal/<slug> once Vercel rebuilds (or immediately on next build).');
}

run().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
