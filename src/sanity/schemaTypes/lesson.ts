import { defineType, defineField } from 'sanity';
import { BookIcon } from '@sanity/icons';

export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'hero', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
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
      description: 'Arch product ID — used to target the availability widget embed.',
    }),
  ],
  preview: { select: { title: 'name', media: 'hero' } },
});
