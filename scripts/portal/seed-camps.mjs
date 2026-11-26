/**
 * Publish the ski camp portal's pages and videos to the PRIVATE portal dataset.
 *
 *   node --env-file=.env scripts/portal/seed-camps.mjs --dry-run
 *   node --env-file=.env scripts/portal/seed-camps.mjs --draft
 *   node --env-file=.env scripts/portal/seed-camps.mjs
 *
 * Reads `portal-content/camps/`, which is gitignored: these pages are for
 * booked skiers, and this repo is public.
 *
 *   portal-content/camps/knowledge/*.md     knowledge hub
 *   portal-content/camps/ski-system/*.md    the building blocks, in file order
 *   portal-content/camps/fitness/*.md       the ski fit plan and fitness reading
 *   portal-content/camps/venues/*.md        meeting points and first mornings
 *   portal-content/camps/videos.json        the video library
 *
 * Front matter for every page: title, owner, last_reviewed, and optionally
 * order, summary, level (all | intermediate | advanced), hero (a site photo
 * path), id (keeps an existing Sanity id) and status. A `status` starting with
 * "outline" is not published.
 *
 *   knowledge   category: before | on-camp | kit | mountain
 *   venues      location: morzine-avoriaz | val-disere | verbier   (required)
 *   fitness     weeks_out: 8, and sessions: [{ key, title, focus, duration, detail }]
 *
 * A session's `key` is what campers' ticks are stored against, so keep it
 * once a session is live. Without one it is made from the title, which means
 * renaming the session in the file resets its ticks. (Renaming it in the
 * Studio does not.)
 *
 * The slug is the file name without its number prefix and `.md`. Slugs are
 * unique across the whole portal, because a page is looked up by slug. Links
 * between files are rewritten to `/camps/<section>/<slug>`.
 *
 * --draft writes Sanity drafts only, invisible to campers. Review them in the
 * Studio at /admin/portal and publish there, or re-run without --draft.
 * --out=file.json writes what would be published, for a local preview.
 *
 * Bodies use the same markdown and directives as Peak HQ (see markdown.mjs).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import matter from 'gray-matter';
import { createClient } from '@sanity/client';

import { toBody, withKeys } from './markdown.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DUMP = args.includes('--dump');
const DRAFT = args.includes('--draft');
const OUT = (args.find((a) => a.startsWith('--out=')) ?? '').slice(6);
const ROOT = process.env.CAMPS_CONTENT_DIR || 'portal-content/camps';

const SECTIONS = ['knowledge', 'ski-system', 'fitness', 'venues'];
const LEVELS = ['all', 'intermediate', 'advanced'];
const CATEGORIES = ['before', 'on-camp', 'kit', 'mountain'];
const LOCATIONS = ['morzine-avoriaz', 'val-disere', 'verbier'];
const VIDEO_CATEGORIES = ['ski-system', 'drills', 'terrain', 'analysis', 'fitness', 'kit'];

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'un1s8qq9';
const DATASET = process.env.SANITY_PORTAL_DATASET || 'portal';
const TOKEN = process.env.SANITY_PORTAL_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN;

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!existsSync(ROOT)) fail(`No such directory: ${ROOT}`);
if (!DRY_RUN && !TOKEN) fail('Set SANITY_PORTAL_WRITE_TOKEN (or SANITY_WRITE_TOKEN).');

const slugOf = (file) => file.replace(/\.md$/, '').replace(/^\d+[-_]/, '');
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
const isSitePhoto = (p) => /^\/images\/[\w./ -]+\.(jpe?g|png|webp)$/i.test(p);
const dateOnly = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

const problems = [];

// ---------------------------------------------------------------------------
// Load every page first, so links can be resolved against what is published.
// ---------------------------------------------------------------------------

const pages = [];
for (const section of SECTIONS) {
  const dir = path.join(ROOT, section);
  if (!existsSync(dir)) continue;
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.md')).sort()) {
    const { data, content } = matter(await readFile(path.join(dir, file), 'utf8'));
    pages.push({
      file: `${section}/${file}`,
      base: file,
      section,
      slug: slugOf(file),
      data,
      content,
      publish: !String(data.status ?? '').toLowerCase().startsWith('outline'),
    });
  }
}

const bySlug = new Map();
for (const p of pages) {
  if (bySlug.has(p.slug)) problems.push(`${p.file}: slug "${p.slug}" is also used by ${bySlug.get(p.slug).file}`);
  bySlug.set(p.slug, p);
}
const byFile = new Map(pages.map((p) => [p.base, p]));

/** Rewrite `[text](03-foo.md)` to the portal URL, or plain text if held back. */
function rewriteLinks(md, from) {
  return md.replace(/\[([^\]]+)\]\(([^)\s]+\.md)(#[^)]*)?\)/g, (all, text, file, hash = '') => {
    const to = byFile.get(path.basename(file));
    if (!to) {
      problems.push(`${from.file}: link to unknown file ${file}`);
      return text;
    }
    if (!to.publish) return text;
    return `[${text}](/camps/${to.section}/${to.slug}${hash})`;
  });
}

