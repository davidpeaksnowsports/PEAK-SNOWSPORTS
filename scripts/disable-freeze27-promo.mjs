#!/usr/bin/env node
/**
 * One-shot: disable the FREEZE27 promo band on the lessonsPage Sanity doc.
 * The June deadline has passed, so we untick `promoEnabled` and clear the
 * body/kicker/cta so nothing renders on /lessons. The schema stays in place
 * for the next promo.
 *
 * Usage:
 *   node --env-file=.env scripts/disable-freeze27-promo.mjs
 *   node --env-file=.env scripts/disable-freeze27-promo.mjs --dry-run
 */
import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || 'un1s8qq9';
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';
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

const DOC_ID = 'lessonsPage';

const before = await client.getDocument(DOC_ID);
if (!before) {
  console.error(`✗ Document ${DOC_ID} not found in dataset "${dataset}".`);
  process.exit(1);
}

console.log('Before:');
console.log('  promoEnabled:', before.promoEnabled);
console.log('  promoKicker :', before.promoKicker);
console.log('  promoBody   :', before.promoBody);
console.log('  promoCta    :', before.promoCta);

if (dryRun) {
  console.log('\n(dry-run) would patch:');
  console.log('  promoEnabled → false');
  console.log('  promoKicker  → (unset)');
  console.log('  promoBody    → (unset)');
  console.log('  promoCta     → (unset)');
  process.exit(0);
}

const result = await client
  .patch(DOC_ID)
  .set({ promoEnabled: false })
  .unset(['promoKicker', 'promoBody', 'promoCta'])
  .commit();

console.log('\n✓ Patched');
console.log('  promoEnabled:', result.promoEnabled);
console.log('  promoKicker :', result.promoKicker);
console.log('  promoBody   :', result.promoBody);
console.log('  promoCta    :', result.promoCta);
