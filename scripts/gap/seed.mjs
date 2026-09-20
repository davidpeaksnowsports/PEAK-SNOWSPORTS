/**
 * Seed the GAP student portal with the content that is the same every intake:
 * the benchmark framework, the packing and pre-arrival checklist, the workbook
 * module list, and the FAQ/contacts skeleton.
 *
 * Idempotent — run it as often as you like. Criteria match on `code`, and
 * cohort content matches on (cohort, natural key), so re-running updates
 * rather than duplicating.
 *
 * Usage:
 *   node --env-file=.env scripts/gap/seed.mjs --cohort morzine-2027
 *   node --env-file=.env scripts/gap/seed.mjs --cohort morzine-2027 --dry-run
 *
 * With no --cohort it seeds the global benchmark criteria only.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS. Keep it in .env
 * locally and NEVER set it in Vercel — nothing the site serves should be able
 * to bypass row-level security.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const cohortSlug = args[args.indexOf('--cohort') + 1];
const hasCohort = args.includes('--cohort') && cohortSlug && !cohortSlug.startsWith('--');
const dryRun = args.includes('--dry-run');

const db = createClient(url, key, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Benchmark framework
//
// Shaped to the BASI-style assessment the GAP course prepares people for. The
// headings are meant to be edited — this is a starting point that matches the
// current course, not a fixed standard. Change them in Supabase, not here,
// once the season is running: existing scores reference the row by id.
// ---------------------------------------------------------------------------

const CRITERIA = [
  // Technical skiing
  ['technical', 'fe-1', 'Fundamental element 1', 'Balance and the centred stance'],
  ['technical', 'fe-2', 'Fundamental element 2', 'Edging and the shape of the turn'],
  ['technical', 'fe-3', 'Fundamental element 3', 'Rotational control'],
  ['technical', 'fe-4', 'Fundamental element 4', 'Pressure management'],
  ['technical', 'fe-5', 'Fundamental element 5', 'Timing and coordination'],
  ['technical', 'piste', 'Piste performance', 'Groomed terrain at speed'],
  ['technical', 'variable', 'Variable terrain', 'Soft, crud, tracked'],
  ['technical', 'bumps', 'Bumps', null],
  ['technical', 'steeps', 'Steeps', null],
  ['technical', 'short-turns', 'Short turns', null],
  ['technical', 'central-theme', 'Central theme demonstrations', 'The pathway, shown accurately at each stage'],

  // Teaching
  ['teaching', 'session-planning', 'Session planning', null],
  ['teaching', 'safety-groups', 'Safety and group management', null],
  ['teaching', 'communication', 'Communication', null],
  ['teaching', 'observation', 'Observation', 'Seeing what is actually happening'],
  ['teaching', 'analysis', 'Analysis', 'Working out why, and what matters most'],
  ['teaching', 'task-selection', 'Task selection', null],
  ['teaching', 'demonstration', 'Demonstration quality', null],
  ['teaching', 'feedback', 'Feedback', null],
  ['teaching', 'lesson-structure', 'Lesson structure', null],
  ['teaching', 'adaptation', 'Adaptation and progression', null],

  // Professional
  ['professional', 'conduct', 'Professional conduct', 'How you are to work alongside'],
  ['professional', 'punctuality', 'Punctuality and preparation', null],
  ['professional', 'client-care', 'Client care', null],
  ['professional', 'self-development', 'Taking feedback and acting on it', null],
];

// ---------------------------------------------------------------------------
// Workbook modules — the twelve from the course outline.
// ---------------------------------------------------------------------------

const MODULES = [
  [1, 'Personal goals and starting benchmark', 'Where you are on day one, in your own words.'],
  [2, 'The fundamental elements', null],
  [3, 'Central theme and skier development', null],
  [4, 'Technical observation', null],
  [5, 'Lesson planning', null],
  [6, 'Teaching and communication', null],
  [7, 'Safety and mountain awareness', null],
  [8, 'Equipment knowledge', null],
  [9, 'Professional standards', null],
  [10, 'Ski-school experience reflections', 'Pulls together what you saw shadowing.'],
  [11, 'Weekly reviews', null],
  [12, 'Final development plan', 'What you do in the twelve weeks after the course.'],
];

// ---------------------------------------------------------------------------
// Checklist. `true` in the last column means pre-arrival rather than packing.
//
// Deliberately absent: anything that collects passport scans, medical details
// or dietary requirements in the portal itself. Those are pre-arrival tasks
// that point at the office, because that data needs retention rules and access
// controls a tick-box list does not have.
// ---------------------------------------------------------------------------

const CHECKLIST = [
  // Pre-arrival
  ['Admin', 'Confirm your travel details with the office', null, true, true],
  ['Admin', 'Send your emergency contact details', null, true, true],
  ['Admin', 'Send dietary and medical information', 'Email it — we do not collect it in the portal', true, true],
  ['Admin', 'Check your travel and winter-sports insurance covers instruction', 'Off-piste and teaching are often excluded as standard', true, true],
  ['Admin', 'Confirm your equipment — skis, boots, helmet', null, true, true],
  ['Admin', 'Complete your starting self-assessment', 'On the My progress page', true, true],
  ['Admin', 'Read the course essentials page end to end', null, false, true],

  // Packing
  ['Ski equipment', 'Skis and bindings, serviced', 'Get them done before you travel — it is cheaper at home', true, false],
  ['Ski equipment', 'Boots', 'Fitted, and broken in if they are new', true, false],
  ['Ski equipment', 'Helmet', null, true, false],
  ['Ski equipment', 'Goggles — two lenses if you have them', 'Flat light is most of December', false, false],
  ['Ski equipment', 'Sunglasses', null, false, false],
  ['Ski equipment', 'Ski straps and a boot bag', null, false, false],

  ['Technical clothing', 'Ski jacket and salopettes', null, true, false],
  ['Technical clothing', 'Base layers ×4', 'You will be on snow six days a week', true, false],
  ['Technical clothing', 'Mid layers ×2', null, true, false],
  ['Technical clothing', 'Ski socks ×5', 'Thin, not thick', true, false],
  ['Technical clothing', 'Gloves ×2 pairs', 'One pair is always wet', true, false],
  ['Technical clothing', 'Buff or neck warmer', null, false, false],
  ['Technical clothing', 'Waterproof over-trousers', 'For teaching in the rain lower down', false, false],

  ['Casual clothing', 'Warm jacket for evenings', null, false, false],
  ['Casual clothing', 'Boots with grip', 'Resort pavements are ice', true, false],
  ['Casual clothing', 'Something smart for the end-of-course evening', null, false, false],

  ['Training and gym', 'Trainers', null, false, false],
  ['Training and gym', 'Gym kit', null, false, false],
  ['Training and gym', 'Swimwear', 'Most resorts have a pool worth using on a rest day', false, false],

  ['Documents', 'Passport', null, true, false],
  ['Documents', 'EHIC / GHIC or equivalent', null, true, false],
  ['Documents', 'Insurance documents', 'A copy on your phone as well as paper', true, false],
  ['Documents', 'Driving licence', null, false, false],
  ['Documents', 'Passport photos', 'Lift passes and BASI paperwork', false, false],

  ['Study', 'Laptop or tablet', 'Workshops and the workbook', true, false],
  ['Study', 'Chargers and a European adapter', null, true, false],
  ['Study', 'Notebook and pens', 'Gloved hands and a phone do not mix on the hill', false, false],

  ['Personal', 'Any regular medication', 'Enough for six weeks, in its original packaging', true, false],
  ['Personal', 'Sun cream — factor 50', 'Altitude and reflection, not heat', true, false],
  ['Personal', 'Lip balm with SPF', null, true, false],
  ['Personal', 'Painkillers and blister plasters', null, false, false],

  ['Travel', 'Travel documents and transfer confirmation', null, true, false],
  ['Travel', 'A day bag for the flight', null, false, false],
  ['Travel', 'Snacks for the transfer', null, false, false],
];

// ---------------------------------------------------------------------------
// Course essentials. Skeleton content — these are written to be edited, and
// several deliberately say "confirm with the office" rather than inventing a
// policy the school has not agreed.
// ---------------------------------------------------------------------------

const ESSENTIALS = [
  ['Emergency', 'If someone is injured on the hill', 'Stop. Make the scene safe — cross skis uphill of the casualty. Call the piste rescue number for the resort, which is on the resort guide page, and give the piste name and the nearest marker number. Then call your coach. Do not move anyone with a suspected head, neck or back injury.', true, 1],
  ['Emergency', 'European emergency number', 'Dial 112 from any phone, in any country, with any network. It works with no credit and no SIM.', true, 2],
  ['Emergency', 'If you are worried about someone', 'Tell a coach the same day. You do not need to be sure, and you will not be getting anyone into trouble. If it is about a coach, use the confidential option on the feedback page — the office reads it and your coaches do not.', true, 3],

  ['Contacts', 'Your coaches', 'Names, numbers and WhatsApp group — confirm with the office before your cohort starts.', false, 1],
  ['Contacts', 'The Peak office', 'hello@peaksnowsports.com. Office hours are the right route for anything that is not happening right now.', false, 2],

  ['Attendance', 'What we expect', 'Every scheduled session, on time, ready to ski. If you are ill or injured, tell your coach before the session, not after it.', false, 1],
  ['Attendance', 'Illness and injury', 'Tell your coach, then rest properly. A day off early beats a week off later. Sessions missed through injury are not made up one-to-one, but your coach will adjust what you are working on.', false, 2],

  ['Assessment', 'How readiness is judged', 'Your coaches assess you against the criteria on the My progress page, on a six-point acquisition scale. Readiness is a coaching indicator — it tells you how much of the assessment criteria you are currently showing. It is not a prediction, and it is not a guarantee of passing.', false, 1],
  ['Assessment', 'Experience hours', 'Shadowing and assisting hours are logged in the portal and signed off by a coach. Log them the same day — the detail fades fast, and unverified hours do not count.', false, 2],

  ['Practical', 'Lift passes', 'Collected on arrival. Bring a passport photo.', false, 1],
  ['Practical', 'Equipment servicing', 'Get skis serviced before you travel. In resort, the shops on the resort guide page do a next-day turnaround.', false, 2],
  ['Practical', 'Insurance', 'You need winter-sports cover that includes instruction and, ideally, off-piste with a qualified guide. Standard travel insurance usually excludes both — check the wording rather than the summary.', false, 3],
];

// ---------------------------------------------------------------------------

async function main() {
  console.log(dryRun ? 'Dry run — nothing will be written.\n' : '');

  // --- criteria ------------------------------------------------------------
  const criteriaRows = CRITERIA.map(([group, code, label, help], i) => ({
    group_key: group,
    code,
    label,
    help,
    sort: i,
    active: true,
  }));

  console.log(`Criteria: ${criteriaRows.length}`);
  if (!dryRun) {
    const { error } = await db
      .from('gap_criteria')
      .upsert(criteriaRows, { onConflict: 'code' });
    if (error) throw error;
  }

  if (!hasCohort) {
    console.log('\nNo --cohort given, so cohort content was skipped.');
    return;
  }

  // --- cohort --------------------------------------------------------------
  const { data: cohort, error: cohortError } = await db
    .from('gap_cohorts')
    .select('id, name')
    .eq('slug', cohortSlug)
    .maybeSingle();

  if (cohortError) throw cohortError;
  if (!cohort) {
    console.error(
      `\nNo cohort with slug "${cohortSlug}". Create it first:\n` +
        `  insert into gap_cohorts (name, slug, resort, starts_on, ends_on, assessment_on)\n` +
        `  values ('Morzine 2027', '${cohortSlug}', 'Morzine', '2027-01-03', '2027-02-12', '2027-02-08');`,
    );
    process.exit(1);
  }

  console.log(`Cohort: ${cohort.name}`);

  // Delete-then-insert per cohort, so removing a line from this file removes
  // it from the portal. Safe because nothing references these rows except
  // checklist progress, which cascades — and a re-seed mid-season would be a
  // deliberate act, not an accident.
  const seedTable = async (table, rows, label) => {
    console.log(`${label}: ${rows.length}`);
    if (dryRun) return;
    const { error: delError } = await db.from(table).delete().eq('cohort_id', cohort.id);
    if (delError) throw delError;
    const { error } = await db.from(table).insert(rows);
    if (error) throw error;
  };

  await seedTable(
    'gap_workbook_modules',
    MODULES.map(([number, title, summary]) => ({
      cohort_id: cohort.id,
      number,
      title,
      summary,
    })),
    'Workbook modules',
  );

  await seedTable(
    'gap_checklist_items',
    CHECKLIST.map(([section, label, note, required, preArrival], i) => ({
      cohort_id: cohort.id,
      section,
      label,
      note,
      required,
      pre_arrival: preArrival,
      sort: i,
    })),
    'Checklist items',
  );

  await seedTable(
    'gap_essentials',
    ESSENTIALS.map(([category, title, body, urgent, sort]) => ({
      cohort_id: cohort.id,
      category,
      title,
      body,
      urgent,
      sort,
    })),
    'Essentials',
  );

  console.log('\nDone.');
  console.log(
    'Still to add by hand: the programme, the resort guide and the learning hub —\n' +
      'those are resort- and intake-specific, so there is nothing sensible to seed.',
  );
}

main().catch((error) => {
  console.error('\nSeed failed:', error.message ?? error);
  process.exit(1);
});
