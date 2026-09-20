/**
 * Load the real Morzine 2027 course content into the GAP portal.
 *
 * Sources, all supplied by David on 2026-09-20:
 *   - "Copy of GAP Avoriaz Course Planner public.xlsx" — the six-week timetable
 *   - "Email templates-…zip" — the 15-email pre-arrival HubSpot sequence
 *   - "GAP PACKING LIST .docx" — packing list + FAQs
 *   - "PEAK GAP 2627.pdf" — the sales deck (what's included, FAQs, pathway)
 *
 * Idempotent: content this script owns is deleted for the cohort and
 * reinserted, so editing the arrays here and re-running is the way to change
 * it. It does NOT touch students, scores, experience logs or progress.
 *
 *   node --env-file=.env scripts/gap/load-morzine-2027.mjs [--dry-run]
 *
 * Dates are derived from the cohort's own starts_on rather than transcribed,
 * so the timetable is internally consistent by construction. The reissued
 * planner (2026-09-20) agrees with it week for week.
 *
 * The planner records each exam as a single cell on its opening day. The real
 * blocks, confirmed by David, are Level 1 Mon–Thu of week 2 and Level 2 across
 * two blocks: Tue–Fri of week 5 and Mon–Thu of week 6. Those are expanded
 * below, which is what fills the days the planner left blank.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const SLUG = 'morzine-2027';
const dryRun = process.argv.includes('--dry-run');
const db = createClient(url, key, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Links. UTM parameters stripped — these are read in a portal, not clicked
// from a campaign, and the tracking would misattribute the traffic.
//
// Three URLs in the email sequence are NOT here because they 404 since the
// Squarespace retirement: /gap-avoriaz, /gap-faq/2024/3/9/what-do-i-pack and
// /blog/2023/6/23/ski-fit-by-rachael. The live emails still point at them.
// ---------------------------------------------------------------------------

const L = {
  onboarding: 'https://share-eu1.hsforms.com/1dv43JwQ8TI-VN4R219eqsQ2e55qw',
  whatsapp: 'https://chat.whatsapp.com/CkewQsvuUBFDct8I1L4TEl',
  calendar:
    'https://calendar.google.com/calendar/embed?src=c_6d851197d5f7ced0d1c71eaa0042ecfbe202f25cec207ea2ed5e2fbb9e8cc0a3%40group.calendar.google.com&ctz=Europe%2FParis',
  fluidLines: 'https://www.fluid-lines.co.uk/product-category/ski/peak-snowsports/',
  gearOrderForm: 'https://forms.gle/Aja88Y8Pqx3Q1FZy5',
  basi: 'https://www.basi.org.uk/',
  basiJobs: 'https://basi.org.uk/jobs',
  isia: 'https://isia.ski/',
  bodyMechanics: 'https://thebodymechanics.co.uk/',
  fitSecret: 'https://www.youtube.com/watch?v=0srFFOlO2vU',
  fitAnkles: 'https://www.youtube.com/watch?v=WmmsBL3oYFc',
  fitHips: 'https://www.youtube.com/watch?v=iOjHzlvwgU4',
  fitGuide: 'https://www.youtube.com/watch?v=kZyycdq19LA',
  solutions4feet: 'https://www.solutions4feet.com/about-us',
  profeet: 'https://profeet.co.uk/',
  genevaT1: 'https://www.gva.ch/en/Site/Passagers/Acces-Transports/Plan-du-Terminal-1',
  liftPass: 'https://www.skipass-avoriaz.com/en/',
  youtube: 'https://www.youtube.com/channel/UC0TNo8KEVkGePmbiQiZUXYg',
  prodainsMap:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Telecabine des Prodains, Morzine'),
  basecampMap:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('1787 Rte de la Plagne, 74110 Morzine'),
};

const EMERGENCY = '+33 6 10 61 85 58';
const OFFICE_PHONE = '+44 1483 616 522';

// ---------------------------------------------------------------------------
// Programme
//
// [week, weekday, time, title, kind, extras] — weekday 0 = Sunday, matching
// the planner's own columns. Blank cells in the planner are left blank here:
// inventing sessions to fill them would be worse than showing the gap.
// ---------------------------------------------------------------------------

/**
 * Where the on-snow day starts. Students live in Morzine and train in Avoriaz,
 * so the morning begins at the Prodains gondola and the session itself starts
 * from Spot Café at the top.
 */
