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

const resorts = ['Morzine', 'Chatel', 'Les Gets', 'Avoriaz', 'Verbier'] as const;

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

const resortCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resorts' }),
  schema: z.object({
    name: z.string(),
    type: z.enum(['home', 'product']),
    product: z.string().optional(),       // for type=product, e.g. "Ski camps", "GAP Course", "Race training"
    country: z.string().default('France'),
    parentArea: z.string().optional(),    // e.g. "Portes du Soleil", "Espace Killy"
    knownFor: z.string(),
    altitude: z.string().optional(),
    liftCount: z.string().optional(),
    runDistance: z.string().optional(),
    transferTime: z.string().optional(),
    meetingPoints: z.array(z.string()).optional(),
    hero: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

const accommodation = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/accommodation' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    style: z.string().optional(),         // "Luxury hosted", "Self-catered", "Mixed"
    locations: z.array(z.string()).default([]),
    photo: z.string().optional(),
    website: z.string().url().optional(),
    email: z.string().email().optional(),  // for enquiry routing
    order: z.number().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

// Careers. One markdown file per vacancy in src/content/jobs; the body is the
// job description, the frontmatter carries the terms table and the perks list
// that /join/[slug] renders around it. Set `open: false` to keep a role's page
// live (SEO, inbound links) while pulling it off the /join board.
const jobs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/jobs' }),
  schema: z.object({
    title: z.string(),
    kicker: z.string(),                    // card label: "On the mountain", "Off the mountain"
    summary: z.string(),                   // one-line blurb on the job card
    employmentType: z.string().default('Seasonal'),   // human-readable, for the terms table
    // Google JobPosting fields. `schemaEmploymentType` must use Google's enum,
    // not our prose: FULL_TIME | PART_TIME | CONTRACTOR | TEMPORARY | INTERN |
    // VOLUNTEER | PER_DIEM | OTHER. `datePosted` is required by Google;
    // `validThrough` expires the posting — once it passes, the role shows as
    // closed on /join and the JobPosting markup is dropped, which is Google's
    // recommended way to retire a listing. Bump it to keep a role live.
    schemaEmploymentType: z
      .array(z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN', 'VOLUNTEER', 'PER_DIEM', 'OTHER']))
      .default(['FULL_TIME']),
    datePosted: z.coerce.date(),
    validThrough: z.coerce.date().optional(),
    identifier: z.string().optional(),               // defaults to the slug
    locations: z.array(z.string()).default(['Morzine']),
    dates: z.string().optional(),          // "December 2026 - April 2027"
    commitment: z.string().optional(),     // minimum availability, from the contract
    hours: z.string().optional(),
    pay: z.string().optional(),
    reportsTo: z.string().optional(),
    responsibilities: z.array(z.string()).default([]),
    essentials: z.array(z.string()).default([]),
    niceToHave: z.array(z.string()).default([]),
    perks: z.array(z.string()).default([]),
    order: z.number().optional(),
    open: z.boolean().optional().default(true),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { journal, instructors, resorts: resortCollection, accommodation, jobs };
