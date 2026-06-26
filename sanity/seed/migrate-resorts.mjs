#!/usr/bin/env node
// Phase 4: migrate resort markdown files from src/content/resorts/*.md into
// Sanity, uploading hero images as assets and converting body to Portable
// Text.
//
// Idempotent. Asset uploads are content-hashed by Sanity, so reruns are safe.
//
// Usage:
//   SANITY_WRITE_TOKEN=sk... node sanity/seed/migrate-resorts.mjs
//   SANITY_WRITE_TOKEN=sk... node sanity/seed/migrate-resorts.mjs --dry-run

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

async function uploadAsset(publicPath, filename) {
  if (dryRun) {
    return { _type: 'image', asset: { _type: 'reference', _ref: `image-DRY-${filename}` } };
  }
  const abs = path.join(repoRoot, 'public', publicPath.replace(/^\//, ''));
  if (!fs.existsSync(abs)) {
    console.warn(`    ⚠ asset missing on disk: ${publicPath}`);
    return undefined;
  }
  console.log(`    uploading ${path.basename(abs)} …`);
  const asset = await client.assets.upload('image', fs.createReadStream(abs), { filename });
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
}

async function upsert(doc) {
  if (dryRun) {
    console.log(`  (dry-run) upsert ${doc._type} ${doc._id}`);
    return doc;
  }
  return client.createOrReplace(doc);
}

async function migrateResorts() {
  console.log('Migrating resorts…');
  const dir = path.join(repoRoot, 'src/content/resorts');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const slug = path.basename(file, '.md');
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { data: fm, content } = matter(raw);

    if (fm.draft) {
      console.log(`  · skipping draft ${slug}`);
      continue;
    }

    const hero = fm.hero ? await uploadAsset(fm.hero, `${slug}-hero.jpg`) : undefined;
    const body = content.trim() ? markdownToPortableText(content.trim()) : undefined;

    const doc = {
      _id: `resort-${slug}`,
      _type: 'resort',
      name: fm.name,
      slug: { _type: 'slug', current: slug },
      type: fm.type ?? 'home',
      ...(fm.product && { product: fm.product }),
      country: fm.country ?? 'France',
      ...(fm.parentArea && { parentArea: fm.parentArea }),
      ...(fm.knownFor && { knownFor: fm.knownFor }),
      ...(hero && { hero }),
      ...(fm.order !== undefined && { order: fm.order }),
      ...(fm.altitude && { altitude: fm.altitude }),
      ...(fm.liftCount && { liftCount: fm.liftCount }),
      ...(fm.runDistance && { runDistance: fm.runDistance }),
      ...(fm.transferTime && { transferTime: fm.transferTime }),
      ...(fm.meetingPoints?.length && { meetingPoints: fm.meetingPoints }),
      ...(body && { body }),
    };

    await upsert(doc);
    console.log(`  ✓ ${fm.name} (${slug})`);
  }
}

async function main() {
  console.log(
    `Target: project ${projectId} · dataset ${dataset}${dryRun ? ' · DRY RUN' : ''}\n`,
  );
  await migrateResorts();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\n✗ Migration failed:', err.message);
  if (err.response?.body) console.error(err.response.body);
  process.exit(1);
});
