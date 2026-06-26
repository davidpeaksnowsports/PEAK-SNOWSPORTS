import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'resort',
  title: 'Resort',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'stats', title: 'Stats' },
    { name: 'content', title: 'Content' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (r) => r.required(),
      group: 'identity',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
      group: 'identity',
    }),
    defineField({
      name: 'type',
      type: 'string',
      options: {
        list: [
          { title: 'Home resort (Peak operates here daily)', value: 'home' },
          { title: 'Product destination (we travel here for a specific product)', value: 'product' },
        ],
      },
      initialValue: 'home',
      validation: (r) => r.required(),
      group: 'identity',
    }),
    defineField({
      name: 'product',
      type: 'string',
      description: 'Only for type=product. e.g. "Ski camps", "GAP Course", "Race training".',
      hidden: ({ parent }) => parent?.type !== 'product',
      group: 'identity',
    }),
    defineField({
      name: 'country',
      type: 'string',
      initialValue: 'France',
      group: 'identity',
    }),
    defineField({
      name: 'parentArea',
      type: 'string',
      description: 'e.g. "Portes du Soleil", "Espace Killy", "Four Valleys".',
      group: 'identity',
    }),
    defineField({
      name: 'knownFor',
      type: 'text',
      rows: 3,
      description: 'One-line tagline shown on cards and the hero.',
      group: 'identity',
    }),
    defineField({
      name: 'hero',
      type: 'image',
      options: { hotspot: true },
      group: 'identity',
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Sort order on the /resorts listing (lower = earlier).',
      group: 'identity',
    }),

    // Stats (each renders as a pill on the resort page)
    defineField({ name: 'altitude', type: 'string', group: 'stats' }),
    defineField({ name: 'liftCount', type: 'string', group: 'stats' }),
    defineField({ name: 'runDistance', type: 'string', title: 'Pistes', group: 'stats' }),
    defineField({ name: 'transferTime', type: 'string', group: 'stats' }),
    defineField({
      name: 'meetingPoints',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Lift / lift-station names where lessons meet. Shown on home-resort pages only.',
      group: 'stats',
    }),

    // Body content
    defineField({
      name: 'body',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
      description: 'Main page body in Portable Text.',
      group: 'content',
    }),

    // SEO overrides (auto-derived on the page if blank)
    defineField({ name: 'seoTitle', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', type: 'text', rows: 2, group: 'seo' }),
  ],
  orderings: [
    { title: 'Listing order', name: 'order', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'parentArea', media: 'hero' },
  },
});
