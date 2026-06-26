#!/usr/bin/env node
// Phase 2: migrate instructors + journal posts from src/content/{instructors,journal}
// markdown files into Sanity.
//
// Idempotent: re-running upserts (`createOrReplace`) the same documents matched
// by stable `_id`s derived from the markdown filename slug.
//
// Asset uploads are deduplicated via Sanity's content hashing — uploading the
// same file twice returns the same `_ref`, so the script is safe to rerun.
//
// Usage:
//   SANITY_WRITE_TOKEN=sk... node sanity/seed/migrate-journal.mjs
//   SANITY_WRITE_TOKEN=sk... node sanity/seed/migrate-journal.mjs --dry-run

import { createClient } from '@sanity/client';
import { markdownToPortableText } from '@portabletext/markdown';
import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'un1s8qq9';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';
const token = process.env.SANITY_WRITE_TOKEN;
const dryRun = process.argv.includes('--dry-run');

if (!token && !dryRun) {
  console.error('✗ SANITY_WRITE_TOKEN not set. Pass --dry-run to skip writes.');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-10-01',
  useCdn: false,
});

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const slugFromFile = (file) => path.basename(file, path.extname(file));

// Deduplicate identical files within a single run so we only hit the upload
// endpoint once per source path. Sanity itself dedupes by content hash too,
// but skipping the network round-trip is much faster on rerun.
const assetCache = new Map();
async function uploadAsset(publicPath, filename) {
  if (assetCache.has(publicPath)) return assetCache.get(publicPath);
  if (dryRun) {
    const ref = { _type: 'image', asset: { _type: 'reference', _ref: `image-DRY-${filename}` } };
    assetCache.set(publicPath, ref);
    return ref;
  }
  const abs = path.join(repoRoot, 'public', publicPath.replace(/^\//, ''));
  if (!fs.existsSync(abs)) {
    console.warn(`    ⚠ asset missing on disk: ${publicPath}`);
    return undefined;
  }
  console.log(`    uploading ${path.basename(abs)} …`);
  const asset = await client.assets.upload('image', fs.createReadStream(abs), { filename });
  const ref = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
  assetCache.set(publicPath, ref);
  return ref;
}

async function upsert(doc) {
  if (dryRun) {
    console.log(`  (dry-run) upsert ${doc._type} ${doc._id}`);
    return doc;
  }
  return client.createOrReplace(doc);
}

// --- Instructors ------------------------------------------------------------

async function migrateInstructors() {
  console.log('Migrating instructors…');
  const dir = path.join(repoRoot, 'src/content/instructors');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const byName = new Map();

  for (const file of files) {
    const slug = slugFromFile(file);
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { data: fm, content } = matter(raw);

    if (fm.draft) {
      console.log(`  · skipping draft ${slug}`);
      continue;
    }

    const photo = fm.photo ? await uploadAsset(fm.photo, `${slug}.jpg`) : undefined;

    const bioText = content.trim();
    const bio = bioText ? markdownToPortableText(bioText) : undefined;

    const doc = {
      _id: `instructor-${slug}`,
      _type: 'instructor',
      name: fm.name,
      slug: { _type: 'slug', current: slug },
      ...(fm.role && { role: fm.role }),
      ...(photo && { photo }),
      ...(bio && { bio }),
      ...(fm.qualifications?.length && { qualifications: fm.qualifications }),
      ...(fm.languages?.length && { languages: fm.languages }),
      ...(fm.specialities?.length && { specialities: fm.specialities }),
      ...(fm.resorts?.length && { resorts: fm.resorts }),
      ...(fm.seasons !== undefined && { seasons: fm.seasons }),
      ...(fm.likes && { likes: fm.likes }),
      ...(fm.dislikes && { dislikes: fm.dislikes }),
      ...(fm.favouriteKit && { favouriteKit: fm.favouriteKit }),
      ...(fm.topTip && { topTip: fm.topTip }),
      ...(fm.archInstructorId && { archInstructorId: fm.archInstructorId }),
      ...(fm.order !== undefined && { order: fm.order }),
    };

    await upsert(doc);
    byName.set(fm.name, doc._id);
    console.log(`  ✓ ${fm.name} (${slug})`);
  }

  return byName;
}

// --- Journal posts ----------------------------------------------------------

async function migratePosts(authorIdByName) {
  console.log('\nMigrating journal posts…');
  const dir = path.join(repoRoot, 'src/content/journal');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  let migrated = 0;
  let missingAuthors = 0;

  for (const file of files) {
    const slug = slugFromFile(file);
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { data: fm, content } = matter(raw);

    if (fm.draft) {
      console.log(`  · skipping draft ${slug}`);
      continue;
    }

    const authorId = authorIdByName.get(fm.author);
    if (!authorId) {
      console.warn(`  ⚠ ${slug}: author "${fm.author}" not found in instructor map — skipping post`);
      missingAuthors++;
      continue;
    }

    const hero = fm.hero ? await uploadAsset(fm.hero, `${slug}-hero.jpg`) : undefined;
    const body = markdownToPortableText(content.trim());

    const publishedAt =
      fm.publishedAt instanceof Date
        ? fm.publishedAt.toISOString()
        : fm.publishedAt
          ? new Date(fm.publishedAt).toISOString()
          : undefined;

    const doc = {
      _id: `post-${slug}`,
      _type: 'post',
      title: fm.title,
      slug: { _type: 'slug', current: slug },
      author: { _type: 'reference', _ref: authorId },
      category: fm.category,
      ...(hero && { hero }),
      ...(fm.excerpt && { excerpt: fm.excerpt }),
      ...(publishedAt && { publishedAt }),
      ...(fm.seoTitle && { seoTitle: fm.seoTitle }),
      ...(fm.seoDescription && { seoDescription: fm.seoDescription }),
      body,
    };

    await upsert(doc);
    migrated++;
    console.log(`  ✓ ${fm.title} (${slug})`);
  }

  return { migrated, missingAuthors };
}

// --- Run --------------------------------------------------------------------

async function main() {
  console.log(
    `Target: project ${projectId} · dataset ${dataset}${dryRun ? ' · DRY RUN' : ''}\n`,
  );
  const authors = await migrateInstructors();
  const { migrated, missingAuthors } = await migratePosts(authors);
  console.log(
    `\nDone. ${authors.size} instructors · ${migrated} posts${missingAuthors ? ` · ${missingAuthors} skipped (missing author)` : ''}.`,
  );
}

main().catch((err) => {
  console.error('\n✗ Migration failed:', err.message);
  if (err.response?.body) console.error(err.response.body);
  process.exit(1);
});
