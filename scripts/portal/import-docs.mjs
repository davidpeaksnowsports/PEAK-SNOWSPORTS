/**
 * Import approved documents into the PRIVATE portal dataset.
 *
 *   PORTAL_SOURCE_DIR="/path/to/Instructor portal" \
 *   node --env-file=.env scripts/portal/import-docs.mjs [--dry-run]
 *
 * The .docx sources are deliberately NOT in this repo — it is public. Point
 * PORTAL_SOURCE_DIR at a local folder (the handover zip, unzipped) and this
 * reads from there.
 *
 * Pipeline: .docx → HTML (mammoth) → Portable Text (@portabletext/block-tools).
 * Going through HTML rather than plain text is what preserves headings, lists
 * and bold — a policy flattened into paragraphs is much harder to follow on a
 * phone, which is where these get read.
 *
 * Documents are created with a deterministic _id (portalDoc-<slug>) and
 * createOrReplace, so re-running updates in place rather than duplicating.
 *
 * IMPORTANT: converted output needs a human read before anyone relies on it.
 * These are verbatim policy documents; automated conversion gets structure
 * right but can still mangle a table or drop a footnote. Check each one in the
 * studio at /admin/portal.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import mammoth from 'mammoth';
import { JSDOM } from 'jsdom';
import { htmlToBlocks } from '@portabletext/block-tools';
import { createClient } from '@sanity/client';
import { Schema } from '@sanity/schema';

const DRY_RUN = process.argv.includes('--dry-run');

const SOURCE_DIR = process.env.PORTAL_SOURCE_DIR;
const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.SANITY_PORTAL_DATASET || 'portal';
// A write token, not the read token the site uses.
const TOKEN = process.env.SANITY_PORTAL_WRITE_TOKEN;

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!SOURCE_DIR) {
  fail(
    'Set PORTAL_SOURCE_DIR to the unzipped "Instructor portal" folder.\n' +
      '  e.g. PORTAL_SOURCE_DIR="$HOME/Documents/Instructor portal"',
  );
}
if (!existsSync(SOURCE_DIR)) fail(`PORTAL_SOURCE_DIR does not exist: ${SOURCE_DIR}`);
if (!PROJECT_ID) fail('PUBLIC_SANITY_PROJECT_ID is not set.');
if (!DRY_RUN && !TOKEN) {
  fail(
    'SANITY_PORTAL_WRITE_TOKEN is not set. Create a write token scoped to the\n' +
      `  "${DATASET}" dataset, or re-run with --dry-run to convert without writing.`,
  );
}

// The block content schema the converter validates against.
//
// Blocks only, no image member: compiling `image` here pulls in Sanity's
// built-in sanity.imageHotspot type, which isn't registered in a bare
// Schema.compile. Nothing is lost — mammoth inlines any embedded pictures as
// data URIs and block-tools drops them either way, so images in a policy have
// to be re-added by hand in the studio.
const schema = Schema.compile({
  name: 'portal',
  types: [
    {
      name: 'portalDoc',
      type: 'document',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [{ type: 'block' }],
        },
      ],
    },
  ],
});
const blockContentType = schema
  .get('portalDoc')
  .fields.find((f) => f.name === 'body').type;

/** Sanity requires a _key on every array item; the converter does not add them. */
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

const textOf = (block) =>
  (block?.children ?? [])
    .map((c) => c.text ?? '')
    .join('')
    .trim();

/**
 * Most of these documents are Notion exports, so they open with the page title
 * followed by Notion's property table flattened into label/value pairs:
 *
 *   Code of conduct / Last edited time / @July 31, 2024 / Owner / David Walton
 *   / Tags / (empty) / Created time / @May 26, 2024 / 1. Purpose …
 *
 * None of that belongs in a published policy — the title is already in the
 * page header, and the rest is editing metadata. Strip it, but only from the
 * front of the document and only for exactly these labels, so nothing in the
 * body itself can be caught by accident.
 */
const NOTION_LABELS = new Set([
  'last edited time',
  'last edited by',
  'created time',
  'created by',
  'owner',
  'tags',
  'status',
  'category',
]);

