import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'lesson',
  title: 'Lesson',
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
    defineField({ name: 'whoItsFor', type: 'text', rows: 4 }),
    defineField({ name: 'whatsIncluded', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'duration', type: 'string', description: 'e.g. "Full day · 6 hours"' }),
    defineField({
      name: 'priceReference',
      type: 'string',
      description: 'Display-only. Actual booking happens via Arch.',
    }),
    defineField({
      name: 'archProductId',
      type: 'string',
      description: 'Arch product ID used to target the availability widget embed.',
    }),
  ],
});
