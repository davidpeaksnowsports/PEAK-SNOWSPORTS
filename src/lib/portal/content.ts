/**
 * Portal document store.
 *
 * Portal documents live in a SEPARATE, PRIVATE Sanity dataset — never the
 * `production` one, whose reads are public and unauthenticated. Safeguarding
 * procedures, pay rates and the code of conduct must not be fetchable by
 * anyone holding the project ID.
 *
 * They are also not in this repo: github.com/davidpeaksnowsports/PEAK-SNOWSPORTS
 * is a public repository, so a markdown content collection would publish every
 * policy to the open web.
 *
 * Required env vars (server-only, no PUBLIC_ prefix):
 *   SANITY_PORTAL_DATASET , e.g. "portal"
 *   SANITY_PORTAL_TOKEN   , a READ token scoped to that dataset
 */
import { createClient } from '@sanity/client';
import type { PortableTextBlock } from '@portabletext/types';

const projectId =
  import.meta.env.PUBLIC_SANITY_PROJECT_ID ??
  process.env.PUBLIC_SANITY_PROJECT_ID ??
  '';
const dataset =
  import.meta.env.SANITY_PORTAL_DATASET ??
  process.env.SANITY_PORTAL_DATASET ??
  '';
const token =
  import.meta.env.SANITY_PORTAL_TOKEN ?? process.env.SANITY_PORTAL_TOKEN ?? '';

export const isContentConfigured = Boolean(projectId && dataset && token);

/**
 * useCdn is false and the token is required: the CDN caches responses and we
 * never want a private document sitting in an edge cache.
 */
const client = isContentConfigured
  ? createClient({
      projectId,
      dataset,
      token,
      apiVersion: import.meta.env.PUBLIC_SANITY_API_VERSION ?? '2024-10-01',
      useCdn: false,
      perspective: 'published',
    })
  : null;

/** The seven areas of the portal. Matches the routes under /portal. */
export type PortalSection =
  | 'handbook'
  | 'knowledge'
  | 'development'
  | 'marketing'
  | 'hr'
  | 'ops'
  | 'ideas';

export interface PortalDoc {
  _id: string;
  title: string;
  slug: string;
  section: PortalSection;
  /**
   * 1 — versioned, referenced by the offline contract (code of conduct, rates)
   * 2 — mountain standards, everyone who teaches
   * 3 — employer policies, employed office staff only
   */
  tier: 1 | 2 | 3;
  summary?: string;
  body?: PortableTextBlock[];
  /** Set on tier 1 only, so we can show what a document said on a given date. */
  version?: string;
  updatedAt?: string;
  order?: number;
}

const DOC_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  section,
  tier,
  summary,
  version,
  order,
  "updatedAt": coalesce(updatedAt, _updatedAt)
`;

/**
 * Every document the given tiers may see, optionally within one section.
 * Tier filtering happens in the query rather than after it, so a document the
 * viewer may not read never reaches the server's memory, let alone the page.
 */
export async function listDocs(
  tiers: number[],
  section?: PortalSection,
): Promise<PortalDoc[]> {
  if (!client) return [];
  const filter = section
    ? `_type == "portalDoc" && tier in $tiers && section == $section`
    : `_type == "portalDoc" && tier in $tiers`;

  return client.fetch(
    `*[${filter}] | order(coalesce(order, 99) asc, title asc){${DOC_FIELDS}}`,
    section ? { tiers, section } : { tiers },
  );
}

/**
 * One document by slug, or null. Returns null — not a permission error — when
 * the tier is out of range, so a guessed URL is indistinguishable from a URL
 * that doesn't exist.
 */
export async function getDoc(
  slug: string,
  tiers: number[],
): Promise<PortalDoc | null> {
  if (!client) return null;
  return client.fetch(
    `*[_type == "portalDoc" && slug.current == $slug && tier in $tiers][0]{
      ${DOC_FIELDS},
      body
    }`,
    { slug, tiers },
  );
}

/** Section metadata used by the portal nav and the dashboard. */
export const SECTIONS: {
  key: PortalSection;
  label: string;
  href: string;
  blurb: string;
}[] = [
  {
    key: 'handbook',
    label: 'Handbook',
    href: '/portal/handbook',
    blurb: 'Mission, values, safeguarding, health and safety, and every policy.',
  },
  {
    key: 'knowledge',
    label: 'Knowledge hub',
    href: '/portal/knowledge',
    blurb: 'Teaching craft, mountain safety, the BASI pathway and carte pro.',
  },
  {
    key: 'development',
    label: 'Training',
    href: '/portal/development',
    blurb: 'Where you are, what is next, and what the team can help with.',
  },
  {
    key: 'marketing',
    label: 'Sales & marketing',
    href: '/portal/marketing',
    blurb: 'Rate card, the season plan, brand system and sharing your media.',
  },
  {
    key: 'hr',
    label: 'Pay & expenses',
    href: '/portal/hr',
    blurb: 'Rates, benefits, invoicing and what you can claim back.',
  },
  {
    key: 'ops',
    label: 'Operations',
    href: '/portal/ops',
    blurb: 'Accident and lost skier procedure, equipment, how we communicate.',
  },
  {
    key: 'ideas',
    label: 'Ideas',
    href: '/portal/ideas',
    blurb: 'Anything you think we should be doing differently.',
  },
];