const MORNING_MEET = 'Prodains gondola, Morzine, 08:50. We ride up together and start from Spot Café, Avoriaz.';

const ARRIVAL_BRIEF = [
  '13:00–14:00 Airport meet, Geneva Terminal 1 arrivals, by the lime green Tekoe tea shop.',
  '16:00–17:00 Check in and admin: week 1 schedule, portal walkthrough, equipment and merch hand out.',
  '17:00–18:00 Resort orientation walk around Morzine.',
  '18:00–19:00 Free time to settle in and check over your equipment.',
  '19:00 Team dinner.',
].join('\n');

const PROGRAMME = [
  // ── Week 1 ────────────────────────────────────────────────────────────────
  [1, 0, '13:00', 'Geneva airport meet', 'travel', {
    meeting_point: 'Geneva Terminal 1 arrivals, by the lime green Tekoe tea shop',
    map_url: L.genevaT1,
    objective: 'Be landed and at the meeting point by 13:00 for a 14:00 departure.',
    preparation: 'Message the WhatsApp group when you land, and straight away if you are delayed.',
    ends_at: '14:00',
  }],
  [1, 0, '15:00', 'Arrivals and check-in', 'travel', {
    meeting_point: 'Peak Basecamp, 1787 Rte de la Plagne, 74110 Morzine',
    map_url: L.basecampMap,
    objective: 'Check in, collect your equipment and merch, and walk the resort.',
    bring: 'Passport, insurance documents, boots',
    preparation: ARRIVAL_BRIEF,
  }],
  [1, 0, '18:00', 'Welcome dinner', 'off_snow', {
    objective: 'Meet the team and the rest of the cohort.',
  }],
  [1, 1, '09:00', 'Resort orientation, equipment check and course overview', 'off_snow', {
    objective: 'How the six weeks work, and making sure your kit is right before you ski on it.',
    bring: 'All your ski equipment',
    workbook_module: 'Module 1: Personal goals and starting benchmark',
  }],
  [1, 1, '15:00', 'Workshops: equipment and resort', 'off_snow', {
    objective: 'Equipment workshop and the local area briefing.',
  }],
  ...[2, 3, 4, 5].flatMap((d) => [
    [1, d, '09:00', 'Training', 'on_snow', {}],
    [1, d, '15:00', 'Training', 'on_snow', {}],
  ]),
  [1, 6, '09:00', 'Shadowing', 'on_snow', {
    objective: 'First shadowing session. Log it the same day.',
    preparation: 'Read the experience log fields before you go so you know what to note.',
  }],
  [1, 6, '15:00', 'Physical training', 'off_snow', {}],
  [1, 6, '18:00', 'Team social', 'off_snow', {}],

  // ── Week 2 ────────────────────────────────────────────────────────────────
  [2, 0, '09:00', 'Rest day', 'rest', {}],
  ...[1, 2, 3, 4].map((d, i) => [2, d, '09:00', 'BASI Level 1 exam', 'assessment', {
    objective: `Level 1 assessment, day ${i + 1} of 4.`,
    preparation: i === 0
      ? 'Level 1 student workbook completed. Kit checked the night before.'
      : null,
    workbook_module: i === 0 ? 'Module 2: The fundamental elements' : null,
  }]),
  [2, 5, '09:00', 'Training', 'on_snow', {}],
  [2, 5, '15:00', 'Training', 'on_snow', {}],
  [2, 6, '09:00', 'Rest day', 'rest', {}],
  [2, 6, '15:00', 'Physical training', 'off_snow', {}],
  [2, 6, '18:00', 'Team social', 'off_snow', {}],

  // ── Week 3 ────────────────────────────────────────────────────────────────
  [3, 0, '09:00', 'Outdoor first aid assessment', 'assessment', {
    meeting_point: 'Avoriaz tourist office, meeting room',
    objective: 'Outdoor first aid course assessment.',
  }],
  ...[1, 2, 3, 4].flatMap((d) => [
    [3, d, '09:00', 'Training', 'on_snow', {}],
    [3, d, '15:00', 'Training', 'on_snow', {}],
  ]),
  [3, 5, '09:00', 'Shadowing', 'on_snow', {}],
  [3, 5, '15:00', 'Shadowing', 'on_snow', {}],
  [3, 6, '09:00', 'Shadowing', 'on_snow', {}],
  [3, 6, '15:00', 'Physical training', 'off_snow', {}],

  // ── Week 4 ────────────────────────────────────────────────────────────────
  [4, 0, '09:00', 'Workshops: strands, fundamental elements and TIED', 'off_snow', {
    objective: 'The technical framework you are assessed against.',
    workbook_module: 'Module 2: The fundamental elements',
  }],
  [4, 0, '15:00', 'Workshops: avalanche and environment', 'off_snow', {
    objective: 'Avalanche awareness and transceiver use, plus mountain environment.',
    workbook_module: 'Module 7: Safety and mountain awareness',
  }],
  ...[1, 2, 3, 4, 5].flatMap((d) => [
    [4, d, '09:00', 'Training', 'on_snow', {}],
    [4, d, '15:00', 'Training', 'on_snow', {}],
  ]),
  [4, 6, '09:00', 'Shadowing', 'on_snow', {}],
  [4, 6, '15:00', 'Physical training', 'off_snow', {}],

  // ── Week 5 ────────────────────────────────────────────────────────────────
  [5, 0, '09:00', 'Outdoor first aid assessment', 'assessment', {
    meeting_point: 'Palais des Sports, Avoriaz',
  }],
  [5, 0, '15:00', 'Outdoor first aid assessment', 'assessment', {
    meeting_point: 'Palais des Sports, Avoriaz',
  }],
  [5, 1, '09:00', 'Training', 'on_snow', {}],
  [5, 1, '15:00', 'Training', 'on_snow', {}],
  ...[2, 3, 4, 5].map((d, i) => [5, d, '09:00', 'BASI Level 2 exam', 'assessment', {
    objective: `Level 2 assessment, first block, day ${i + 1} of 4.`,
    preparation: i === 0
      ? 'Level 2 workbook complete. Everything you have been working on all course.'
      : null,
  }]),
  [5, 6, '09:00', 'Rest day', 'rest', {}],

  // ── Week 6 ────────────────────────────────────────────────────────────────
  [6, 0, '09:00', 'Rest day', 'rest', {}],
  [6, 0, '15:00', 'Physical training', 'off_snow', {}],
  ...[1, 2, 3, 4].map((d, i) => [6, d, '09:00', 'BASI Level 2 exam', 'assessment', {
    objective: `Level 2 assessment, second block, day ${i + 1} of 4.`,
  }]),
  [6, 4, '18:00', 'End-of-course party', 'off_snow', {}],
  [6, 5, '09:00', 'Departures', 'travel', {
    objective: 'Course ends. Rooms cleared, kit returned.',
  }],
];

