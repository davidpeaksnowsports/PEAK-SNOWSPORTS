import { defineType, defineField } from 'sanity';

const cta = {
  type: 'object',
  fields: [
    { name: 'label', type: 'string', title: 'Label' },
    { name: 'href', type: 'string', title: 'Link or anchor' },
  ],
} as const;

export default defineType({
  name: 'lessonsPage',
  title: 'Lessons page',
  type: 'document',
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero', default: true },
    { name: 'promoBand', title: 'Promo band' },
    { name: 'products', title: 'Products section' },
    { name: 'philosophy', title: 'Coaching philosophy' },
    { name: 'peakProgress', title: 'Peak Progress' },
    { name: 'levels', title: 'Find your level' },
    { name: 'closing', title: 'Closing CTA' },
  ],
  fields: [
    // SEO
    defineField({ name: 'seoTitle', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', type: 'text', rows: 2, group: 'seo' }),

    // Hero
    defineField({ name: 'heroKicker', type: 'string', group: 'hero' }),
    defineField({ name: 'heroHeadline', type: 'string', group: 'hero' }),
    defineField({ name: 'heroSub', type: 'text', rows: 3, group: 'hero' }),
    defineField({ name: 'heroPrimaryCta', title: 'Primary CTA', ...cta, group: 'hero' }),
    defineField({ name: 'heroSecondaryCta', title: 'Secondary CTA', ...cta, group: 'hero' }),

    // Promo band (the dark strip near the top of /lessons — kicker + body + CTA)
    defineField({
      name: 'promoEnabled',
      type: 'boolean',
      title: 'Show promo band',
      initialValue: false,
      group: 'promoBand',
    }),
    defineField({ name: 'promoKicker', type: 'string', group: 'promoBand' }),
    defineField({
      name: 'promoBody',
      type: 'text',
      rows: 2,
      title: 'Promo body',
      description: 'Use **markdown bold** for the discount code.',
      group: 'promoBand',
    }),
    defineField({ name: 'promoCta', title: 'Promo CTA', ...cta, group: 'promoBand' }),

    // Products section
    defineField({ name: 'productsKicker', type: 'string', group: 'products' }),
    defineField({ name: 'productsTitle', type: 'string', group: 'products' }),

    // Coaching philosophy
    defineField({ name: 'philosophyKicker', type: 'string', group: 'philosophy' }),
    defineField({ name: 'philosophyTitle', type: 'string', group: 'philosophy' }),
    defineField({
      name: 'philosophyParagraphs',
      type: 'array',
      of: [{ type: 'text', rows: 3 }],
      group: 'philosophy',
    }),
    defineField({
      name: 'philosophyFacts',
      type: 'array',
      group: 'philosophy',
      of: [
        {
          type: 'object',
          name: 'fact',
          fields: [
            { name: 'label', type: 'string' },
            { name: 'value', type: 'string' },
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        },
      ],
    }),

    // Peak Progress
    defineField({ name: 'peakProgressKicker', type: 'string', group: 'peakProgress' }),
    defineField({ name: 'peakProgressTitle', type: 'string', group: 'peakProgress' }),
    defineField({
      name: 'peakProgressParagraphs',
      type: 'array',
      of: [{ type: 'text', rows: 3 }],
      group: 'peakProgress',
    }),
    defineField({
      name: 'peakProgressFooter',
      type: 'string',
      description: 'Small caption under the paragraphs (e.g. "Powered by SkiOperator").',
      group: 'peakProgress',
    }),
    defineField({
      name: 'peakProgressFacts',
      type: 'array',
      title: 'Assessed criteria',
      group: 'peakProgress',
      of: [
        {
          type: 'object',
          name: 'fact',
          fields: [
            { name: 'label', type: 'string' },
            { name: 'value', type: 'string' },
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        },
      ],
    }),

    // Levels guide
    defineField({ name: 'levelsKicker', type: 'string', group: 'levels' }),
    defineField({ name: 'levelsTitle', type: 'string', group: 'levels' }),
    defineField({ name: 'levelsLead', type: 'text', rows: 3, group: 'levels' }),
    defineField({
      name: 'levels',
      type: 'array',
      group: 'levels',
      of: [
        {
          type: 'object',
          name: 'level',
          fields: [
            { name: 'label', type: 'string', title: 'Level name' },
            { name: 'self', type: 'text', rows: 2, title: "Self-description (in quotes)" },
            { name: 'skills', type: 'array', of: [{ type: 'string' }] },
            { name: 'lifts', type: 'string', title: 'Lifts handled' },
          ],
          preview: { select: { title: 'label', subtitle: 'self' } },
        },
      ],
    }),

    // Closing CTA
    defineField({ name: 'closingTitle', type: 'string', group: 'closing' }),
    defineField({ name: 'closingBody', type: 'text', rows: 3, group: 'closing' }),
    defineField({ name: 'closingPrimaryCta', title: 'Primary CTA', ...cta, group: 'closing' }),
    defineField({ name: 'closingSecondaryCta', title: 'Secondary CTA', ...cta, group: 'closing' }),
  ],
  preview: {
    select: { title: 'seoTitle', headline: 'heroHeadline' },
    prepare({ title, headline }) {
      return { title: title ?? 'Lessons page', subtitle: headline };
    },
  },
});
