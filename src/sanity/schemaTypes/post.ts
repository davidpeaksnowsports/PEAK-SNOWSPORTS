import { defineType, defineField } from 'sanity';
import { DocumentTextIcon } from '@sanity/icons';

const categories = [
  'Resort guides',
  'Kit reviews',
  'Season updates',
  'Technique',
  'GAP stories',
  'Instructor profiles',
];

export const post = defineType({
  name: 'post',
  title: 'Journal post',
  type: 'document',
  icon: DocumentTextIcon,
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
    defineField({ name: 'hero', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({ name: 'excerpt', type: 'text', rows: 2 }),
    defineField({
      name: 'body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true },
          fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
        },
      ],
    }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
    defineField({ name: 'seoTitle', type: 'string' }),
    defineField({ name: 'seoDescription', type: 'text', rows: 2 }),
  ],
  preview: {
    select: { title: 'title', media: 'hero', date: 'publishedAt' },
  },
});