function sessions(page) {
  const raw = page.data.sessions;
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) {
    problems.push(`${page.file}: sessions must be a list`);
    return undefined;
  }
  const seen = new Set();
  return raw.map((s, i) => {
    if (!s?.title) problems.push(`${page.file}: session ${i + 1} has no title`);
    const k = slugify(s?.key ?? s?.title ?? `session-${i + 1}`);
    if (seen.has(k)) problems.push(`${page.file}: two sessions share the key "${k}"`);
    seen.add(k);
    return {
      _type: 'fitSession',
      _key: k,
      title: String(s?.title ?? ''),
      ...(s?.focus ? { focus: String(s.focus) } : {}),
      ...(s?.duration ? { duration: String(s.duration) } : {}),
      ...(s?.detail ? { detail: String(s.detail).trim() } : {}),
    };
  });
}

function preparePage(page) {
  const d = page.data;
  let md = page.content;
  // The title is rendered by the page; drop a repeated H1.
  md = md.replace(/^\s*#\s+.+\n/, '');
  md = rewriteLinks(md, page);

  const text = [md, d.title, d.summary, JSON.stringify(d.sessions ?? '')].join('\n');
  if (/—/.test(text)) problems.push(`${page.file}: contains an em dash, which portal copy avoids`);
  for (const f of ['title', 'owner', 'last_reviewed']) {
    if (!d[f]) problems.push(`${page.file}: missing "${f}"`);
  }
  if (d.summary && String(d.summary).length > 200) problems.push(`${page.file}: summary over 200 characters`);

  const level = d.level ?? 'all';
  if (!LEVELS.includes(level)) problems.push(`${page.file}: level must be one of ${LEVELS.join(', ')}`);
  if (page.section === 'knowledge' && d.category && !CATEGORIES.includes(d.category)) {
    problems.push(`${page.file}: category must be one of ${CATEGORIES.join(', ')}`);
  }
  if (page.section === 'venues' && !LOCATIONS.includes(d.location)) {
    problems.push(`${page.file}: venues need a location, one of ${LOCATIONS.join(', ')}`);
  }
  if (page.section !== 'fitness' && (d.sessions || d.weeks_out)) {
    problems.push(`${page.file}: sessions and weeks_out belong in fitness/`);
  }
  if (d.weeks_out != null && !(Number.isInteger(d.weeks_out) && d.weeks_out >= 1 && d.weeks_out <= 16)) {
    problems.push(`${page.file}: weeks_out must be a whole number from 1 to 16`);
  }
  if (d.weeks_out != null && !Array.isArray(d.sessions)) {
    problems.push(`${page.file}: a plan block (weeks_out) needs sessions`);
  }
  if (d.hero && !isSitePhoto(d.hero)) problems.push(`${page.file}: hero must be a site path like /images/x.jpg`);

  const fit = page.section === 'fitness' ? sessions(page) : undefined;

  return {
    _id: d.id ?? `campDoc-${page.slug}`,
    _type: 'campDoc',
    title: d.title,
    slug: { _type: 'slug', current: page.slug },
    section: page.section,
    level,
    ...(page.section === 'knowledge' && d.category ? { category: d.category } : {}),
    ...(page.section === 'venues' ? { location: d.location } : {}),
    ...(d.weeks_out != null ? { weeksOut: Number(d.weeks_out) } : {}),
    ...(fit ? { sessions: fit } : {}),
    ...(d.summary ? { summary: String(d.summary) } : {}),
    ...(d.order != null ? { order: Number(d.order) } : {}),
    ...(d.hero ? { heroImage: d.hero } : {}),
    owner: d.owner,
    reviewedAt: dateOnly(d.last_reviewed),
    body: withKeys(toBody(md, page.file, problems)),
  };
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

const VIDEO_FILE = path.join(ROOT, 'videos.json');
const rawVideos = existsSync(VIDEO_FILE) ? JSON.parse(await readFile(VIDEO_FILE, 'utf8')) : [];
if (!Array.isArray(rawVideos)) fail('videos.json must be a list');

function prepareVideo(v, i) {
  const where = `videos.json #${i + 1}`;
  if (!v.title) problems.push(`${where}: no title`);
  if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\//.test(v.url ?? '')) {
    problems.push(`${where}: url must be an https YouTube or Vimeo link`);
  }
  if (!VIDEO_CATEGORIES.includes(v.category)) {
    problems.push(`${where}: category must be one of ${VIDEO_CATEGORIES.join(', ')}`);
  }
  const level = v.level ?? 'all';
  if (!LEVELS.includes(level)) problems.push(`${where}: level must be one of ${LEVELS.join(', ')}`);
  if (/—/.test(`${v.title} ${v.description ?? ''}`)) problems.push(`${where}: contains an em dash`);

  let skiSystem;
  if (v.ski_system) {
    const target = bySlug.get(v.ski_system);
    if (!target || target.section !== 'ski-system') {
      problems.push(`${where}: ski_system "${v.ski_system}" is not a ski system page`);
    } else {
      // Weak, so the video can be loaded before its page is published and a
      // page can be deleted without first unlinking every video.
      skiSystem = { _type: 'reference', _ref: target.data.id ?? `campDoc-${target.slug}`, _weak: true };
    }
  }

  return {
    _id: v.id ?? `campVideo-${slugify(v.title)}`,
    _type: 'campVideo',
    title: v.title,
    url: v.url,
    category: v.category,
    level,
    ...(skiSystem ? { skiSystem } : {}),
    ...(v.duration ? { duration: String(v.duration) } : {}),
    ...(v.description ? { description: String(v.description) } : {}),
    ...(v.order != null ? { order: Number(v.order) } : {}),
  };
}

// ---------------------------------------------------------------------------

const preparedPages = pages.map((p) => ({ p, out: preparePage(p) }));
const preparedVideos = rawVideos.map(prepareVideo);

const videoIds = new Set();
for (const v of preparedVideos) {
  if (videoIds.has(v._id)) problems.push(`videos.json: two videos share the id ${v._id}; give one an "id"`);
  videoIds.add(v._id);
}

console.log(
  `\n  ${DRY_RUN ? 'Dry run' : `${DRAFT ? 'Writing drafts to' : 'Publishing to'} ${PROJECT_ID}/${DATASET}`}: ${pages.length} pages, ${preparedVideos.length} videos\n`,
);

if (problems.length) {
  console.log('  Problems, nothing published:');
  for (const p of problems) console.log(`    · ${p}`);
  process.exit(1);
}

const live = preparedPages.filter(({ p }) => p.publish).map(({ out }) => out);
if (OUT) {
  await writeFile(OUT, JSON.stringify({ docs: live, videos: preparedVideos }, null, 2));
  console.log(`  Wrote ${OUT}\n`);
}

const client = DRY_RUN
  ? null
  : createClient({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN, apiVersion: '2024-10-01', useCdn: false });

// Slugs are unique across camp pages (the page looks a doc up by slug).
if (client) {
  const clash = await client.fetch(
    `*[_type == "campDoc" && slug.current in $slugs && !(_id in $ids)]{ _id, "slug": slug.current }`,
    {
      slugs: live.map((d) => d.slug.current),
      ids: live.flatMap((d) => [d._id, `drafts.${d._id}`]),
    },
  );
  if (clash.length) fail(`Slug already used: ${clash.map((c) => `${c.slug} (${c._id})`).join(', ')}`);
}

async function write(doc) {
  if (!client) return;
  if (DRAFT) {
    await client.createOrReplace({ ...doc, _id: `drafts.${doc._id}` });
  } else {
    await client.createOrReplace(doc);
    // A normal run publishes: any draft left from a --draft run is retired.
    await client.delete(`drafts.${doc._id}`).catch(() => {});
  }
}

let count = 0;
for (const { p, out } of preparedPages) {
  if (!p.publish) {
    console.log(`  · ${p.slug.padEnd(32)} held back (${p.data.status})`);
    if (client && !DRAFT) await client.delete(out._id).catch(() => {});
    continue;
  }
  if (DUMP) console.log(JSON.stringify(out, null, 2));
  await write(out);
  count += 1;
  const extra = out.sessions ? `, ${out.sessions.length} sessions` : '';
  console.log(`  ✓ ${p.slug.padEnd(32)} ${p.section.padEnd(11)} ${String(out.body.length).padStart(3)} blocks${extra}`);
}
for (const v of preparedVideos) {
  if (DUMP) console.log(JSON.stringify(v, null, 2));
  await write(v);
  count += 1;
  console.log(`  ✓ ${v._id.padEnd(32)} video`);
}

console.log(`\n  ${count} ${DRY_RUN ? 'converted' : DRAFT ? 'drafted' : 'published'}.\n`);