// ---------------------------------------------------------------------------
// Learning hub. Workshop hours are from the planner's own summary table.
// ---------------------------------------------------------------------------

const RESOURCES = [
  // The two documents students are assessed against. Everything on the My
  // progress page comes out of these.
  [null, 'BASI workbooks', 'Level 1 ski student workbook', 'template', null,
    'The assessment criteria for Level 1, plus the exercises to work through during the course.',
    'morzine-2027/workbooks/basi-level-1-ski-student-workbook.pdf'],
  [null, 'BASI workbooks', 'Level 2 ski student workbook', 'template', null,
    'Level 2 criteria, the Teaching Session Planner, the TIED performance-analysis model and the Performance Indicators and Actions.',
    'morzine-2027/workbooks/basi-level-2-ski-student-workbook.pdf'],
  [null, 'BASI workbooks', 'Six-week course calendar', 'link', L.calendar,
    'The live Google Calendar. The Programme page here is the same information.'],

  [null, 'Getting ski fit', 'The secret to ski fitness', 'video', L.fitSecret,
    'From the Body Mechanics mini-series. Do these before you travel.'],
  [null, 'Getting ski fit', 'Use your ankles', 'video', L.fitAnkles, null],
  [null, 'Getting ski fit', "Hips don't lie", 'video', L.fitHips, null],
  [null, 'Getting ski fit', 'Essential guide to ski fitness', 'video', L.fitGuide, null],
  [null, 'Getting ski fit', 'The Body Mechanics', 'link', L.bodyMechanics,
    'Our partner for the fitness series.'],

  [null, 'BASI', 'BASI', 'link', L.basi,
    'The governing body. You finish the course a full Level 2 member.'],
  [null, 'BASI', 'BASI Jobs', 'link', L.basiJobs, 'Members-only job board.'],
  [null, 'BASI', 'ISIA', 'link', L.isia,
    'The international body BASI belongs to, and why the qualification travels.'],

  [null, 'Equipment', 'Fluid Lines, Peak discount', 'link', L.fluidLines,
    'Head and Dynastar at the Peak rate. Password: Peaksnowsports'],
  [null, 'Equipment', 'Gear order form', 'template', L.gearOrderForm,
    'For kit you want us to order on your behalf.'],
  [null, 'Equipment', 'Solutions for Feet, Bicester', 'link', L.solutions4feet, 'Boot fitter.'],
  [null, 'Equipment', 'Profeet, West London', 'link', L.profeet, 'Boot fitter.'],

  // The workshop decks themselves, hosted in the private gap-resources bucket
  // and reached through /gap/resource/[id]. These replace nine entries that all
  // pointed at one Notion page; the hours come from the planner's summary
  // table, and the weeks from where the programme actually delivers them.
  [1, 'Workshops', 'Equipment (1h)', 'slides', null,
    'Skis, bindings, boots, poles and layers: what to choose and why.',
    'morzine-2027/workshops/gap-workshop-equipment.pdf'],
  [1, 'Workshops', 'Local area (1h)', 'slides', null,
    'Customs, traditions and getting your bearings in the Portes du Soleil.',
    'morzine-2027/workshops/gap-workshop-local-area.pdf'],
  [4, 'Workshops', 'Teaching: central theme, TIED and skill acquisition (2h)', 'slides', null,
    'What a Level 2 teacher is expected to produce, the central theme, the TIED loop and the three skills.',
    'morzine-2027/workshops/gap-workshop-teaching.pdf'],
  [4, 'Workshops', 'Avalanche awareness (2h)', 'slides', null,
    'The four ingredients, the five red flags, the EU rating scale, rescue kit and burial times. Read this one before the session.',
    'morzine-2027/workshops/gap-workshop-avalanche.pdf'],
  [null, 'Workshops', 'Ski fit', 'slides', null,
    'The physical side. Pairs with the Body Mechanics videos below.',
    'morzine-2027/workshops/gap-workshop-ski-fit.pdf'],
  [null, 'Workshops', 'Career: what comes after Level 2 (1h)', 'slides', null,
    'Partner ski schools, Swiss resorts, southern-hemisphere seasons, and what schools look for.',
    'morzine-2027/workshops/gap-workshop-career.pdf'],

  [null, 'Peak', 'Peak Snowsports on YouTube', 'video', L.youtube, null],
];