function stripFrontMatter(blocks, title) {
  const wanted = title.trim().toLowerCase();
  let i = 0;
  let dropValueNext = false;

  while (i < blocks.length) {
    const block = blocks[i];
    const text = textOf(block);
    const lower = text.toLowerCase();

    if (text === '') {
      i += 1;
      continue;
    }
    if (dropValueNext) {
      dropValueNext = false;
      i += 1;
      continue;
    }
    // The document's own title, however the export styled it.
    if (lower === wanted || lower === `${wanted} policy` || `${lower} policy` === wanted) {
      i += 1;
      continue;
    }
    if (NOTION_LABELS.has(lower)) {
      dropValueNext = true;
      i += 1;
      continue;
    }
    // A stray "@July 31, 2024 8:48 AM" left over from a property row.
    if (/^@[A-Z][a-z]+ \d{1,2}, \d{4}/.test(text)) {
      i += 1;
      continue;
    }
    break;
  }

  return blocks.slice(i);
}

async function convert(absPath, title) {
  const { value: html, messages } = await mammoth.convertToHtml({ path: absPath });
  const raw = htmlToBlocks(html, blockContentType, {
    parseHtml: (h) => new JSDOM(h).window.document,
  });
  const blocks = stripFrontMatter(raw, title);
  return {
    blocks: withKeys(blocks),
    stripped: raw.length - blocks.length,
    warnings: messages.filter((m) => m.type === 'warning'),
  };
}

const manifest = JSON.parse(
  await readFile(new URL('./manifest.json', import.meta.url), 'utf8'),
);

const client = DRY_RUN
  ? null
  : createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      token: TOKEN,
      apiVersion: '2024-10-01',
      useCdn: false,
    });

console.log(
  `\n  ${DRY_RUN ? 'Dry run' : `Importing into ${PROJECT_ID}/${DATASET}`} — ` +
    `${manifest.documents.length} documents\n`,
);

let ok = 0;
const problems = [];

for (const doc of manifest.documents) {
  const abs = path.join(SOURCE_DIR, doc.file);

  if (!existsSync(abs)) {
    problems.push(`missing source: ${doc.file}`);
    console.log(`  ✗ ${doc.slug.padEnd(34)} source not found`);
    continue;
  }

  try {
    const { blocks, stripped, warnings } = await convert(abs, doc.title);

    if (!blocks.length) {
      problems.push(`${doc.slug}: converted to zero blocks`);
      console.log(`  ✗ ${doc.slug.padEnd(34)} empty after conversion`);
      continue;
    }

    if (!DRY_RUN) {
      await client.createOrReplace({
        _id: `portalDoc-${doc.slug}`,
        _type: 'portalDoc',
        title: doc.title,
        slug: { _type: 'slug', current: doc.slug },
        section: doc.section,
        tier: doc.tier,
        summary: doc.summary,
        ...(doc.version ? { version: doc.version } : {}),
        ...(doc.order != null ? { order: doc.order } : {}),
        body: blocks,
      });
    }

    ok += 1;
    const notes = [
      stripped ? `${stripped} front-matter blocks stripped` : null,
      warnings.length ? `${warnings.length} conversion warnings` : null,
    ].filter(Boolean);
    console.log(
      `  ✓ ${doc.slug.padEnd(34)} ${String(blocks.length).padStart(3)} blocks` +
        (notes.length ? `  (${notes.join(', ')})` : ''),
    );
  } catch (error) {
    problems.push(`${doc.slug}: ${error.message}`);
    console.log(`  ✗ ${doc.slug.padEnd(34)} ${error.message}`);
  }
}

console.log(`\n  ${ok}/${manifest.documents.length} converted${DRY_RUN ? '' : ' and written'}.`);

if (problems.length) {
  console.log('\n  Problems:');
  for (const p of problems) console.log(`    · ${p}`);
}

console.log(
  '\n  These are verbatim policy documents. Read each one at /admin/portal\n' +
    '  before telling anyone the portal is live — automated conversion handles\n' +
    '  structure well but can still mangle a table.\n',
);

if (problems.length) process.exit(1);
