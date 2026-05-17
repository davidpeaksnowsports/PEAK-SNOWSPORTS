import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({ name: 'quote', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({ name: 'clientName', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'lessonType', type: 'string' }),
    defineField({
      name: 'rating',
      type: 'number',
      validation: (r) => r.min(1).max(5),
    }),
    defineField({
      name: 'resort',
      type: 'reference',
      to: [{ type: 'resort' }],
    }),
  ],
});
