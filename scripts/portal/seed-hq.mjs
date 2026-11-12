/**
 * Publish authored Peak HQ documents to the PRIVATE portal dataset.
 *
 *   node --env-file=.env scripts/portal/seed-hq.mjs [--dry-run] [--dump]
 *
 * Reads `portal-content/hq/<hqSection>/*.md`, which is gitignored: these pages
 * carry team phone numbers and prices, and this repo is public.
 *
 * Front matter: title, order, owner, last_reviewed, and optionally summary and
 * status. A file whose `status` starts with "outline" is NOT published, and
 * links to it from other pages become plain text, so nothing points at a page
 * that does not exist yet.
 *
 * The slug is the file name without its number prefix and `.md`
 * (`04-booking-lifecycle.md` → `booking-lifecycle`). Links between files are
 * rewritten to `/hq/<section>/<slug>`.
 *
 * Front matter `hero` is a site photo for the page header and card; `id`
 * keeps the Sanity id of a document first loaded by import-docs.mjs, so a
 * rewrite replaces it rather than adding a second copy.
 *
 * Richer blocks (callouts, email templates, pills, key figures, flows and
 * photos) use the directives documented above `directiveBlock`.
 *
 * Unlike seed-knowledge.mjs this handles markdown tables: each becomes a
 * `table` object (first row is the header), rendered by PtTable.astro. A table
 * column whose every cell is an empty checkbox is dropped, and `- [ ]` list
 * items become ordinary bullets: ticking lives in the /hq/start checklist.
 *
 * Documents are tier 3 (staff only) unless the front matter says `tier: 2`,
 * or `tier: 1` with a `version` (documents the instructor contract refers to).
 * `hubSection` also places a tier 2 document in the instructor hub.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import matter from 'gray-matter';
import { markdownToPortableText } from '@portabletext/markdown';
import { createClient } from '@sanity/client';

const DRY_RUN = process.argv.includes('--dry-run');
const DUMP = process.argv.includes('--dump');
// --draft writes Sanity drafts only: invisible to the live site, which reads
// published documents, so new block types can be previewed before the code
// that renders them is deployed. Publish later with a normal run.
const DRAFT = process.argv.includes('--draft');
// --only=slug,slug limits the run to those documents.
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const ROOT = process.env.HQ_CONTENT_DIR || 'portal-content/hq';
const SECTIONS = ['booking-team', 'what-we-do', 'how-we-work', 'playbook', 'policies', 'people'];

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'un1s8qq9';
const DATASET = process.env.SANITY_PORTAL_DATASET || 'portal';
const TOKEN = process.env.SANITY_PORTAL_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN;

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!existsSync(ROOT)) fail(`No such directory: ${ROOT}`);
if (!DRY_RUN && !TOKEN) fail('Set SANITY_PORTAL_WRITE_TOKEN (or SANITY_WRITE_TOKEN).');

let keySeed = 0;
const key = () => `k${(keySeed++).toString(36)}`;
const withKeys = (value) => {
  if (Array.isArray(value)) return value.map(withKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = withKeys(v);
    if (out._type && !out._key) out._key = key();
    return out;
  }
  return value;
};

// @portabletext/markdown leaks the mark of an auto-linked email address into
// the blocks after it, pointing at a link the later block does not define.
// Drop any mark that is neither a decorator nor defined on its own block.
const DECORATORS = new Set(['strong', 'em', 'code', 'underline', 'strike-through']);
function cleanMarks(blocks) {
  for (const b of blocks) {
    if (b._type !== 'block' || !Array.isArray(b.children)) continue;
    const defs = new Set((b.markDefs ?? []).map((d) => d._key));
    for (const c of b.children) {
      if (Array.isArray(c.marks)) c.marks = c.marks.filter((m) => DECORATORS.has(m) || defs.has(m));
    }
  }
  return blocks;
}

const slugOf = (file) => file.replace(/\.md$/, '').replace(/^\d+[-_]/, '');

// ---------------------------------------------------------------------------
// Load every file first, so links can be resolved against what is published.
// ---------------------------------------------------------------------------

const docs = [];
for (const section of SECTIONS) {
  const dir = path.join(ROOT, section);
  if (!existsSync(dir)) continue;
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.md')).sort()) {
    const { data, content } = matter(await readFile(path.join(dir, file), 'utf8'));
    docs.push({
      file,
      section,
      slug: slugOf(file),
      data,
      content,
      publish: !String(data.status ?? '').toLowerCase().startsWith('outline'),
    });
  }
}

const target = new Map(docs.map((d) => [d.file, d]));

const problems = [];

/** Rewrite `[text](04-foo.md)` to the HQ URL, or to plain text if held back. */
function rewriteLinks(md, from) {
  return md.replace(/\[([^\]]+)\]\(([^)\s]+\.md)(#[^)]*)?\)/g, (all, text, file, hash = '') => {
    const to = target.get(path.basename(file));
    if (!to) {
      problems.push(`${from.file}: link to unknown file ${file}`);
      return text;
    }
    if (!to.publish) return text;
    return `[${text}](/hq/${to.section}/${to.slug}${hash})`;
  });
}

