/**
 * Peak HQ documents and product reference.
 *
 * Documents come from the same private Sanity dataset as the instructor hub,
 * and the same `portalDoc` type — so a shared policy like the code of conduct
 * exists once. A document appears here when it has an `hqSection`; the
 * instructor hub uses the separate `section` field. See
 * src/sanity/schemaTypes/portalDoc.ts.
 *
 * Every tier is visible in HQ. Tier 3 (staff only) exists precisely for this
 * audience.
 */
import type { PortableTextBlock } from '@portabletext/types';
import { portalSanity } from '../portal/content';

export type HqSection =
  | 'what-we-do'
  | 'how-we-work'
  | 'playbook'
  | 'policies'
  | 'people';

export interface HqDoc {
  _id: string;
  title: string;
  slug: string;
  hqSection: HqSection;
  tier: 1 | 2 | 3;
  summary?: string;
  body?: PortableTextBlock[];
  version?: string;
  updatedAt?: string;
}

const DOC_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  hqSection,
  tier,
  summary,
  version,
  "updatedAt": coalesce(updatedAt, _updatedAt)
`;

export const isHqContentConfigured = Boolean(portalSanity);

export async function listHqDocs(section?: HqSection): Promise<HqDoc[]> {
  if (!portalSanity) return [];
  const filter = section
    ? `_type == "portalDoc" && defined(hqSection) && hqSection == $section`
    : `_type == "portalDoc" && defined(hqSection)`;
  return portalSanity.fetch(
    `*[${filter}] | order(coalesce(order, 99) asc, title asc){${DOC_FIELDS}}`,
    section ? { section } : {},
  );
}

export async function getHqDoc(slug: string): Promise<HqDoc | null> {
  if (!portalSanity) return null;
  return portalSanity.fetch(
    `*[_type == "portalDoc" && defined(hqSection) && slug.current == $slug][0]{
      ${DOC_FIELDS},
      body
    }`,
    { slug },
  );
}

export const HQ_SECTIONS: {
  key: HqSection;
  label: string;
  href: string;
  blurb: string;
}[] = [
  {
    key: 'what-we-do',
    label: 'What we do',
    href: '/hq/what-we-do',
    blurb: 'Every product, who it is for, and the page to send a client.',
  },
  {
    key: 'how-we-work',
    label: 'How we work',
    href: '/hq/how-we-work',
    blurb: 'Working principles, the office manual and how we communicate.',
  },
  {
    key: 'playbook',
    label: 'Playbook',
    href: '/hq/playbook',
    blurb: 'Enquiry to booking: phone, email templates, scripts and commission.',
  },
  {
    key: 'policies',
    label: 'Policies',
    href: '/hq/policies',
    blurb: 'Leave, working from home, conduct, safeguarding and the rest.',
  },
  {
    key: 'people',
    label: 'People',
    href: '/hq/people',
    blurb: 'Who does what, and the job descriptions behind it.',
  },
];

/**
 * What we sell, for the person answering the phone.
 *
 * Each `summary` is the product page's own meta description, taken verbatim
 * from the public site, so it is copy that has already been approved — and it
 * should be updated when that page's description changes. `href` is the page
 * to send a client; every product is booked through SkiOperator on that page.
 */
export const PRODUCTS: {
  name: string;
  summary: string;
  href: string;
}[] = [
  {
    name: 'Private lessons',
    summary:
      'One-to-one private ski lessons with a dedicated Peak instructor. Half day to a full day. All levels, all four home resorts. Request your preferred instructor by name.',
    href: '/lessons/private',
  },
  {
    name: 'Adult group lessons',
    summary:
      'Small-group adult ski lessons across Morzine, Avoriaz, Châtel and Les Gets. Seven levels from total beginner to expert. Eight max per group.',
    href: '/lessons/group',
  },
  {
    name: "Kids' groups",
    summary:
      "School-holiday kids' ski lessons across the Portes du Soleil for ages 4–12, plus GCSE PE assessment lessons. Max 6 per group, max 4 in Les P'tits (4–5 yrs). PEAK level system with medals.",
    href: '/lessons/family',
  },
  {
    name: 'Kids club',
    summary:
      'A season-long ski programme for in-resort kids (7+). Wednesday and Saturday afternoons across 30 sessions. PEAK levels, medals, all-mountain skills.',
    href: '/lessons/kids-club',
  },
  {
    name: 'Off-piste',
    summary:
      'Half-day and full-day off-piste, ski-touring and freeride clinics in Morzine, Avoriaz, Châtel and Les Gets. Avalanche safety, navigation, route planning. Up to six per instructor.',
    href: '/lessons/off-piste',
  },
  {
    name: 'Race coaching',
    summary:
      'Slalom and GS ski race coaching for kids and adults. Avoriaz weekly camps, Austria pre-season camps, Châtel FIS / Eurotest / Masters training.',
    href: '/lessons/race-coaching',
  },
  {
    name: 'Ski camps',
    summary:
      "Five-day small-group ski camps in Morzine-Avoriaz, Verbier and Val d'Isère for intermediate and advanced skiers. Coached by BASI L4 ISTD and Trainers. 8 max per group. From €699 coaching only.",
    href: '/ski-camps',
  },
  {
    name: 'GAP course',
    summary:
      'Become a ski instructor in six weeks. BASI Level 1 + 2 ski instructor course, coached by BASI Trainers, 8:1 max, winter 2027 intake in Morzine now booking. From €8,999, staged payments from €150.',
    href: '/gap-course',
  },
  {
    name: 'Accommodation',
    summary:
      'Hand-picked accommodation partners we trust. One enquiry, the right team in touch.',
    href: '/accommodation',
  },
  {
    name: 'Partner programme',
    summary:
      '10% commission on completed referred bookings, five booking channels, real coaches with real names. Partners request the 2026/27 rate card here.',
    href: '/partners',
  },
  {
    name: 'Book anything',
    summary:
      'Live availability for private lessons, kids groups, family groups, off-piste and race coaching across all four resorts. Clients hold their place with a small deposit.',
    href: '/book',
  },
];
