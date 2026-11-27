/**
 * Ski camp portal content.
 *
 * Two sources, on purpose:
 *
 *   * Pages and videos (knowledge hub, ski system, ski fit, venue notes, the
 *     video library) are `campDoc` and `campVideo` documents in the PRIVATE
 *     portal dataset, read with the server-side token. They are for booked
 *     skiers, and this repo is public, so none of it is committed here.
 *
 *   * Camp dates and venues are the public `skiCamp` and `campLocation`
 *     documents that /ski-camps already shows. One schedule, edited once.
 *
 * Every private query below filters on `_type == "campDoc"` or
 * `_type == "campVideo"`. The dataset also holds instructor and staff
 * documents (portalDoc), and nothing in this module may ever ask for those.
 */
import type { PortableTextBlock } from '@portabletext/types';
import { portalSanity } from '../portal/content';
import { sanity } from '../sanity';
import type { CampLevel } from './supabase';

export const isCampContentConfigured = Boolean(portalSanity);

export type CampSection = 'knowledge' | 'ski-system' | 'fitness' | 'venues';
export type DocLevel = 'all' | CampLevel;

export interface FitSession {
  _key: string;
  title: string;
  focus?: string;
  duration?: string;
  detail?: string;
}

export interface CampDoc {
  _id: string;
  title: string;
  slug: string;
  section: CampSection;
  category?: string;
  location?: string;
  level?: DocLevel;
  weeksOut?: number;
  sessions?: FitSession[];
  summary?: string;
  heroImage?: string;
  owner?: string;
  reviewedAt?: string;
  updatedAt?: string;
  order?: number;
  body?: PortableTextBlock[];
}

export interface CampVideo {
  _id: string;
  title: string;
  url: string;
  category: string;
  level?: DocLevel;
  duration?: string;
  description?: string;
  skiSystem?: { title: string; slug: string } | null;
}

const DOC_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  section,
  category,
  location,
  level,
  weeksOut,
  sessions[]{ _key, title, focus, duration, detail },
  summary,
  heroImage,
  owner,
  reviewedAt,
  order,
  "updatedAt": _updatedAt
`;

const VIDEO_FIELDS = `
  _id,
  title,
  url,
  category,
  level,
  duration,
  description,
  "skiSystem": skiSystem->{ title, "slug": slug.current }
