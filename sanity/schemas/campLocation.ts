import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'campLocation',
  title: 'Camp location',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'pricing', title: 'Pricing' },
    { name: 'accommodation', title: 'Accommodation' },
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
      name: 'area',
      type: 'string',
      description: 'Ski area / valley, e.g. "Portes du Soleil", "Four Valleys", "Espace Killy".',
      group: 'identity',
    }),
    defineField({
      name: 'shortBlurb',
      type: 'text',
      rows: 3,
      description: 'Short copy shown in the "Where you ski" card.',
      group: 'identity',
    }),
    defineField({
      name: 'facts',
      type: 'array',
      description: 'Two-stat facts on the resort card (e.g. Pistes, From Geneva).',
      group: 'identity',
      of: [
        {
          type: 'object',
          name: 'fact',
          fields: [
            { name: 'label', type: 'string', title: 'Label' },
            { name: 'value', type: 'string', title: 'Value' },
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        },
      ],
    }),
    defineField({
      name: 'pricingTbc',
      type: 'boolean',
      title: 'Pricing TBC',
      description: 'Show the "enquire" card instead of priced tiers.',
      initialValue: false,
      group: 'pricing',
    }),
    defineField({
      name: 'pricingSubtitle',
      type: 'string',
      description: 'Subtitle above the location name on the pricing card (e.g. "The Fat Fox Lodge, Montriond").',
      group: 'pricing',
    }),
    defineField({
      name: 'pricingProvisionalNote',
      type: 'string',
      title: 'Provisional-pricing note',
      description: 'Optional. When set, renders as a caveat under the priced tiers — e.g. "Accommodation being finalised — prices may change".',
      group: 'pricing',
    }),
    defineField({
      name: 'tiers',
      type: 'array',
      title: 'Price tiers',
      hidden: ({ parent }) => parent?.pricingTbc === true,
      group: 'pricing',
      of: [
        {
          type: 'object',
          name: 'tier',
          fields: [
            { name: 'name', type: 'string', title: 'Name (e.g. "Coaching only")' },
            { name: 'price', type: 'number', title: 'Price (€)' },
          ],
          preview: { select: { title: 'name', subtitle: 'price' } },
        },
      ],
    }),
    defineField({
      name: 'accommodationHeadline',
      type: 'string',
      title: 'Accommodation headline',
      description: 'Shown only on locations with a confirmed accommodation block.',
      group: 'accommodation',
    }),
    defineField({
      name: 'accommodationLogo',
      type: 'image',
      options: { hotspot: true },
      group: 'accommodation',
    }),
    defineField({
      name: 'accommodationImage',
      type: 'image',
      options: { hotspot: true },
      group: 'accommodation',
    }),
    defineField({
      name: 'accommodationBody',
      type: 'text',
      rows: 5,
      group: 'accommodation',
    }),
    defineField({
      name: 'usps',
      type: 'array',
      title: 'USP tiles',
      description: 'Three short tiles next to the accommodation image (Food / Rooms / Hosts, etc.).',
      group: 'accommodation',
      of: [
        {
          type: 'object',
          name: 'usp',
          fields: [
            { name: 'label', type: 'string', title: 'Label' },
            { name: 'body', type: 'text', rows: 2, title: 'Body' },
          ],
          preview: { select: { title: 'label', subtitle: 'body' } },
        },
      ],
    }),
  ],
  preview: {
    select: { name: 'name', area: 'area', tbc: 'pricingTbc' },
    prepare({ name, area, tbc }) {
      return {
        title: name,
        subtitle: [area, tbc ? 'Pricing TBC' : null].filter(Boolean).join(' · '),
      };
    },
  },
});
