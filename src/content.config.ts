import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const categories = [
  'Resort guides',
  'Kit reviews',
  'Season updates',
  'Technique',
  'GAP stories',
  'Instructor profiles',
] as const;

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string().optional(),
    category: z.enum(categories),
    author: z.string(),
    publishedAt: z.coerce.date(),
    hero: z.string().optional(),     // path under /public, e.g. "/images/journal/hero.jpg"
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { journal };
