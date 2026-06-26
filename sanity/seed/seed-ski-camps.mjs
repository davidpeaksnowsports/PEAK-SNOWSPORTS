#!/usr/bin/env node
// Seed the ski-camps content for Phase 1 of the Sanity migration.
//
// Idempotent: re-running upserts the same documents (matched by `_id`),
// so it's safe to tweak the data here and re-run.
//
// Requires SANITY_WRITE_TOKEN in env. Get one at:
//   https://www.sanity.io/manage/personal/project/un1s8qq9/api → Tokens → Add API token (Editor)
//
// Usage:
//   SANITY_WRITE_TOKEN=skXXX node sanity/seed/seed-ski-camps.mjs
//   SANITY_WRITE_TOKEN=skXXX node sanity/seed/seed-ski-camps.mjs --dry-run

import { createClient } from '@sanity/client';
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

async function uploadAsset(relPath) {
  if (dryRun) return { _ref: `image-DRY-${path.basename(relPath)}`, _type: 'reference' };
  const filePath = path.join(repoRoot, relPath);
  const stream = fs.createReadStream(filePath);
  const filename = path.basename(filePath);
  console.log(`  uploading ${filename} …`);
  const asset = await client.assets.upload('image', stream, { filename });
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
}

async function createOrReplace(doc) {
  if (dryRun) {
    console.log(`  (dry-run) would upsert ${doc._type} ${doc._id}`);
    return doc;
  }
  return client.createOrReplace(doc);
}

// --- Camp locations ---------------------------------------------------------

async function seedLocations() {
  console.log('Seeding camp locations…');
  const foxLogo = await uploadAsset('public/images/fat-fox-lodge/logo.webp');
  const foxImage = await uploadAsset('public/images/fat-fox-lodge/living.webp');

  const morzine = {
    _id: 'campLocation-morzine-avoriaz',
    _type: 'campLocation',
    name: 'Morzine-Avoriaz',
    slug: { _type: 'slug', current: 'morzine-avoriaz' },
    area: 'Portes du Soleil',
    shortBlurb:
      "Europe's largest cross-border ski area — 600+ km linked, with Avoriaz at 1,800 m as your home mountain. Huge mix of pistes, off-piste and tree-skiing.",
    facts: [
      { _type: 'fact', _key: 'pistes', label: 'Pistes', value: '291' },
      { _type: 'fact', _key: 'geneva', label: 'From Geneva', value: '1.5 hr' },
    ],
    pricingTbc: false,
    pricingSubtitle: 'The Fat Fox Lodge, Montriond',
    tiers: [
      { _type: 'tier', _key: 'coaching', name: 'Coaching only', price: 699 },
      { _type: 'tier', _key: 'shared', name: 'Shared accommodation', price: 1899 },
      { _type: 'tier', _key: 'private', name: 'Private accommodation', price: 2494 },
    ],
    accommodationHeadline: 'The Fat Fox Lodge, Montriond.',
    accommodationLogo: foxLogo,
    accommodationImage: foxImage,
    accommodationBody:
      'Tess and Joe built The Fat Fox Lodge for people who actually live the mountains. Nutritious food, a vibrant shared space, twin and queen rooms with private bathrooms, big windows over the Montriond forest. Natural, local, resourceful.',
    usps: [
      {
        _type: 'usp',
        _key: 'food',
        label: 'Food',
        body: 'Served around a big shared table in the Haberdashery, the central hub of the lodge.',
      },
      {
        _type: 'usp',
        _key: 'rooms',
        label: 'Rooms',
        body: 'Twin or queen, all four with private bathrooms across the landing. Big windows over the Montriond forest.',
      },
      {
        _type: 'usp',
        _key: 'hosts',
        label: 'Hosts',
        body: "Tess and Joe, snow-lovers who've roamed the globe and landed in Morzine.",
      },
    ],
  };

  const verbier = {
    _id: 'campLocation-verbier',
    _type: 'campLocation',
    name: 'Verbier',
    slug: { _type: 'slug', current: 'verbier' },
    area: 'Four Valleys',
    shortBlurb:
      "Switzerland's flagship freeride mountain. Big terrain, big lines, legendary off-piste. Resort altitude 1,500 m, top lift 3,330 m.",
    facts: [
      { _type: 'fact', _key: 'pistes', label: 'Pistes', value: '410+ km' },
      { _type: 'fact', _key: 'geneva', label: 'From Geneva', value: '2 hr' },
    ],
    pricingTbc: true,
    pricingSubtitle: 'Accommodation and pricing being scoped',
  };

  const val = {
    _id: 'campLocation-val-disere',
    _type: 'campLocation',
    name: "Val d'Isère",
    slug: { _type: 'slug', current: 'val-disere' },
    area: 'Espace Killy',
    shortBlurb:
      'High-altitude snow-sure terrain linked with Tignes. Long descents, classic Alpine resort, world-class coaching ground at 1,850 m.',
    facts: [
      { _type: 'fact', _key: 'pistes', label: 'Pistes', value: '300 km' },
      { _type: 'fact', _key: 'geneva', label: 'From Geneva', value: '2.5 hr' },
    ],
    pricingTbc: false,
    pricingSubtitle: 'Accommodation provider being finalised',
    tiers: [
      { _type: 'tier', _key: 'coaching', name: 'Coaching only', price: 799 },
      { _type: 'tier', _key: 'shared', name: 'Shared accommodation', price: 1959 },
      { _type: 'tier', _key: 'private', name: 'Private accommodation', price: 2649 },
    ],
  };

  for (const doc of [morzine, verbier, val]) {
    await createOrReplace(doc);
    console.log(`  ✓ ${doc.name}`);
  }
}