// ---------------------------------------------------------------------------
// Resort guide — Avoriaz
// ---------------------------------------------------------------------------

const GUIDE = [
  ['Accommodation', 'Peak Basecamp', 'Where the cohort lives for the six weeks. Our own chalet, new for 26/27. The whole course under one roof, coaches included. Washing machines on site.',
    '1787 Rte de la Plagne, 74110 Morzine', L.basecampMap, null, null],
  ['Getting to Avoriaz', 'Prodains gondola', 'How you get up the hill. On-snow mornings we meet here at 08:50 and ride up together, then start the session from Spot Café at the top.',
    'Téléphérique des Prodains, Morzine', L.prodainsMap, null, 'Meet 08:50 on training days'],
  ['Getting to Avoriaz', 'Free ski bus', 'The Morzine ski bus runs to Prodains and is free. It is the normal way up and down, so you do not need a car and you do not need to pay.',
    null, null, null, null],
  ['Course venues', 'Spot Café, Avoriaz', 'Where on-snow sessions start once everyone is up the hill.',
    'Avoriaz', null, null, null],
  ['Getting here', 'Geneva Airport, Terminal 1', 'Airport meet is by the lime green Tekoe tea shop in the arrivals hall. Free wifi: connect to "Free Wifi GVA", enter your mobile number, use the code texted to you (120 minutes).',
    'Geneva Airport', L.genevaT1, null, null],
  ['Getting here', 'Geneva train station shops', 'Follow signs to "Gare CFF" from arrivals. Left luggage, Migros supermarket, restaurants.',
    null, null, null, null],
  ['Course venues', 'Avoriaz tourist office', 'Meeting room used for the first aid assessment in week 3.',
    'Avoriaz', null, null, null],
  ['Course venues', 'Palais des Sports', 'First aid assessment in week 5. Also has the swimming pool.',
    'Avoriaz', null, null, null],
  ['Lift pass', 'Avoriaz lift pass', 'Portes du Soleil pass. Bring a passport photo.',
    null, L.liftPass, null, null],
  ['Recovery', 'Avoriaz swimming pool', 'At the Palais des Sports. Worth using on a rest day.',
    'Avoriaz', null, null, null],
  ['Emergency', 'Peak emergency line', 'The number to call first, any hour.',
    null, null, EMERGENCY, '24/7'],
  ['Emergency', 'European emergency number', 'Works from any phone, any network, with no credit and no SIM.',
    null, null, '112', '24/7'],
];

