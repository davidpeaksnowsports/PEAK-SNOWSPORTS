import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'hero', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'heroHeadline', type: 'string' }),
    defineField({ name: 'heroSub', type: 'text', rows: 3 }),
    defineField({
      name: 'sections',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'section',
          fields: [
            { name: 'kicker', type: 'string' },
            { name: 'title', type: 'string' },
            { name: 'body', type: 'array', of: [{ type: 'block' }] },
          ],
        },
      ],
    }),
    defineField({ name: 'seoTitle', type: 'string' }),
    defineField({ name: 'seoDescription', type: 'text', rows: 2 }),
  ],
});