// --- Ski camps --------------------------------------------------------------

const camps = [
  { date: '2026-12-14', locs: ['morzine-avoriaz', 'verbier'], tag: null },
  { date: '2027-01-04', locs: ['morzine-avoriaz'], tag: null },
  { date: '2027-01-11', locs: ['morzine-avoriaz'], tag: 'New date' },
  { date: '2027-01-18', locs: ['morzine-avoriaz', 'val-disere'], tag: null },
  { date: '2027-03-01', locs: ['morzine-avoriaz'], tag: null },
  { date: '2027-03-15', locs: ['morzine-avoriaz'], tag: 'New date' },
  { date: '2027-03-22', locs: ['morzine-avoriaz', 'val-disere'], tag: null },
];

async function seedCamps() {
  console.log('Seeding ski camps…');
  for (const c of camps) {
    const doc = {
      _id: `skiCamp-${c.date}`,
      _type: 'skiCamp',
      startDate: c.date,
      locations: c.locs.map((slug, i) => ({
        _type: 'reference',
        _key: `loc-${slug}-${i}`,
        _ref: `campLocation-${slug}`,
      })),
      tag: c.tag,
      confirmed: false,
    };
    await createOrReplace(doc);
    console.log(`  ✓ ${c.date} · ${c.locs.join(' + ')}${c.tag ? ` · ${c.tag}` : ''}`);
  }
}

// --- Page singleton ---------------------------------------------------------