// ---------------------------------------------------------------------------
// Course essentials
// ---------------------------------------------------------------------------

const ESSENTIALS = [
  ['Emergency', 'If someone is injured on the hill',
    'Stop. Make the scene safe: cross skis uphill of the casualty. Call the piste rescue number for the sector and give the piste name and the nearest marker number. Then call your coach.\n\nDo not move anyone with a suspected head, neck or back injury.\n\nPeak emergency line: ' + EMERGENCY + '\nEuropean emergency number: 112', true],
  ['Emergency', 'Peak emergency contact',
    EMERGENCY + '\n\nThis is the number to call first, any hour. It is also the WhatsApp number for the course.', true],
  ['Emergency', 'If you are worried about someone',
    'Tell a coach the same day. You do not need to be sure, and you will not be getting anyone into trouble.\n\nIf it is about a coach, use the confidential option on the Feedback page. The Peak office reads it and your coaches do not.', true],

  ['Contacts', 'The Peak office',
    'bonjour@peaksnowsports.com\n' + OFFICE_PHONE + '\n\nPEAK Snowsports France, 440 Route du Pre, Montriond, Morzine 74110'],
  ['Contacts', 'The course WhatsApp group',
    'Day-to-day comms run through WhatsApp: schedule changes, weather calls, where to meet.\n\nJoin: ' + L.whatsapp + '\n\nIf the link will not work for you, ask and we will add you manually.'],

  ['Before you arrive', 'Student onboarding form',
    'Complete this first. It is how we get your details on file.\n\n' + L.onboarding],
  ['Before you arrive', 'Get to know this portal',
    'This is the course handbook now. Programme, workbook, resort guide, essentials and your benchmark are all here, and it is kept up to date during the course in a way a document never was.\n\nThe two pages to look at before you travel are Checklist and My progress.'],
  ['Before you arrive', 'Getting ski fit',
    'We have partnered with The Body Mechanics on a short series of tests and exercises. Do the tests, find your weak link, work on it before you travel. Everything is on the Learning hub page.'],

  ['Arrival day', 'How the first day runs',
    ARRIVAL_BRIEF + '\n\nNotify us when you land, and straight away if you are delayed. Message the WhatsApp group or call ' + EMERGENCY + '.'],
  ['Arrival day', 'Where you are staying',
    'Peak Basecamp, 1787 Rte de la Plagne, 74110 Morzine. Our own chalet, new for the 26/27 season. The whole course lives there together, coaches included. You train up in Avoriaz and come home to Morzine.\n\nWashing machines on site, so pack about two weeks of casual clothes rather than six. No cooking equipment needed.'],

  ['Assessment', 'How readiness is judged',
    'Your coaches assess you against the criteria on the My progress page, on a six-point acquisition scale. Readiness tells you how much of the assessment criteria you are currently showing. It is a coaching indicator, not a prediction, and not a guarantee of passing.'],
  ['Assessment', 'What do I need to pass?',
    'Trust the training and attend every session. The curriculum is built to get you above the BASI standard for both levels. Most of passing is showing up and putting the work in.'],
  ['Assessment', 'What if I fail an assessment?',
    'Rare. If it is Level 1, we arrange a reassessment inside your six weeks. If it is Level 2, you rebook with BASI directly, within two years. Either way we keep coaching you.'],
  ['Assessment', 'Experience hours',
    'Shadowing and assisting hours are logged in this portal and signed off by a coach. The course is built around 24 hours. Log them the same day. The detail fades fast, and unverified hours do not count.'],

  ['Practical', 'What insurance do I need?',
    'Travel cover including medical and evacuation, personal-accident cover, and equipment cover.\n\nInstructing liability comes free with your BASI membership once you qualify. It does not cover you during the course.'],
  ['Practical', 'Getting between Morzine and Avoriaz',
    'You live in Morzine and train in Avoriaz, so every training day starts with the trip up.\n\nOn-snow mornings we meet at the Prodains gondola at 08:50 and ride up together, then start the session from Spot Café at the top. The Morzine ski bus to Prodains is free, so there is no car needed and nothing to pay.\n\nThe first aid assessments and some workshops are at Avoriaz venues: the tourist office in week 3, the Palais des Sports in week 5.'],
  ['Practical', 'Laundry, cooking and kit',
    'You have access to washing machines, so pack about two weeks of casual clothes rather than six.\n\nNo cooking equipment is needed. A fondue set and raclette equipment are available free of charge.'],
  ['Practical', 'Avalanche equipment',
    'You will not need your own avalanche kit unless you plan to ski off-piste independently. There is an avalanche workshop in week 4 where you are trained on the equipment.'],
  ['Practical', 'Helmets',
    'Compulsory. Not a recommendation. You will not be able to train without one.'],
  ['Practical', 'Lift pass',
    'Collected on arrival. Bring a passport photo.\n\n' + L.liftPass],
  ['Practical', 'Supermarkets and suncream',
    'There are supermarkets within walking distance.\n\nPALM&PINE suncream is 15% off with code PAPAP.'],
  ['After the course', 'What Level 1 and Level 2 let you do',
    'Level 1 lets you teach at UK snow centres and dry slopes.\n\nLevel 2 is the first mountain qualification, teaching on marked pistes across the Alps for recognised ski schools.'],
  ['After the course', 'Work',
    'Our Champéry partner school interviews during the course and takes BASI Level 2s directly. The winter intake finishes just before February half-term, so you can be earning immediately.\n\nSwitzerland, New Zealand, the USA, Italy and Andorra all have country-specific routes and work permits, all covered in the on-course career workshops.\n\nBASI Jobs: ' + L.basiJobs],
  ['After the course', 'BASI membership',
    'You finish as a full BASI Level 2 member. That brings accredited training, a professional network, globally recognised qualifications, professional liability insurance within your remit, the members area, discipline manuals and member pro deals.\n\n' + L.basi],
];

