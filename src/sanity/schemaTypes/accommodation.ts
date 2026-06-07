import { defineType, defineField } from 'sanity';
import { HomeIcon } from '@sanity/icons';

export const accommodation = defineType({
  name: 'accommodation',
  title: 'Accommodation',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'tagline', type: 'string' }),
    defineField({
      name: 'style',
      type: 'string',
      description: 'e.g. "Full service", "Catered chalet", "Self-catered"',
    }),
    defineField({
      name: 'locations',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: ['Morzine', 'Châtel', 'Les Gets', 'Avoriaz'] },
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
    defineField({
      name: 'enquiryNote',
      type: 'string',
      description: 'Optional line shown next to the enquiry button',
    }),
    defineField({
      name: 'order',
      type: 'number',
      title: 'Display order',
      description: 'Lower numbers appear first',
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'tagline', media: 'photo' } },
});