const page = {
  _id: 'skiCampsPage',
  _type: 'skiCampsPage',
  seoTitle: "Adult ski camps · Morzine-Avoriaz, Verbier & Val d'Isère · Peak Snowsports",
  seoDescription:
    "Five-day small-group ski camps in Morzine-Avoriaz, Verbier and Val d'Isère for intermediate and advanced skiers. Coached by BASI L4 ISTD and Trainers. 8 max per group. From €699 coaching only.",
  heroKicker: "Adult ski camps · Morzine-Avoriaz · Verbier · Val d'Isère",
  heroHeadline: 'Five days on snow. One serious step up.',
  heroSub:
    'Small-group ski camps for intermediate and advanced skiers across three resorts. Coached by BASI Level 4 ISTD and BASI Trainers. Half-board accommodation, or coaching only.',
  heroPrimaryCta: { label: 'See dates & pricing', href: '#dates' },
  heroSecondaryCta: { label: 'Reserve your place', href: '#book' },

  welcomeKicker: 'Welcome',
  welcomeTitle: 'Five days. Eight skiers. One real step up.',
  welcomeLead:
    "Coached by the people who train other instructors. Eight skiers max per group. We meet you at the level you're at and take you to the one you want.",
  welcomeBullets: [
    "Seven camps across the 2026/27 season in Morzine-Avoriaz, Verbier and Val d'Isère. Two levels: intermediate (stuck on blues and easy reds, ready to step up) and advanced (confident on red and black, want to refine).",
    "Half-board accommodation in resort: shared dinners, decent coffee, a hot tub, daily yoga, and a team that knows the area. Coaching only is also an option if you've already got somewhere to stay.",
  ],
  welcomeTiles: [
    {
      _type: 'tile',
      _key: 'dates',
      kicker: 'Camp dates',
      headline: '7 camps · Dec 2026 – Mar 2027',
      body: 'Full schedule and pricing below.',
    },
    {
      _type: 'tile',
      _key: 'pricing',
      kicker: 'Pricing from',
      headline: '€699 coaching only',
      body: 'Shared and private accommodation packages available.',
    },
    {
      _type: 'tile',
      _key: 'arrival',
      kicker: 'Arrival',
      headline: 'Day before · Sunday',
      body: 'If you book accommodation, check-out is the Saturday after camp.',
    },
  ],

  levels: [
    {
      _type: 'level',
      _key: 'intermediate',
      name: 'Intermediate',
      forWhom:
        "Comfortable on blues and easy reds controlling your speed with parallel turns. You're now ready to refine those parallel turns on steeper reds, changing snow, bumps and the edges of off-piste. Still in a snow-plough? Check out our improver camp.",
      outcome: 'Build solid foundations, then push past the intermediate plateau.',
    },
    {
      _type: 'level',
      _key: 'advanced',
      name: 'Advanced',
      forWhom:
        "Confident on red and black runs. Refining performance, efficiency and control across off-piste, steeps, bumps and variable snow. Ideal if you've plateaued or already done an intermediate camp.",
      outcome: 'Sharpen your skiing with precision and control in all-mountain conditions.',
    },
  ],
  lodgingOptions: ['Coaching only', 'Shared accommodation', 'Private accommodation'],

  onSnowLabel: 'On snow',
  onSnow: [
    'Five+ hours coaching per day, breaks when the group needs them',
    'Full resort lift pass',
    'Performance video analysis sessions',
    'Technical ski-system workshop',
    'Equipment check workshop',
    'The best lunch spots, found and tested',
  ],
  offSnowLabel: 'Off snow (accommodation packages)',
  offSnow: [
    'Half-board accommodation in resort',
    'Breakfast and dinner using local ingredients',
    'Daily yoga after skiing',
    'Barista-style in-house coffee',
    'Hot tub and ice bath',
    'Team dinner at a traditional local restaurant',
  ],

  accommodationKicker: 'Where you stay',
  accommodationTitle: 'Half-board accommodation by location.',
  accommodationLead:
    "Morzine-Avoriaz camps stay at The Fat Fox Lodge in Montriond. Val d'Isère accommodation is being finalised and will match the same standard. Coaching-only is available everywhere if you've got your own place sorted.",

  valAccommodationCard: {
    kicker: "Val d'Isère",
    headline: 'Accommodation, in line with The Fat Fox Lodge.',
    body: "We're finalising our Val d'Isère accommodation partner for the 2026/27 season. The standard will match The Fat Fox Lodge: half-board, shared dinners, decent coffee, and a place you'll be glad to come back to after a hard day on the hill. Drop us a line if you want the latest update before booking.",
  },

  whereYouSkiKicker: 'Where you ski',
  whereYouSkiTitle: 'Three resorts. One standard.',
  whereYouSkiLead:
    "Pick the mountain that suits the camp you're after. Same coaching team, same group sizes, same five-day structure across all three.",

  whatWeCoverKicker: 'Camp content',
  whatWeCoverTitle: "What we'll cover.",
  whatWeCover: [
    {
      _type: 'topic',
      _key: 'building-blocks',
      title: 'Eight building blocks',
      body: 'The six essentials behind every good skier. Master the basics that let everything else click into place.',
    },
    {
      _type: 'topic',
      _key: 'ski-fit',
      title: 'Ski fit',
      body: "Top tips for getting fit before the camp. What gym work transfers to snow, and what doesn't.",
    },
    {
      _type: 'topic',
      _key: 'performance',
      title: 'Performance analysis',
      body: 'Video review on every camp. Set benchmarks, fix the right things, see your motor skills improve fast.',
    },
    {
      _type: 'topic',
      _key: 'terrain',
      title: 'Terrain',
      body: 'How to adjust the building blocks for piste, bumps, off-piste and steeps. Different ground, same fundamentals.',
    },
  ],

  faqsKicker: 'FAQs',
  faqsTitle: 'The usual questions.',
  faqs: [
    {
      _type: 'faq',
      _key: 'weather',
      q: 'What if the weather turns?',
      a: 'We only stop skiing if the mountain is officially closed.',
    },
    {
      _type: 'faq',
      _key: 'cancellation',
      q: 'Cancellation policy?',
      a: 'Refunds on a sliding scale depending on the notice you give us. Full details in our terms and conditions.',
    },
    {
      _type: 'faq',
      _key: 'not-confirmed',
      q: "What if a camp doesn't get confirmed?",
      a: "In the unlikely event that we don't hit minimum numbers, we convert your booked coaching hours into private lessons of the same value across the same week. You still ski with us, you still get coached — just in a different format.",
    },
    {
      _type: 'faq',
      _key: 'rental',
      q: 'Equipment rental?',
      a: 'We work with local hire partners and can sort you a discount. Email us before you arrive.',
    },
    {
      _type: 'faq',
      _key: 'insurance',
      q: 'Insurance?',
      a: 'Yes, make sure yours covers winter sports, and skiing into Switzerland (the Portes du Soleil crosses the border).',
    },
    {
      _type: 'faq',
      _key: 'wrong-level',
      q: 'What if I turn out not to be the right level?',
      a: "We'll move you into another group, or offer the equivalent in private lessons, subject to availability.",
    },
    {
      _type: 'faq',
      _key: 'group-size',
      q: 'How big are the groups?',
      a: '8 skiers max per group. We often run multiple groups, so we can move skiers around to the right level on day one. Half-board is limited to the first 8 bookings, after that, self-accommodate.',
    },
    {
      _type: 'faq',
      _key: 'meet',
      q: 'Where do we meet?',
      a: 'Meeting points are resort-specific. If you book accommodation, you travel with the group each morning. If you self-accommodate, we send full meeting-point instructions with your booking confirmation.',
    },
    {
      _type: 'faq',
      _key: 'arrival',
      q: 'When should I arrive?',
      a: 'Arrival to resort is the Sunday before camp starts. Camps run Monday to Friday. If you book accommodation, check-out is the Saturday after camp finishes.',
    },
    {
      _type: 'faq',
      _key: 'lift-pass',
      q: 'Is the lift pass included?',
      a: "Yes, full lift pass for the resort area you're skiing in.",
    },
    {
      _type: 'faq',
      _key: 'teachers',
      q: 'Who actually teaches?',
      a: 'Current, fully-qualified BASI instructors. The same coaches who run our performance courses and instructor exams.',
    },
  ],

  planBHeadline: "If a camp doesn't run",
  planBBody:
    "Each camp goes ahead once we hit minimum numbers — we confirm as soon as we do. In the unlikely event that a camp doesn't get confirmed, we convert your booked coaching hours into private lessons of the same value across the same week, so you still ski and we still coach.",

  bookKicker: 'Ready to book',
  bookTitle: 'Pick a camp. Hold your place.',
  bookLead:
    "Online booking is coming soon. In the meantime, drop us a line — tell us your preferred camp date, level (intermediate / advanced) and package (coaching only, shared, or private), and we'll confirm your place by return.",
  bookPrimaryCta: {
    label: 'Email us to place your booking →',
    href: 'mailto:hello@peaksnowsports.com?subject=Ski%20camp%20booking',
  },
  bookSecondaryCta: { label: 'Or call +44 1483 616 522', href: 'tel:+441483616522' },
  bookDisclaimer: 'Half-board limited to the first 8 bookings per camp.',
};

async function seedPage() {
  console.log('Seeding ski camps page singleton…');
  await createOrReplace(page);
  console.log('  ✓ skiCampsPage');
}

// --- Run --------------------------------------------------------------------

async function main() {
  console.log(
    `Target: project ${projectId} · dataset ${dataset}${dryRun ? ' · DRY RUN' : ''}\n`,
  );
  await seedLocations();
  await seedCamps();
  await seedPage();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err.message);
  if (err.response?.body) console.error(err.response.body);
  process.exit(1);
});