const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

const isSeparator = (line) => /^\|?\s*:?-{3,}/.test(line.trim()) && /^[|\s:-]+$/.test(line.trim());

function tableBlock(lines) {
  let rows = lines.filter((l) => !isSeparator(l)).map(splitRow);
  const width = Math.max(...rows.map((r) => r.length));
  rows = rows.map((r) => [...r, ...Array(width - r.length).fill('')]);
  // Drop a column of empty checkboxes ("Done | [ ]"): ticking is done elsewhere.
  const keep = [...Array(width).keys()].filter(
    (i) => !rows.slice(1).every((r) => /^\[\s?\]$/.test(r[i])),
  );
  return {
    _type: 'table',
    rows: rows.map((r) => ({ _type: 'tableRow', cells: keep.map((i) => r[i]) })),
  };
}

// Directives: richer blocks written in plain markdown.
//
//   :::callout tip|rule|warning|note|action Title        ::: closes
//   :::template Title | when to use it                    body kept as written
//   :::script Title | when to use it                      the same, for words said aloud
//   :::pills                                               "- item" lines
//   :::facts                                               "- value | label" lines
//   :::flow                                                "- title | text" lines
//   ::image /images/path.jpg | alt text | caption         one line
//   ::signature                                            the Peak email signature
const TONES = ['note', 'tip', 'rule', 'warning', 'action'];
const listLines = (body) =>
  body.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim());
