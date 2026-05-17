import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'resort',
  title: 'Resort',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'hero', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'description', type: 'array', of: [{ type: 'block' }] }),
    defineField({
      name: 'meetingPoints',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'meetingPoint',
          fields: [
            { name: 'name', type: 'string' },
            { name: 'lat', type: 'number' },
            { name: 'lng', type: 'number' },
            { name: 'notes', type: 'text', rows: 2 },
          ],
        },
      ],
    }),
    defineField({ name: 'goodFor', type: 'array', of: [{ type: 'string' }] }),
    defineField({
      name: 'relatedLessons',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'lesson' }] }],
    }),
    defineField({
      name: 'relatedInstructors',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'instructor' }] }],
    }),
    defineField({ name: 'seoTitle', type: 'string' }),
    defineField({ name: 'seoDescription', type: 'text', rows: 2 }),
  ],
});
