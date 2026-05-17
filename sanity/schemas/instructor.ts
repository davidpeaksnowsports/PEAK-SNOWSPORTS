import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'instructor',
  title: 'Instructor',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: { hotspot: true },
      description: 'Same lighting / same crop convention across the team.',
    }),
    defineField({ name: 'bio', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'qualifications', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'languages', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'specialities', type: 'array', of: [{ type: 'string' }] }),
    defineField({
      name: 'resorts',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'resort' }] }],
    }),
    defineField({
      name: 'archInstructorId',
      type: 'string',
      description: 'Arch instructor ID used for the "request this instructor" deep-link.',
    }),
  ],
});