const pair = (l) => {
  const i = l.indexOf('|');
  return i < 0 ? [l.trim(), ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
};

function directiveBlock(name, args, body, file) {
  switch (name) {
    case 'callout': {
      const [first, ...rest] = args.split(/\s+/);
      const tone = TONES.includes(first) ? first : 'note';
      const title = (TONES.includes(first) ? rest.join(' ') : args).trim();
      return { _type: 'callout', tone, ...(title ? { title } : {}), text: body.trim() };
    }
    case 'template':
    case 'script': {
      const [title, when] = pair(args);
      return {
        _type: 'template',
        kind: name === 'script' ? 'script' : 'email',
        title,
        ...(when ? { when } : {}),
        text: body.replace(/^\n+|\s+$/g, ''),
      };
    }
    case 'pills':
      return { _type: 'pills', items: listLines(body) };
    case 'facts':
      return {
        _type: 'facts',
        items: listLines(body).map((l) => {
          const [value, label] = pair(l);
          return { _type: 'fact', value, label };
        }),
      };
    case 'flow':
      return {
        _type: 'flow',
        steps: listLines(body).map((l) => {
          const [title, text] = pair(l);
          return { _type: 'flowStep', title, ...(text ? { text } : {}) };
        }),
      };
    default:
      problems.push(`${file}: unknown block ":::${name}"`);
      return null;
  }
}

/** Markdown → Portable Text, with tables and directives lifted out as objects. */
function toBody(md, file = '') {
  const blocks = [];
  let prose = [];
  let table = [];
  let directive = null;
  const flushProse = () => {
    const text = prose.join('\n').trim();
    if (text) blocks.push(...cleanMarks(markdownToPortableText(text)));
    prose = [];
  };
  const flushTable = () => {
    if (table.length) blocks.push(tableBlock(table));
    table = [];
  };
  for (const line of md.split('\n')) {
    if (directive) {
      if (line.trim() === ':::') {
        const b = directiveBlock(directive.name, directive.args, directive.body.join('\n'), file);
        if (b) blocks.push(b);
        directive = null;
      } else {
        directive.body.push(line);
      }
      continue;
    }
    const open = line.match(/^:::(\w+)\s*(.*)$/);
    if (open) {
      flushTable();
      flushProse();
      directive = { name: open[1], args: open[2].trim(), body: [] };
      continue;
    }
    if (line.trim() === '::signature') {
      flushTable();
      flushProse();
      blocks.push({ _type: 'signature' });
      continue;
    }
    const image = line.match(/^::image\s+(.+)$/);
    if (image) {
      flushTable();
      flushProse();
      const [src, alt = '', caption = ''] = image[1].split('|').map((x) => x.trim());
      if (!/^\/images\/[\w./ -]+\.(jpe?g|png|webp)$/i.test(src)) problems.push(`${file}: image must be a site path: ${src}`);
      blocks.push({ _type: 'siteImage', src, alt, ...(caption ? { caption } : {}) });
      continue;
    }
    if (line.trim().startsWith('|')) {
      flushProse();
      table.push(line);
    } else {
      flushTable();
      prose.push(line);
    }
  }
  flushTable();
  flushProse();
  if (directive) problems.push(`${file}: ":::${directive.name}" is never closed`);
  return blocks;
}

function prepare(doc) {
  let md = doc.content;
  // The title is rendered by the page; drop the repeated H1.
  md = md.replace(/^\s*#\s+.+\n/, '');
  // Notes to whoever builds the page are not for readers.
  md = md.replace(/^>\s*Build note[^\n]*(\n>[^\n]*)*\n?/gim, '');
  // Checklist items read as bullets; the ticking lives in /hq/start.
  md = md.replace(/^(\s*)- \[[ xX]\] /gm, '$1- ');
  md = rewriteLinks(md, doc);

  const lead = md.match(/\*\*In 30 seconds:\*\*\s*([^\n]+)/);
  let summary =
    doc.data.summary ??
    (lead ? lead[1].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').match(/^.*?[.!?](?=\s|$)/)?.[0] : undefined);

  if (/—/.test(md) || /—/.test(doc.data.title)) {
    problems.push(`${doc.file}: contains an em dash, which portal copy avoids`);
  }
  if (summary) summary = summary[0].toUpperCase() + summary.slice(1);
  if (summary && summary.length > 200) problems.push(`${doc.file}: summary over 200 characters`);
  for (const f of ['title', 'owner', 'last_reviewed']) {
    if (!doc.data[f]) problems.push(`${doc.file}: missing "${f}"`);
  }

  const tier = [1, 2, 3].includes(Number(doc.data.tier)) ? Number(doc.data.tier) : 3;
  if (doc.data.hubSection && tier === 3) {
    problems.push(`${doc.file}: hubSection needs tier 1 or 2; tier 3 is staff only`);
  }
  if (tier === 1 && !doc.data.version) {
    problems.push(`${doc.file}: tier 1 documents carry a version`);
  }

  const hero = doc.data.hero;
  if (hero && !/^\/images\/[\w./ -]+\.(jpe?g|png|webp)$/i.test(hero)) {
    problems.push(`${doc.file}: hero must be a site path like /images/x.jpg`);
  }

  const reviewed = doc.data.last_reviewed;
  return {
    // `id` keeps the identity of a document first loaded by import-docs.mjs.
    _id: doc.data.id ?? `portalDoc-hq-${doc.slug}`,
    _type: 'portalDoc',
    title: doc.data.title,
    slug: { _type: 'slug', current: doc.slug },
    hqSection: doc.section,
    ...(doc.data.hubSection ? { section: doc.data.hubSection } : {}),
    tier,
    ...(doc.data.version ? { version: String(doc.data.version) } : {}),
    ...(summary ? { summary } : {}),
    ...(doc.data.order != null ? { order: Number(doc.data.order) } : {}),
    owner: doc.data.owner,
    reviewedAt:
      reviewed instanceof Date ? reviewed.toISOString().slice(0, 10) : String(reviewed),
    ...(hero ? { heroImage: hero } : {}),
    body: withKeys(toBody(md, doc.file)),
  };
}

// ---------------------------------------------------------------------------

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
  `\n  ${DRY_RUN ? 'Dry run' : `${DRAFT ? 'Writing drafts to' : 'Publishing to'} ${PROJECT_ID}/${DATASET}`}: ${docs.length} files\n`,
);

const prepared = docs.map((d) => ({ d, out: prepare(d) }));
if (problems.length) {
  console.log('  Problems, nothing published:');
  for (const p of problems) console.log(`    · ${p}`);
  process.exit(1);
}

// Slugs are unique across the whole dataset (the page looks a doc up by slug).
if (client) {
  const clash = await client.fetch(
    `*[_type == "portalDoc" && slug.current in $slugs && !(_id in $ids)]{ _id, "slug": slug.current }`,
    {
      slugs: prepared.map((p) => p.out.slug.current),
      ids: prepared.flatMap((p) => [p.out._id, `drafts.${p.out._id}`]),
    },
  );
  if (clash.length) fail(`Slug already used: ${clash.map((c) => `${c.slug} (${c._id})`).join(', ')}`);
}

let published = 0;
for (const { d, out } of prepared) {
  const tables = out.body.filter((b) => b._type === 'table').length;
  if (!d.publish) {
    console.log(`  · ${d.slug.padEnd(30)} held back (${d.data.status})`);
    if (client && !DRAFT) await client.delete(out._id).catch(() => {});
    continue;
  }
  if (ONLY.length && !ONLY.includes(d.slug)) continue;
  if (DUMP) console.log(JSON.stringify(out, null, 2));
  if (client) {
    if (DRAFT) {
      await client.createOrReplace({ ...out, _id: `drafts.${out._id}` });
    } else {
      await client.createOrReplace(out);
      // A normal run publishes: any draft left from a --draft run is retired.
      await client.delete(`drafts.${out._id}`).catch(() => {});
    }
  }
  published += 1;
  console.log(
    `  ✓ ${d.slug.padEnd(30)} ${d.section.padEnd(13)} ${String(out.body.length).padStart(3)} blocks, ${tables} tables`,
  );
}

console.log(`\n  ${published}/${docs.length} ${DRY_RUN ? 'converted' : DRAFT ? 'drafted' : 'published'}.\n`);
