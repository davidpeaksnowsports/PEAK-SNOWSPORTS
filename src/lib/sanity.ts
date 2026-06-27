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

// Journal listing — every published post, newest first, with author name resolved.
export const allPostsQuery = `*[_type == "post" && defined(publishedAt)] | order(publishedAt desc){
  _id,
  title,
  "slug": slug.current,
  hero,
  excerpt,
  publishedAt,
  category,
  "author": author->{name, "slug": slug.current},
  body
}`;

// Single post by slug, plus other posts by the same author for the
// "Keep reading" footer.
export const postBySlugQuery = `{
  "post": *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    hero,
    excerpt,
    publishedAt,
    category,
    seoTitle,
    seoDescription,
    "author": author->{name, "slug": slug.current},
    body
  },
  "moreFromAuthor": *[_type == "post" && slug.current != $slug && author->slug.current == *[_type == "post" && slug.current == $slug][0].author->slug.current] | order(publishedAt desc)[0...3]{
    _id,
    title,
    "slug": slug.current,
    hero,
    publishedAt,
    category,
    "author": author->{name, "slug": slug.current},
    body
  }
}`;

// Lessons page reads the singleton + every lesson doc (for the card grid).
export const lessonsPageQuery = `*[_id == "lessonsPage"][0]`;

export const allLessonsQuery = `*[_type == "lesson"] | order(order asc, name asc){
  _id,
  name,
  "slug": slug.current,
  order,
  cardKicker,
  cardBody,
  externalHref
}`;

// Single lesson by slug for the /lessons/<slug> page templates.
export const lessonBySlugQuery = `*[_type == "lesson" && slug.current == $slug][0]{
  _id,
  name,
  "slug": slug.current,
  seoTitle,
  seoDescription,
  heroKicker,
  heroHeadline,
  heroSub,
  heroPrimaryCta,
  heroSecondaryCta,
  introKicker,
  introTitle,
  introBody,
  introFactTiles,
  contentSectionKicker,
  contentSectionTitle,
  contentItems,
  kitKicker,
  kitTitle,
  kitBody,
  kitItems,
  bookingKicker,
  bookingTitle,
  archProductId
}`;

// Resorts — list + detail, both used by /resorts and /resorts/[slug].
export const allResortsQuery = `*[_type == "resort"] | order(order asc, name asc){
  _id,
  name,
  "slug": slug.current,
  type,
  product,
  country,
  parentArea,
  knownFor,
  hero,
  order
}`;

export const resortBySlugQuery = `{
  "resort": *[_type == "resort" && slug.current == $slug][0]{
    _id,
    name,
    "slug": slug.current,
    type,
    product,
    country,
    parentArea,
    knownFor,
    hero,
    order,
    altitude,
    liftCount,
    runDistance,
    transferTime,
    meetingPoints,
    body,
    seoTitle,
    seoDescription
  },
  "siblings": *[_type == "resort" && slug.current != $slug && type == *[_type == "resort" && slug.current == $slug][0].type] | order(order asc, name asc)[0...3]{
    _id,
    name,
    "slug": slug.current,
    knownFor,
    hero
  }
}`;

// Legacy / pre-existing queries (kept for forward use).
export const queries = {
  allInstructors: `*[_type == "instructor"] | order(name asc){ _id, name, slug, photo, resorts[]-> }`,
};
