import { defineType, defineField } from 'sanity';

const categories = [
  'Resort guides',
  'Kit reviews',
  'Season updates',
  'Technique',
  'GAP stories',
  'Instructor profiles',
];

export default defineType({
  name: 'post',
  title: 'Journal post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: [{ type: 'instructor' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'category',
      type: 'string',
      options: { list: categories.map((c) => ({ title: c, value: c })) },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'hero', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'excerpt', type: 'text', rows: 2 }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }, { type: 'image' }] }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
    defineField({ name: 'seoTitle', type: 'string' }),
    defineField({ name: 'seoDescription', type: 'text', rows: 2 }),
  ],
});
