#!/usr/bin/env node
// Phase 3: seed the lessons listing — six lesson docs (card data) + the
// lessonsPage singleton holding everything on /lessons that the page-level
// editor will want to change (hero, promo band, philosophy, peak progress,
// levels guide, closing CTA).
//
// Idempotent: re-running upserts via createOrReplace using stable _ids.
//
// Usage:
//   SANITY_WRITE_TOKEN=sk... node sanity/seed/seed-lessons.mjs
//   SANITY_WRITE_TOKEN=sk... node sanity/seed/seed-lessons.mjs --dry-run

import { createClient } from '@sanity/client';

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

async function upsert(doc) {
  if (dryRun) {
    console.log(`  (dry-run) upsert ${doc._type} ${doc._id}`);
    return doc;
  }
  return client.createOrReplace(doc);
}

// --- Lessons (card data for the /lessons grid) ------------------------------

const lessons = [
  {
    slug: 'family',
    name: "Kids' ski school",
    cardKicker: 'School holidays · 5,12',
    cardBody:
      'Holiday-week kids groups. Max 6 (or 4 in mini groups). PEAK-level system with medals when they pass.',
    order: 10,
  },
  {
    slug: 'private',
    name: 'Private lessons',
    cardKicker: 'One on one',
    cardBody:
      'A dedicated instructor for the time you book. From two hours to a full day. All levels. All resorts.',
    order: 20,
  },
  {
    slug: 'off-piste',
    name: 'Off-piste & freeride',
    cardKicker: 'Beyond the rope',
    cardBody:
      'Big terrain with the right people. Avalanche awareness, route choice, and the confidence to ski it.',
    order: 30,
    // Page-level content
    seoTitle:
      'Off-piste skiing & freeride lessons in the Portes du Soleil · Peak Snowsports',
    seoDescription:
      'Half-day and full-day off-piste, ski-touring and freeride clinics in Morzine, Avoriaz, Châtel and Les Gets. Avalanche safety, navigation, route planning. Up to six per instructor.',
    heroKicker: 'Lessons · Off-piste & freeride',
    heroHeadline: 'Past the rope. With the right people.',
    heroSub:
      'Half-day or full-day clinics covering ski touring technique, avalanche safety, navigation and route planning. Lift-access or skinning, your call.',
    heroPrimaryCta: { label: 'Check availability', href: '#availability' },
    heroSecondaryCta: { label: 'See the content', href: '#what-we-cover' },
    introKicker: "Who it's for",
    introTitle: 'Adventures, big or small.',
    introBody: [
      "We're passionate about experiencing adventures with you. No matter how big or small. Our touring and off-piste clinics are perfect for someone interested in venturing away from the pistes. It's a jam-packed half-day or full-day giving you a solid understanding of the basic principles around skiing off-piste, either lift access or ski touring.",
      'Guests should have a good level of fitness and be comfortable skiing red and black runs. Off-piste experience not essential.',
    ],
    introFactTiles: [
      { _key: 'format', label: 'Format', value: '½ or full day' },
      { _key: 'group', label: 'Group size', value: '6 max' },
      { _key: 'start', label: 'Start', value: '09:00 or 12:00' },
      { _key: 'where', label: 'Where', value: 'Portes du Soleil' },
    ],
    contentSectionKicker: 'What we cover',
    contentSectionTitle: 'The clinic content.',
    contentItems: [
      'Develop ski touring technique, flat, steep and turning',
      'Learn mountain navigation',
      'Develop climbing with ski crampons, using kick turns and managing exposed slopes',
      'Understand avalanche safety, terrain traps, reading the mountain and action planning',
      'Develop route planning, decision making and lead sections',
      'Explore the fantastic Portes du Soleil',
    ],
    kitKicker: 'What to bring',
    kitTitle: 'Ski touring kit.',
    kitBody:
      'Guests will require ski touring equipment. We work with local rental partners if you need to hire, email us before you arrive.',
    kitItems: [
      'Good layering of lightweight clothing for snowy environments',
      'Avalanche transceiver, shovel and probe',
      'Ski touring skis, bindings, skins and ski crampons',
      'A backpack of around 30L',
    ],
    bookingKicker: 'Availability',
    bookingTitle: 'Book an off-piste clinic.',
    archProductId: 'off-piste',
  },
  {
    slug: 'kids-club',
    name: "Local kids' club",
    cardKicker: 'For local kids · 7+',
    cardBody:
      'A season-long programme for in-resort kids. Wednesday and Saturday afternoons. 30 sessions. PEAK levels, medals, all-mountain skills.',
    order: 40,
  },
  {
    slug: 'race-coaching',
    name: 'Race coaching',
    cardKicker: 'Gates and timing',
    cardBody:
      'Gate training, video review, tactical coaching. Run by trainers who race and examine.',
    order: 50,
  },
  {
    slug: 'ski-camps',
    name: 'Ski camps',
    cardKicker: 'Adult camps · 5 days',
    cardBody:
      'Five-day small-group camps for intermediate and advanced skiers. BASI Trainers. Half-board at The Fat Fox Lodge, or coaching only.',
    externalHref: '/ski-camps',
    order: 60,
  },
];

