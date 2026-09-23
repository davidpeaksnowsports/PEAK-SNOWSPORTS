import { defineField, defineType } from 'sanity';

/**
 * A document in the instructor portal.
 *
 * Lives ONLY in the private portal dataset — never in `production`, whose reads
 * are public and unauthenticated. Safeguarding procedures, pay rates and the
 * code of conduct must not be fetchable by anyone holding the project ID.
 *
 * One type serves both signed-in areas, so a shared policy (the code of
 * conduct, safeguarding) exists once rather than as two copies that drift.
 * `section` places it in the instructor hub, `hqSection` in Peak HQ; either,
 * both, never neither.
 *
 * `tier` is the access control. Tier 3 is staff only, and the instructor hub's
 * GROQ query excludes it outright — the Studio validation stops it being given
 * a hub section, and the query would ignore one anyway.
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
      title: 'Instructor hub section',
      type: 'string',
      description:
        'Where this appears in the instructor hub (/portal). Leave blank to keep it out of the instructor hub entirely.',
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
      validation: (Rule) =>
        Rule.custom((value, { parent }) => {
          const doc = parent as { tier?: number; hqSection?: string } | undefined;
          // The one mistake this field must not allow: a staff-only document —
          // paid time off, working from home — published to instructors.
          if (value && doc?.tier === 3) {
            return 'Tier 3 is staff only. Clear the instructor hub section, or change the tier.';
          }
          if (!value && !doc?.hqSection) {
            return 'Choose where this appears — the instructor hub, Peak HQ, or both.';
          }
          return true;
        }),
    }),
    defineField({
      name: 'hqSection',
      title: 'Peak HQ section',
      type: 'string',
      description:
        'Where this appears in Peak HQ (/hq), the staff portal. Leave blank to keep it out of HQ.',
      options: {
        list: [
          { title: 'What we do', value: 'what-we-do' },
          { title: 'How we work', value: 'how-we-work' },
          { title: 'Playbook', value: 'playbook' },
          { title: 'Policies', value: 'policies' },
          { title: 'People', value: 'people' },
        ],
      },
    }),
    defineField({
      name: 'tier',
      title: 'Audience tier',
      type: 'number',
      description:
        'Tier 3 documents are never shown in the instructor hub — filtered out of the query, not hidden.',
      options: {
        list: [
          {
            title: '1 — Versioned (the instructor contract refers to it)',
            value: 1,
          },
          { title: '2 — Shared standard (instructors and staff)', value: 2 },
          { title: '3 — Staff only (Peak HQ)', value: 3 },
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
    select: { title: 'title', section: 'section', hq: 'hqSection', tier: 'tier' },
    prepare: ({ title, section, hq, tier }) => ({
      title,
      subtitle: [
        section ? `hub: ${section}` : null,
        hq ? `HQ: ${hq}` : null,
        `tier ${tier ?? '?'}`,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
});
