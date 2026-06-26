import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'card', title: 'Listing card' },
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
    // Listing card (the 3-column grid on /lessons)
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
    // Product details (used by individual lesson page templates)
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
