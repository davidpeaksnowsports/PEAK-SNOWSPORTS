import { defineField, defineType } from 'sanity';
import { docBodyMembers } from './docBody';

/**
 * A page in the ski camp portal (/camps), for skiers booked on a camp.
 *
 * Lives ONLY in the private portal dataset, like portalDoc. It is a separate
 * type rather than a third placement on portalDoc on purpose: campers are
 * paying clients, not team, and portalDoc carries policies and pay rates. The
 * camp portal queries campDoc and campVideo by type and nothing else, so no
 * Studio mistake on a portalDoc can ever put a staff document in front of a
 * client.
 *
 * Camp dates and venues are NOT here: they come from the public `skiCamp` and
 * `campLocation` documents that /ski-camps already uses, so a date is changed
 * once. Venue pages here carry only what a booked skier needs on top of that:
 * meeting points, arrival, the first morning.
 */

export const CAMP_SECTIONS = [
  { title: 'Knowledge hub', value: 'knowledge' },
  { title: 'Ski system', value: 'ski-system' },
  { title: 'Ski fit', value: 'fitness' },
  { title: 'Dates and venues', value: 'venues' },
];

export const CAMP_LOCATIONS = [
  { title: 'Morzine-Avoriaz', value: 'morzine-avoriaz' },
  { title: "Val d'Isère", value: 'val-disere' },
  { title: 'Verbier', value: 'verbier' },
];

export const CAMP_LEVELS = [
  { title: 'Every camper', value: 'all' },
  { title: 'Intermediate', value: 'intermediate' },
  { title: 'Advanced', value: 'advanced' },
];

export const campDoc = defineType({
  name: 'campDoc',
  title: 'Ski camp page',
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
      options: { list: CAMP_SECTIONS, layout: 'radio' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Knowledge hub group',
      type: 'string',
      description: 'Groups this page on the knowledge hub.',
      options: {
        list: [
          { title: 'Before you go', value: 'before' },
          { title: 'On the camp', value: 'on-camp' },
          { title: 'Kit and equipment', value: 'kit' },
          { title: 'Mountain sense', value: 'mountain' },
        ],
      },
      hidden: ({ parent }) => parent?.section !== 'knowledge',
    }),
    defineField({
      name: 'location',
      title: 'Venue',
      type: 'string',
      description:
        'Which resort these notes are for. Matches the venue on the public ski camps page.',
      options: { list: CAMP_LOCATIONS },
      hidden: ({ parent }) => parent?.section !== 'venues',
      validation: (Rule) =>
        Rule.custom((value, { parent }) =>
          (parent as { section?: string })?.section === 'venues' && !value
            ? 'Choose the venue these notes are for.'
            : true,
        ),
    }),
    defineField({
      name: 'level',
      title: 'Who it is for',
      type: 'string',
      options: { list: CAMP_LEVELS, layout: 'radio' },
      initialValue: 'all',
    }),
    defineField({
      name: 'weeksOut',
      title: 'Weeks before camp',
      type: 'number',
      description:
        'For a block of the training plan: how many weeks before camp it starts, e.g. 8. Leave blank for a general article.',
      hidden: ({ parent }) => parent?.section !== 'fitness',
      validation: (Rule) => Rule.min(1).max(16).integer(),
    }),
    defineField({
      name: 'sessions',
      title: 'Sessions',
      type: 'array',
      description:
        'The sessions in this block. Campers tick each one off. Renaming a session keeps its ticks; deleting it removes them from view.',
      hidden: ({ parent }) => parent?.section !== 'fitness',
      of: [
        {
          type: 'object',
          name: 'fitSession',
          fields: [
            { name: 'title', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'focus', type: 'string', description: 'e.g. Legs, Core, Cardio, Mobility' },
            { name: 'duration', type: 'string', description: 'e.g. 40 min' },
            {
              name: 'detail',
              type: 'text',
              rows: 6,
              description: 'One exercise per line, e.g. "Wall sit: 3 x 45 s". **bold** works.',
            },
          ],
          preview: { select: { title: 'title', subtitle: 'focus' } },
        },
      ],
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      description: 'One line, shown on the section index.',
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'heroImage',
      title: 'Header photo',
      type: 'string',
      description:
        'Optional. A photo already on the public website, by its path, e.g. /images/og/ski-camps.jpg.',
    }),
    defineField({
      name: 'owner',
      title: 'Owner',
      type: 'string',
      description: 'Who keeps this page right. Shown on the page.',
    }),
    defineField({
      name: 'reviewedAt',
      title: 'Last reviewed',
      type: 'date',
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
      of: docBodyMembers,
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
    select: { title: 'title', section: 'section', level: 'level', location: 'location' },
    prepare: ({ title, section, level, location }) => ({
      title,
      subtitle: [section, location, level && level !== 'all' ? level : null]
        .filter(Boolean)
        .join(' · '),
    }),
  },
});

/**
 * A video in the ski camp portal's library. Hosted on YouTube (unlisted is
 * fine) or Vimeo and played in the page; nothing is uploaded here.
 */
export const campVideo = defineType({
  name: 'campVideo',
  title: 'Ski camp video',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Video link',
      type: 'url',
      description: 'A YouTube or Vimeo link. Unlisted YouTube videos work.',
      validation: (Rule) =>
        Rule.required()
          .uri({ scheme: ['https'] })
          .custom((value) =>
            !value || /(youtube\.com|youtu\.be|vimeo\.com)/i.test(value)
              ? true
              : 'Use a YouTube or Vimeo link.',
          ),
    }),
    defineField({
      name: 'category',
      type: 'string',
      options: {
        list: [
          { title: 'Ski system', value: 'ski-system' },
          { title: 'Drills', value: 'drills' },
          { title: 'Terrain', value: 'terrain' },
          { title: 'Video analysis', value: 'analysis' },
          { title: 'Ski fit', value: 'fitness' },
          { title: 'Kit', value: 'kit' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'level',
      title: 'Who it is for',
      type: 'string',
      options: { list: CAMP_LEVELS, layout: 'radio' },
      initialValue: 'all',
    }),
    defineField({
      name: 'skiSystem',
      title: 'Building block',
      type: 'reference',
      to: [{ type: 'campDoc' }],
      options: { filter: 'section == "ski-system"' },
      description: 'Optional. Also shows this video on that ski system page.',
    }),
    defineField({
      name: 'duration',
      type: 'string',
      description: 'e.g. 4:30',
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Lower sorts first within a category. Blank sorts last.',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'category' },
  },
});
