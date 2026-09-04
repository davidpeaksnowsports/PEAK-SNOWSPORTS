import { defineField, defineType } from 'sanity';

/**
 * A document in the instructor portal.
 *
 * Lives ONLY in the private portal dataset — never in `production`, whose reads
 * are public and unauthenticated. Safeguarding procedures, pay rates and the
 * code of conduct must not be fetchable by anyone holding the project ID.
 *
 * `tier` is the access control. It is enforced in the GROQ query rather than in
 * the page, so a document an instructor may not read never leaves Sanity.
 */
export const portalDoc = defineType({
  name: 'portalDoc',
  title: 'Portal document',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'section',
      title: 'Section',
      type: 'string',
      description: 'Which area of the portal this appears under.',
      options: {
        list: [
          { title: 'Handbook', value: 'handbook' },
          { title: 'Knowledge hub', value: 'knowledge' },
          { title: 'Training & development', value: 'development' },
          { title: 'Sales & marketing', value: 'marketing' },
          { title: 'Pay & expenses', value: 'hr' },
          { title: 'Operations', value: 'ops' },
          { title: 'Ideas', value: 'ideas' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tier',
      title: 'Audience tier',
      type: 'number',
      description:
        'Who can read this. Tier 3 is never shown to an instructor — not hidden, filtered out of the query entirely.',
      options: {
        list: [
          {
            title: '1 — Versioned (referenced by the contract)',
            value: 1,
          },
          { title: '2 — Mountain standards (everyone who teaches)', value: 2 },
          { title: '3 — Employer policies (employed office staff only)', value: 3 },
        ],
        layout: 'radio',
      },
      initialValue: 2,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      description: 'One line, shown in the section index.',
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'version',
      title: 'Version',
      type: 'string',
      description:
        'Tier 1 only. The contract points at these documents, so we need to be able to say what one said on a given date. e.g. "2026.1".',
      hidden: ({ parent }) => parent?.tier !== 1,
    }),
    defineField({
      name: 'updatedAt',
      title: 'Effective from',
      type: 'datetime',
      description:
        'When this version took effect. Leave blank to use the last edit date.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower sorts first within a section. Blank sorts last.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: 'Alt text', type: 'string' },
          ],
        },
      ],
    }),
  ],
  orderings: [
    {
      title: 'Section, then order',
      name: 'sectionOrder',
      by: [
        { field: 'section', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: { title: 'title', section: 'section', tier: 'tier' },
    prepare: ({ title, section, tier }) => ({
      title,
      subtitle: `${section ?? 'no section'} · tier ${tier ?? '?'}`,
    }),
  },
});