// ---------------------------------------------------------------------------
// Checklist. Packing list is verbatim from "GAP PACKING LIST .docx" — the
// wording is David's and the brand detail (merino, Smart Wool, 15 litres) is
// the useful part, so it is not paraphrased.
// ---------------------------------------------------------------------------

const CHECKLIST = [
  // ── Pre-arrival ───────────────────────────────────────────────────────────
  ['Admin', 'Complete the student onboarding form', L.onboarding, true, true],
  ['Admin', 'Read the course essentials in this portal', 'Emergency procedure, insurance, what to expect', true, true],
  ['Admin', 'Download both BASI workbooks', 'Learning hub: Level 1 and Level 2', true, true],
  ['Admin', 'Join the PEAK GAP WhatsApp group', L.whatsapp, true, true],
  ['Admin', 'Send us your travel details', 'Be at Geneva Terminal 1 by 13:00 on arrival day', true, true],
  ['Admin', 'Check your insurance', 'Medical + evacuation, personal accident, equipment', true, true],
  ['Admin', 'Complete your starting self-assessment', 'On the My progress page', true, true],
  ['Equipment', 'Sort your skis, boots and poles', 'Fluid Lines for the Peak discount, password Peaksnowsports', true, true],
  ['Equipment', 'Get your boots fitted', 'Custom inner sole and shell or liner adjustments if needed', true, true],
  ['Fitness', 'Do the ski fitness tests', 'The Body Mechanics series on the Learning hub', false, true],

  // ── Packing ───────────────────────────────────────────────────────────────
  ['Ski equipment', 'Skis', null, true, false],
  ['Ski equipment', 'Boots', null, true, false],
  ['Ski equipment', 'Ski helmet', 'Compulsory', true, false],
  ['Ski equipment', 'Ski goggles, two pairs if possible', null, true, false],
  ['Ski equipment', 'Poles', 'Arm at a right angle, pole tip touching the floor', true, false],
  ['Ski equipment', 'Cable padlock for your bag or skis', null, false, false],

  ['Technical clothing', 'Ski jacket, ideally Gore-Tex', null, true, false],
  ['Technical clothing', 'Ski pants, ideally Gore-Tex', null, true, false],
  ['Technical clothing', 'Down jacket', null, true, false],
  ['Technical clothing', 'Midlayers, fleeces and gilets', 'A team hoody is included with the course', true, false],
  ['Technical clothing', 'Thermal / base layers ×2', 'Merino wool is best', true, false],
  ['Technical clothing', 'Beanies ×2', null, true, false],
  ['Technical clothing', 'Gloves or mittens ×2', null, true, false],
  ['Technical clothing', 'Neck warmer', null, true, false],
  ['Technical clothing', 'Ski socks ×5 pairs', 'Thin, not padded. Smart Wool is a great brand', true, false],
  ['Technical clothing', 'Backpack, around 15 litres', 'For spare layers, gloves, water and snacks', true, false],

  ['Casual and indoor', 'Casual clothes', 'Enough for about two weeks. Washing facilities are included', true, false],
  ['Casual and indoor', 'Warm boots with grip', 'Dr Martens, Timberlands, Sorels', true, false],
  ['Casual and indoor', 'Slippers for the accommodation', null, false, false],
  ['Casual and indoor', 'Towel', null, true, false],
  ['Casual and indoor', 'Sports and gym wear', 'There is physical training most weeks', true, false],

  ['Study', 'Laptop or tablet', 'For video analysis', true, false],
  ['Study', 'Pens and notepad', null, true, false],
  ['Study', 'Adaptors, your country to French two-pin', null, true, false],

  ['Documents', 'Passport', null, true, false],
  ['Documents', 'Insurance documents', 'A copy on your phone as well as paper', true, false],
  ['Documents', 'Passport photo', 'For the lift pass', true, false],

  ['Personal', 'Sun cream and lip protection', 'PALM&PINE is 15% off with code PAPAP', true, false],
  ['Personal', 'Toiletries and personal items', null, true, false],
  ['Personal', 'Any regular medication', 'Enough for six weeks, in its original packaging', true, false],
];

