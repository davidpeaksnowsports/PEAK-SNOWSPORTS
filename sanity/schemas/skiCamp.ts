import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'skiCamp',
  title: 'Ski camp',
  type: 'document',
  fields: [
    defineField({
      name: 'startDate',
      type: 'date',
      validation: (r) => r.required(),
      description: 'First day of skiing (Monday). Arrival is the day before.',
    }),
    defineField({
      name: 'locations',
      type: 'array',
      validation: (r) => r.required().min(1),
      of: [{ type: 'reference', to: [{ type: 'campLocation' }] }],
    }),
    defineField({
      name: 'tag',
      type: 'string',
      description: 'Optional chip on the schedule row (e.g. "New date").',
    }),
    defineField({
      name: 'confirmed',
      type: 'boolean',
      title: 'Confirmed?',
      initialValue: false,
      description: 'Set to true once we hit minimum numbers.',
    }),
  ],
  orderings: [
    {
      title: 'Start date · ascending',
      name: 'startDateAsc',
      by: [{ field: 'startDate', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      startDate: 'startDate',
      loc0: 'locations.0.name',
      loc1: 'locations.1.name',
      tag: 'tag',
      confirmed: 'confirmed',
    },
    prepare({ startDate, loc0, loc1, tag, confirmed }) {
      const locs = [loc0, loc1].filter(Boolean).join(' + ');
      const flags = [tag, confirmed ? 'confirmed' : null].filter(Boolean).join(' · ');
      return {
        title: startDate ?? 'New camp',
        subtitle: [locs, flags].filter(Boolean).join('  ·  '),
      };
    },
  },
});