// Pass-through fields — any of these on a seed entry get copied into the
// Sanity doc verbatim if present. Lets us add page-level content lesson by
// lesson without growing the seed loop.
const PASSTHROUGH = [
  'seoTitle',
  'seoDescription',
  'heroKicker',
  'heroHeadline',
  'heroSub',
  'heroPrimaryCta',
  'heroSecondaryCta',
  'introKicker',
  'introTitle',
  'introBody',
  'introFactTiles',
  'contentSectionKicker',
  'contentSectionTitle',
  'contentItems',
  'kitKicker',
  'kitTitle',
  'kitBody',
  'kitItems',
  'bookingKicker',
  'bookingTitle',
  'archProductId',
];

async function seedLessons() {
  console.log('Seeding lessons…');
  for (const l of lessons) {
    const doc = {
      _id: `lesson-${l.slug}`,
      _type: 'lesson',
      name: l.name,
      slug: { _type: 'slug', current: l.slug },
      order: l.order,
      cardKicker: l.cardKicker,
      cardBody: l.cardBody,
      ...(l.externalHref && { externalHref: l.externalHref }),
    };
    for (const k of PASSTHROUGH) {
      if (l[k] !== undefined) doc[k] = l[k];
    }
    await upsert(doc);
    console.log(`  ✓ ${l.name}`);
  }
}

// --- Lessons page singleton -------------------------------------------------

