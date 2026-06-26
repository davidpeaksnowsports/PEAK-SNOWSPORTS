import { createClient, type ClientConfig } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const config: ClientConfig = {
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: import.meta.env.PUBLIC_SANITY_API_VERSION ?? '2024-10-01',
  useCdn: true,
};

export const sanity = createClient(config);

const builder = imageUrlBuilder(sanity);
export const urlFor = (source: SanityImageSource) => builder.image(source);

// --- GROQ queries ---------------------------------------------------------

// Ski camps page reads three things: the singleton, the schedule of camps,
// and every camp location (referenced by both pricing cards and the schedule).
export const skiCampsPageQuery = `*[_id == "skiCampsPage"][0]`;

export const skiCampsScheduleQuery = `*[_type == "skiCamp"] | order(startDate asc){
  _id,
  startDate,
  tag,
  confirmed,
  "locations": locations[]->{
    _id,
    name,
    slug,
  }
}`;

export const campLocationsQuery = `*[_type == "campLocation"] | order(name asc){
  _id,
  name,
  slug,
  area,
  shortBlurb,
  facts,
  pricingTbc,
  pricingSubtitle,
  tiers,
  accommodationHeadline,
  accommodationLogo,
  accommodationImage,
  accommodationBody,
  usps,
}`;

// Legacy / pre-existing queries (kept for forward use).
export const queries = {
  allInstructors: `*[_type == "instructor"] | order(name asc){ _id, name, slug, photo, resorts[]-> }`,
  allResorts: `*[_type == "resort"] | order(name asc){ _id, name, slug, hero }`,
  allPosts: `*[_type == "post"] | order(publishedAt desc){ _id, title, slug, hero, publishedAt, author->, category }`,
  postBySlug: `*[_type == "post" && slug.current == $slug][0]{ ..., author-> }`,
};
