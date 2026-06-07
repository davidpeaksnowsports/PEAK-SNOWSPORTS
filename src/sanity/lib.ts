import { sanityClient } from 'sanity:client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { defineQuery } from 'groq';

// ─── Image URL builder ────────────────────────────────────────────────────────

const builder = imageUrlBuilder(sanityClient);
export const urlFor = (source: SanityImageSource) => builder.image(source);

// ─── Queries ──────────────────────────────────────────────────────────────────

export const JOURNAL_LIST = defineQuery(
  `*[_type == "post" && defined(slug.current)]
    | order(publishedAt desc){
      _id, title, "slug": slug.current, excerpt, publishedAt, category,
      hero, "author": author->{ name, role, "slug": slug.current }
    }`
);

export const JOURNAL_BY_SLUG = defineQuery(
  `*[_type == "post" && slug.current == $slug][0]{
    title, publishedAt, excerpt, category, body, hero,
    "author": author->{ name, role, photo, "slug": slug.current }
  }`
);

export const INSTRUCTORS = defineQuery(
  `*[_type == "instructor"] | order(order asc){
    _id, name, "slug": slug.current, role, photo, bio,
    qualifications, languages, specialities, resorts, order
  }`
);

export const INSTRUCTOR_BY_SLUG = defineQuery(
  `*[_type == "instructor" && slug.current == $slug][0]{
    name, role, photo, bio, qualifications, languages, specialities, resorts, archInstructorId
  }`
);

export const ACCOMMODATION_LIST = defineQuery(
  `*[_type == "accommodation"] | order(order asc){
    _id, name, "slug": slug.current, tagline, style, locations, photo, enquiryNote, order
  }`
);

export const ACCOMMODATION_BY_SLUG = defineQuery(
  `*[_type == "accommodation" && slug.current == $slug][0]{
    name, tagline, style, locations, photo, body, enquiryNote
  }`
);

export const TESTIMONIALS = defineQuery(
  `*[_type == "testimonial"]{
    _id, quote, clientName, lessonType, rating, "resort": resort->name
  }`
);

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export const getJournalPosts = () => sanityClient.fetch(JOURNAL_LIST);
export const getJournalPost = (slug: string) =>
  sanityClient.fetch(JOURNAL_BY_SLUG, { slug });

export const getInstructors = () => sanityClient.fetch(INSTRUCTORS);
export const getInstructor = (slug: string) =>
  sanityClient.fetch(INSTRUCTOR_BY_SLUG, { slug });

export const getAccommodation = () => sanityClient.fetch(ACCOMMODATION_LIST);
export const getAccommodationBySlug = (slug: string) =>
  sanityClient.fetch(ACCOMMODATION_BY_SLUG, { slug });

export const getTestimonials = () => sanityClient.fetch(TESTIMONIALS);
