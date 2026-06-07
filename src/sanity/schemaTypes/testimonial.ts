import { defineType, defineField } from 'sanity';
import { StarIcon } from '@sanity/icons';

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({ name: 'quote', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({ name: 'clientName', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'lessonType', type: 'string' }),
    defineField({ name: 'rating', type: 'number', validation: (r) => r.min(1).max(5) }),
    defineField({
      name: 'resort',
      type: 'reference',
      to: [{ type: 'resort' }],
    }),
  ],
  preview: { select: { title: 'clientName', subtitle: 'lessonType' } },
});