const page = {
  _id: 'lessonsPage',
  _type: 'lessonsPage',
  seoTitle:
    'Ski lessons in Morzine, Avoriaz, Châtel & Les Gets · Peak Snowsports',
  seoDescription:
    "Private ski lessons, adult group lessons, kids' ski school, off-piste clinics, race coaching and adult ski camps across the Portes du Soleil. Seven levels. Real coaches. Real names.",

  heroKicker: 'Lessons',
  heroHeadline: "It's all about you.",
  heroSub:
    "Private lessons, kids' groups, off-piste, race coaching, ski camps. Our coaches use a skills-based approach, everything we decide starts with you.",
  heroPrimaryCta: { label: 'Check availability', href: '/book' },
  heroSecondaryCta: { label: 'Find your level', href: '#levels' },

  promoEnabled: true,
  promoKicker: '2025/26 prices · paid in full by 30 June',
  promoBody:
    'Lock in current-season prices for next season with code **FREEZE27**.',
  promoCta: { label: 'Book now →', href: '/book' },

  productsKicker: 'Choose your lesson',
  productsTitle: 'Six products. One standard.',

  philosophyKicker: "It's all about you",
  philosophyTitle: 'A skills-based approach.',
  philosophyParagraphs: [
    'Every decision our coaches make has you at the centre. We figure out where you are, what you need next, and we teach to that, rather than running you through a script.',
    'The team is highly qualified with full French equivalence (Carte Professionelle) and led by BASI trainers/examiners. Real coaching, not crowd management.',
  ],
  philosophyFacts: [
    { _type: 'fact', _key: 'size', label: 'Group size', value: '6 max' },
    { _type: 'fact', _key: 'mini', label: 'Mini beginners', value: '4 max' },
    { _type: 'fact', _key: 'cartepro', label: 'Carte Pro', value: 'Every coach' },
    { _type: 'fact', _key: 'trained', label: 'Trained by', value: 'BASI trainers' },
  ],

  peakProgressKicker: 'New for 2026/27',
  peakProgressTitle: 'Peak Progress. Your skiing on record.',
  peakProgressParagraphs: [
    'After every lesson, your instructor records a score across the things that actually matter. Posture. Movements. Balance. Steering. Control. The system places you on the PEAK level system and recommends what to book next.',
    'Hyper-personalised. Direct from the coach who taught you. Remembered forever, a bit like a skiing IQ that builds with every season you spend with us.',
    'Log into your Peak account to see the feedback, any video analysis, and your full learning journey with us. We call it Peak Progress.',
  ],
  peakProgressFooter: 'Powered by SkiOperator.',
  peakProgressFacts: [
    { _type: 'fact', _key: 'posture', label: 'Assessed', value: 'Posture' },
    { _type: 'fact', _key: 'movements', label: 'Assessed', value: 'Movements' },
    { _type: 'fact', _key: 'balance', label: 'Assessed', value: 'Balance' },
    { _type: 'fact', _key: 'steering', label: 'Assessed', value: 'Steering' },
    { _type: 'fact', _key: 'control', label: 'Assessed', value: 'Control' },
  ],

  levelsKicker: 'Find your level',
  levelsTitle: 'Seven levels. Honest descriptions.',
  levelsLead:
    "Not sure where you sit? Read the self-description for each level, pick the one that sounds most like you. If you're between two, we'll calibrate in the first ten minutes of your lesson.",
  levels: [
    {
      _type: 'level',
      _key: 'beginner',
      label: 'Beginner',
      self: "I am a total beginner. This is my first time. I've never skied before.",
      skills: [
        'Understand how to use the equipment',
        'Balance while sliding on a nursery slope',
        'Snowplough shape while sliding',
      ],
      lifts: 'Magic carpets',
    },
    {
      _type: 'level',
      _key: 'lower-intermediate',
      label: 'Lower intermediate',
      self: 'I can make snowplough turns and stop competently on a green run.',
      skills: [
        'Get up after falling',
        'Snowplough traverse',
        "Follow instructor's tracks without cutting corners",
      ],
      lifts: 'Chair lifts (accompanied), bubble lifts',
    },
    {
      _type: 'level',
      _key: 'basic-intermediate',
      label: 'Basic intermediate',
      self: 'I am comfortable snowplough turning on green and easy blue runs. Keen to learn the parallel turn.',
      skills: [
        'Balance on the outside ski',
        'Learning side-slip',
        'Parallel traverse with the lower ski gripping',
      ],
      lifts: 'Chair lifts',
    },
    {
      _type: 'level',
      _key: 'intermediate',
      label: 'Intermediate',
      self: 'I am exploring all blue runs and easy reds. Confident skiing parallel turn on these runs.',
      skills: [
        'Direct side-slip controlling both skis simultaneously',
        'Ski within a corridor, controlling speed and line',
        'Managing posture on steeper slopes',
      ],
      lifts: 'All lifts',
    },
    {
      _type: 'level',
      _key: 'basic-advanced',
      label: 'Basic advanced',
      self: 'I ski most red runs comfortably but want to improve my technique for changing snow and steeper slopes.',
      skills: [
        'Lift the inside ski at the fall line to the end of the turn',
        'Diagonal side-slip controlling fore and aft',
        'Learning short turns and pole plant',
      ],
      lifts: 'Navigate the ski area',
    },
    {
      _type: 'level',
      _key: 'advanced',
      label: 'Advanced',
      self:
        "I'm happy on any coloured run. Keen to improve technique, grippier short turns, learning to carve, starting to explore off-piste.",
      skills: [
        'Ski a narrow corridor controlling speed and line',
        'Maintain ski-to-snow contact at all times',
        'Rolling edge to edge on a green slope, leaving two clean tracks',
        'Ski a funnel: short → medium → long radius turns',
      ],
      lifts: 'Lap runs independently',
    },
    {
      _type: 'level',
      _key: 'expert',
      label: 'Expert',
      self:
        'I can ski the whole mountain on- and off-piste. Looking to push technical knowledge, moguls, off-piste, ski touring.',
      skills: [
        'Linked turns in easy moguls',
        'Cleanly carve red and black runs',
        'Link flowing turns in off-piste snow',
        'Understand avalanche danger scale and equipment',
        'Lead a partner in tree runs / variable off-piste',
        'Attempt green and blue freestyle features',
      ],
      lifts: 'Lead around the ski area',
    },
  ],

  closingTitle: 'Got a question?',
  closingBody:
    'WhatsApp us, email hello@peaksnowsports.com, or call +44 1483 616 522. Replies usually within 30 minutes.',
  closingPrimaryCta: { label: 'Book a lesson →', href: '/book' },
  closingSecondaryCta: { label: 'WhatsApp us', href: 'https://wa.me/?text=Hi%20Peak' },
};

async function seedPage() {
  console.log('\nSeeding lessons page singleton…');
  await upsert(page);
  console.log('  ✓ lessonsPage');
}

// --- Run --------------------------------------------------------------------

async function main() {
  console.log(
    `Target: project ${projectId} · dataset ${dataset}${dryRun ? ' · DRY RUN' : ''}\n`,
  );
  await seedLessons();
  await seedPage();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err.message);
  if (err.response?.body) console.error(err.response.body);
  process.exit(1);
});
