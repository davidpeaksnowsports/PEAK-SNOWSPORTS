import { defineType, defineField } from 'sanity';

const cta = {
  type: 'object',
  fields: [
    { name: 'label', type: 'string', title: 'Label' },
    { name: 'href', type: 'string', title: 'Link or anchor' },
  ],
} as const;

export default defineType({
  name: 'skiCampsPage',
  title: 'Ski camps page',
  type: 'document',
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero', default: true },
    { name: 'welcome', title: 'Welcome' },
    { name: 'levels', title: 'Levels' },
    { name: 'whatYouGet', title: 'What you get' },
    { name: 'accommodation', title: 'Accommodation section' },
    { name: 'whereYouSki', title: 'Where you ski' },
    { name: 'whatWeCover', title: 'What we cover' },
    { name: 'faqs', title: 'FAQs' },
    { name: 'planB', title: 'Plan B' },
    { name: 'book', title: 'Booking' },
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

    // Welcome
    defineField({ name: 'welcomeKicker', type: 'string', group: 'welcome' }),
    defineField({ name: 'welcomeTitle', type: 'string', group: 'welcome' }),
    defineField({ name: 'welcomeLead', type: 'text', rows: 2, group: 'welcome' }),
    defineField({
      name: 'welcomeBullets',
      type: 'array',
      title: 'Welcome paragraphs',
      group: 'welcome',
      of: [{ type: 'text', rows: 3 }],
    }),
    defineField({
      name: 'welcomeTiles',
      type: 'array',
      title: 'Right-column tiles',
      group: 'welcome',
      of: [
        {
          type: 'object',
          name: 'tile',
          fields: [
            { name: 'kicker', type: 'string' },
            { name: 'headline', type: 'string' },
            { name: 'body', type: 'string' },
          ],
          preview: { select: { title: 'headline', subtitle: 'kicker' } },
        },
      ],
    }),

    // Levels
    defineField({
      name: 'levels',
      type: 'array',
      group: 'levels',
      of: [
        {
          type: 'object',
          name: 'level',
          fields: [
            { name: 'name', type: 'string', title: 'Level name (e.g. "Intermediate")' },
            { name: 'forWhom', type: 'text', rows: 5, title: 'Who it\'s for' },
            { name: 'outcome', type: 'string', title: 'Outcome line' },
          ],
          preview: { select: { title: 'name', subtitle: 'outcome' } },
        },
      ],
    }),
    defineField({
      name: 'lodgingOptions',
      type: 'array',
      title: 'Three ways to join',
      group: 'levels',
      of: [{ type: 'string' }],
    }),

    // What you get
    defineField({ name: 'onSnowLabel', type: 'string', group: 'whatYouGet', initialValue: 'On snow' }),
    defineField({ name: 'onSnow', type: 'array', of: [{ type: 'string' }], group: 'whatYouGet' }),
    defineField({ name: 'offSnowLabel', type: 'string', group: 'whatYouGet', initialValue: 'Off snow (accommodation packages)' }),
    defineField({ name: 'offSnow', type: 'array', of: [{ type: 'string' }], group: 'whatYouGet' }),

    // Accommodation section
    defineField({ name: 'accommodationKicker', type: 'string', group: 'accommodation' }),
    defineField({ name: 'accommodationTitle', type: 'string', group: 'accommodation' }),
    defineField({ name: 'accommodationLead', type: 'text', rows: 3, group: 'accommodation' }),

    // Where you ski
    defineField({ name: 'whereYouSkiKicker', type: 'string', group: 'whereYouSki' }),
    defineField({ name: 'whereYouSkiTitle', type: 'string', group: 'whereYouSki' }),
    defineField({ name: 'whereYouSkiLead', type: 'text', rows: 3, group: 'whereYouSki' }),

    // What we cover
    defineField({ name: 'whatWeCoverKicker', type: 'string', group: 'whatWeCover' }),
    defineField({ name: 'whatWeCoverTitle', type: 'string', group: 'whatWeCover' }),
    defineField({
      name: 'whatWeCover',
      type: 'array',
      group: 'whatWeCover',
      of: [
        {
          type: 'object',
          name: 'topic',
          fields: [
            { name: 'title', type: 'string' },
            { name: 'body', type: 'text', rows: 3 },
          ],
          preview: { select: { title: 'title', subtitle: 'body' } },
        },
      ],
    }),

    // FAQs
    defineField({ name: 'faqsKicker', type: 'string', group: 'faqs' }),
    defineField({ name: 'faqsTitle', type: 'string', group: 'faqs' }),
    defineField({
      name: 'faqs',
      type: 'array',
      group: 'faqs',
      of: [
        {
          type: 'object',
          name: 'faq',
          fields: [
            { name: 'q', type: 'string', title: 'Question' },
            { name: 'a', type: 'text', rows: 3, title: 'Answer' },
          ],
          preview: { select: { title: 'q', subtitle: 'a' } },
        },
      ],
    }),

    // Plan B
    defineField({ name: 'planBHeadline', type: 'string', group: 'planB' }),
    defineField({ name: 'planBBody', type: 'text', rows: 4, group: 'planB' }),

    // Booking section
    defineField({ name: 'bookKicker', type: 'string', group: 'book' }),
    defineField({ name: 'bookTitle', type: 'string', group: 'book' }),
    defineField({ name: 'bookLead', type: 'text', rows: 4, group: 'book' }),
    defineField({ name: 'bookPrimaryCta', title: 'Primary CTA', ...cta, group: 'book' }),
    defineField({ name: 'bookSecondaryCta', title: 'Secondary CTA', ...cta, group: 'book' }),
    defineField({ name: 'bookDisclaimer', type: 'string', group: 'book' }),

    // Val d'Isère interim accommodation card
    defineField({
      name: 'valAccommodationCard',
      type: 'object',
      title: "Val d'Isère interim card",
      description: 'Shown below the main Fat Fox accommodation block until the Val d\'Isère provider is finalised. Remove the fields here to hide it.',
      group: 'accommodation',
      fields: [
        { name: 'kicker', type: 'string' },
        { name: 'headline', type: 'string' },
        { name: 'body', type: 'text', rows: 4 },
      ],
    }),
  ],
  preview: {
    select: { title: 'seoTitle', headline: 'heroHeadline' },
    prepare({ title, headline }) {
      return { title: title ?? 'Ski camps page', subtitle: headline };
    },
  },
});
