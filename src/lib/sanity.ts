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

// Query helpers, add typed GROQ queries here as schemas are wired up.
export const queries = {
  allInstructors: `*[_type == "instructor"] | order(name asc){ _id, name, slug, photo, resorts[]-> }`,
  allResorts: `*[_type == "resort"] | order(name asc){ _id, name, slug, hero }`,
  allPosts: `*[_type == "post"] | order(publishedAt desc){ _id, title, slug, hero, publishedAt, author->, category }`,
  postBySlug: `*[_type == "post" && slug.current == $slug][0]{ ..., author-> }`,
};