`;

export async function listCampDocs(section: CampSection): Promise<CampDoc[]> {
  if (!portalSanity) return [];
  return portalSanity.fetch(
    `*[_type == "campDoc" && section == $section && defined(slug.current)]
       | order(coalesce(order, 99) asc, title asc){${DOC_FIELDS}}`,
    { section },
  );
}

export async function getCampDoc(slug: string): Promise<CampDoc | null> {
  if (!portalSanity) return null;
  return portalSanity.fetch(
    `*[_type == "campDoc" && slug.current == $slug][0]{ ${DOC_FIELDS}, body }`,
    { slug },
  );
}

export async function listCampVideos(): Promise<CampVideo[]> {
  if (!portalSanity) return [];
  return portalSanity.fetch(
    `*[_type == "campVideo" && defined(url)]
       | order(coalesce(order, 99) asc, title asc){${VIDEO_FIELDS}}`,
  );
}

/** Videos tied to one ski system page, by that page's _id. */
export async function videosForDoc(docId: string): Promise<CampVideo[]> {
  if (!portalSanity) return [];
  return portalSanity.fetch(
    `*[_type == "campVideo" && skiSystem._ref == $docId]
       | order(coalesce(order, 99) asc, title asc){${VIDEO_FIELDS}}`,
    { docId },
  );
}

/** Is this page or video for a skier at this level? Unknown level sees all. */
export const forLevel = (item: { level?: DocLevel }, level: CampLevel | null) =>
  !level || !item.level || item.level === 'all' || item.level === level;

/* -------------------------------------------------- Public schedule ---- */

export interface CampVenue {
  _id: string;
  name: string;
  slug: string;
  area?: string;
  shortBlurb?: string;
  facts?: { label?: string; value?: string }[];
  accommodationHeadline?: string;
  accommodationBody?: string;
}

export interface ScheduledCamp {
  _id: string;
  startDate: string;
  confirmed?: boolean;
  note?: string | null;
  tag?: string | null;
  locations: { _id: string; name: string; slug: string }[];
  closedLocations: { _id: string; name: string; slug: string }[];
}

/**
 * The season's camps, from the public dataset. Read without the CDN: a camp
 * being confirmed is news a booked skier is waiting for.
 */
export async function listScheduledCamps(): Promise<ScheduledCamp[]> {
  try {
    const rows = await sanity.withConfig({ useCdn: false }).fetch(
      `*[_type == "skiCamp" && defined(startDate)] | order(startDate asc){
        _id, startDate, confirmed, note, tag,
        "locations": coalesce(locations[]->{ _id, name, "slug": slug.current }, []),
        "closedLocations": coalesce(closedLocations[]->{ _id, name, "slug": slug.current }, [])
      }`,
    );
    return rows ?? [];
  } catch (err) {
    console.error('[camps] schedule fetch failed:', (err as Error).message);
    return [];
  }
}

export async function listVenues(): Promise<CampVenue[]> {
  try {
    const rows: CampVenue[] = await sanity.fetch(
      `*[_type == "campLocation" && defined(slug.current)]{
        _id, name, "slug": slug.current, area, shortBlurb, facts,
        accommodationHeadline, accommodationBody
      }`,
    );
    const order = VENUE_ORDER;
    return (rows ?? []).sort(
      (a, b) =>
        (order.indexOf(a.slug) + 1 || 99) - (order.indexOf(b.slug) + 1 || 99),
    );
  } catch (err) {
    console.error('[camps] venues fetch failed:', (err as Error).message);
    return [];
  }
}

/** Same display order as the public /ski-camps page. */
const VENUE_ORDER = ['morzine-avoriaz', 'val-disere', 'verbier'];

/** A photo already on the site for each venue, where there is one. */
export const VENUE_PHOTO: Record<string, string> = {
  'morzine-avoriaz': '/images/resorts/avoriaz.jpg',
};
export const DEFAULT_CAMP_PHOTO = '/images/og/ski-camps.jpg';

/* --------------------------------------------------------- Navigation -- */

export const CAMP_NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: '/camps', label: 'Home', exact: true },
  { href: '/camps/knowledge', label: 'Knowledge hub' },
  { href: '/camps/ski-system', label: 'Ski system' },
  { href: '/camps/videos', label: 'Video library' },
  { href: '/camps/fitness', label: 'Ski fit' },
  { href: '/camps/dates', label: 'Dates and venues' },
];

export const SECTION_META: Record<
  CampSection,
  { label: string; href: string; blurb: string }
> = {
  knowledge: {
    label: 'Knowledge hub',
    href: '/camps/knowledge',
    blurb: 'Everything you need before, during and after the week. Kit, arrival, how the days run.',
  },
  'ski-system': {
    label: 'Ski system',
    href: '/camps/ski-system',
    blurb: 'The building blocks we coach. Learn them now and the week moves faster.',
  },
  fitness: {
    label: 'Ski fit',
    href: '/camps/fitness',
    blurb: 'A plan that builds the legs and lungs you need for five days of coaching.',
  },
  venues: {
    label: 'Dates and venues',
    href: '/camps/dates',
    blurb: 'Every camp this season, where it runs, and how to find us on the first morning.',
  },
};

export const KNOWLEDGE_GROUPS: { key: string; label: string }[] = [
  { key: 'before', label: 'Before you go' },
  { key: 'on-camp', label: 'On the camp' },
  { key: 'kit', label: 'Kit and equipment' },
  { key: 'mountain', label: 'Mountain sense' },
];

export const VIDEO_CATEGORIES: { key: string; label: string }[] = [
  { key: 'ski-system', label: 'Ski system' },
  { key: 'drills', label: 'Drills' },
  { key: 'terrain', label: 'Terrain' },
  { key: 'analysis', label: 'Video analysis' },
  { key: 'fitness', label: 'Ski fit' },
  { key: 'kit', label: 'Kit' },
];

export const LEVEL_LABEL: Record<string, string> = {
  all: 'Every camper',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
