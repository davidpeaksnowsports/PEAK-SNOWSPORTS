import { defineType, defineField } from 'sanity';

const cta = {
  type: 'object',
  fields: [
    { name: 'label', type: 'string', title: 'Label' },
    { name: 'href', type: 'string', title: 'Link or anchor' },
  ],
} as const;

const factTile = {
  type: 'object',
  name: 'factTile',
  fields: [
    { name: 'label', type: 'string', title: 'Label' },
    { name: 'value', type: 'string', title: 'Value' },
  ],
  preview: { select: { title: 'label', subtitle: 'value' } },
} as const;

export default defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'card', title: 'Listing card' },
    { name: 'page', title: 'Page content' },
    { name: 'product', title: 'Product details' },
  ],
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required(), group: 'identity' }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
      group: 'identity',
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Sort order on the /lessons listing (lower = earlier).',
      group: 'identity',
    }),

    // Listing card (3-column grid on /lessons)
    defineField({
      name: 'cardKicker',
      type: 'string',
      title: 'Card kicker',
      description: 'Small label above the card title — e.g. "One on one".',
      group: 'card',
    }),
    defineField({
      name: 'cardBody',
      type: 'text',
      rows: 3,
      title: 'Card body',
      group: 'card',
    }),
    defineField({
      name: 'externalHref',
      type: 'string',
      title: 'External href',
      description:
        'Optional. Set this to override the card link if the card should point somewhere other than /lessons/<slug> (e.g. /ski-camps).',
      group: 'card',
    }),

    // Page-level content (used by the individual /lessons/<slug> page)
    defineField({ name: 'seoTitle', type: 'string', group: 'page' }),
    defineField({ name: 'seoDescription', type: 'text', rows: 2, group: 'page' }),
    defineField({ name: 'heroKicker', type: 'string', group: 'page' }),
    defineField({ name: 'heroHeadline', type: 'string', group: 'page' }),
    defineField({ name: 'heroSub', type: 'text', rows: 3, group: 'page' }),
    defineField({ name: 'heroPrimaryCta', title: 'Hero primary CTA', ...cta, group: 'page' }),
    defineField({ name: 'heroSecondaryCta', title: 'Hero secondary CTA', ...cta, group: 'page' }),

    // Intro section (kicker/title + lead paragraphs + side facts grid)
    defineField({ name: 'introKicker', type: 'string', group: 'page' }),
    defineField({ name: 'introTitle', type: 'string', group: 'page' }),
    defineField({
      name: 'introBody',
      type: 'array',
      of: [{ type: 'text', rows: 3 }],
      group: 'page',
    }),
    defineField({
      name: 'introFactTiles',
      type: 'array',
      of: [factTile],
      group: 'page',
    }),

    // Generic content list section (the "What we cover" / clinic-content style)
    defineField({ name: 'contentSectionKicker', type: 'string', group: 'page' }),
    defineField({ name: 'contentSectionTitle', type: 'string', group: 'page' }),
    defineField({
      name: 'contentItems',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'page',
    }),

    // Optional secondary list (e.g. "Kit list" on off-piste)
    defineField({ name: 'kitKicker', type: 'string', group: 'page' }),
    defineField({ name: 'kitTitle', type: 'string', group: 'page' }),
    defineField({ name: 'kitBody', type: 'text', rows: 3, group: 'page' }),
    defineField({
      name: 'kitItems',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'page',
    }),

    // Booking section
    defineField({ name: 'bookingKicker', type: 'string', group: 'page' }),
    defineField({ name: 'bookingTitle', type: 'string', group: 'page' }),

    // Product details (Sanity-aware but mostly carried by archProductId)
    defineField({ name: 'hero', type: 'image', options: { hotspot: true }, group: 'product' }),
    defineField({ name: 'description', type: 'array', of: [{ type: 'block' }], group: 'product' }),
    defineField({ name: 'whoItsFor', type: 'text', rows: 4, group: 'product' }),
    defineField({ name: 'whatsIncluded', type: 'array', of: [{ type: 'string' }], group: 'product' }),
    defineField({
      name: 'duration',
      type: 'string',
      description: 'e.g. "Full day · 6 hours"',
      group: 'product',
    }),
    defineField({
      name: 'priceReference',
      type: 'string',
      description: 'Display-only. Actual booking happens via Arch.',
      group: 'product',
    }),
    defineField({
      name: 'archProductId',
      type: 'string',
      description: 'Arch product ID used to target the availability widget embed.',
      group: 'product',
    }),
  ],
  orderings: [
    { title: 'Listing order', name: 'order', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'cardKicker' },
  },
});