// ---------------------------------------------------------------------------

async function main() {
  if (dryRun) console.log('Dry run. Nothing will be written.\n');

  const { data: cohort, error } = await db
    .from('gap_cohorts')
    .select('id, name, starts_on, ends_on')
    .eq('slug', SLUG)
    .single();
  if (error) throw error;

  const start = new Date(`${cohort.starts_on}T00:00:00Z`);
  if (start.getUTCDay() !== 0) {
    console.warn(
      `! ${cohort.starts_on} is a ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][start.getUTCDay()]}, ` +
        'but the planner lays each week out Sunday to Saturday. Dates below assume week 1 day 0 is the start date.',
    );
  }

  /** Paris is UTC+1 in January and February — the whole course sits in CET. */
  const at = (week, weekday, hhmm) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + (week - 1) * 7 + weekday);
    return `${d.toISOString().slice(0, 10)}T${hhmm}:00+01:00`;
  };

  const activities = PROGRAMME.map(([week, day, time, title, kind, extra]) => {
    // Every morning on-snow session starts the same way, so it is a rule here
    // rather than the same two lines copied onto forty activities. An activity
    // that names its own meeting point keeps it.
    const morning = kind === 'on_snow' && time === '09:00' && !extra.meeting_point;
    const meetingPoint = extra.meeting_point ?? (morning ? MORNING_MEET : null);

    return {
    cohort_id: cohort.id,
    starts_at: at(week, day, time),
    ends_at: extra.ends_at ? at(week, day, extra.ends_at) : null,
    title,
    kind,
    // Deliberately null unless there is a real place to stand. The card falls
    // back to location when meeting_point is empty, and "Avoriaz" presented as
    // a meeting point is worse than showing nothing: it looks like an answer.
    location: meetingPoint ? 'Avoriaz' : null,
    meeting_point: meetingPoint,
    map_url: extra.map_url ?? (morning ? L.prodainsMap : null),
    coach: null,
    objective: extra.objective ?? null,
    bring: extra.bring ?? null,
    preparation: extra.preparation ?? null,
    workbook_module: extra.workbook_module ?? null,
    published: true,
    };
  });

  const resources = RESOURCES.map(
    ([week, topic, title, kind, href, description, storagePath = null], i) => ({
      cohort_id: cohort.id, week, topic, title, kind,
      url: href, storage_path: storagePath, description, sort: i,
    }),
  );

  const guide = GUIDE.map(([category, name, detail, address, map_url, phone, hours], i) => ({
    cohort_id: cohort.id, category, name, detail, address, map_url, phone, hours, sort: i,
  }));

  // sort is the entry's position within its own category, so adding one in
  // the middle of the array puts it in the middle of the page — no hand
  // numbering to drift out of step.
  const seenInCategory = new Map();
  const essentials = ESSENTIALS.map(([category, title, body, urgent = false]) => {
    const n = (seenInCategory.get(category) ?? 0) + 1;
    seenInCategory.set(category, n);
    return { cohort_id: cohort.id, category, title, body, urgent, sort: n };
  });

  const checklist = CHECKLIST.map(([section, label, note, required, pre_arrival], i) => ({
    cohort_id: cohort.id, section, label, note, required, pre_arrival, sort: i,
  }));

  console.log(`Cohort: ${cohort.name} (${cohort.starts_on} → ${cohort.ends_on})`);
  console.log(`  activities ${activities.length}`);
  console.log(`  resources  ${resources.length}`);
  console.log(`  guide      ${guide.length}`);
  console.log(`  essentials ${essentials.length}`);
  console.log(`  checklist  ${checklist.length}`);

  const last = activities[activities.length - 1];
  console.log(`  first ${activities[0].starts_at.slice(0, 16)}  last ${last.starts_at.slice(0, 16)}`);

  if (dryRun) return;

  const replace = async (table, rows) => {
    const { error: delErr } = await db.from(table).delete().eq('cohort_id', cohort.id);
    if (delErr) throw delErr;
    if (rows.length === 0) return;
    const { error: insErr } = await db.from(table).insert(rows);
    if (insErr) throw insErr;
  };

  await replace('gap_activities', activities);
  await replace('gap_resources', resources);
  await replace('gap_guide_entries', guide);
  await replace('gap_essentials', essentials);
  await replace('gap_checklist_items', checklist);

  // The planner's own summary table totals 24 shadowing hours, not the 35 the
  // first seed guessed from the brief's worked example.
  const { error: cohortErr } = await db
    .from('gap_cohorts')
    .update({ experience_target_hours: 24, assessment_on: at(5, 2, '09:00').slice(0, 10) })
    .eq('id', cohort.id);
  if (cohortErr) throw cohortErr;

  console.log('\nDone. Experience target set to 24h; assessment date set to the Level 2 exam.');
}

main().catch((e) => {
  console.error('\nFailed:', e.message ?? e);
  process.exit(1);
});
