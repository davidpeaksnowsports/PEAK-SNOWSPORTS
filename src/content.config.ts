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

const resorts = ['Morzine', 'Chatel', 'Les Gets', 'Avoriaz'] as const;

const instructors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/instructors' }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    resorts: z.array(z.enum(resorts)).default(['Morzine']),
    languages: z.array(z.string()).default(['EN']),
    specialities: z.array(z.string()).default([]),
    qualifications: z.array(z.string()).default([]),
    photo: z.string().optional(),
    seasons: z.number().optional(),
    likes: z.string().optional(),
    dislikes: z.string().optional(),
    favouriteKit: z.string().optional(),
    topTip: z.string().optional(),
    archInstructorId: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { journal, instructors };
