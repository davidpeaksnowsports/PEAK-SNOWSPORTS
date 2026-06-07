import { defineType, defineField } from 'sanity';
import { UserIcon } from '@sanity/icons';

export const instructor = defineType({
  name: 'instructor',
  title: 'Instructor',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'role', type: 'string', title: 'Role / BASI level' }),
    defineField({
      name: 'photo',
      type: 'image',
      options: { hotspot: true },
      description: 'Same lighting / same crop convention across the team.',
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({ name: 'bio', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'qualifications', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'languages', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'specialities', type: 'array', of: [{ type: 'string' }] }),
    defineField({
      name: 'resorts',
      title: 'Resorts',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: ['Morzine', 'Châtel', 'Les Gets', 'Avoriaz', 'Verbier'],
      },
    }),
    defineField({
      name: 'order',
      type: 'number',
      title: 'Display order',
      description: 'Lower numbers appear first on the team page.',
    }),
    defineField({
      name: 'archInstructorId',
      type: 'string',
      description: 'Arch instructor ID — used for the "request this instructor" deep-link.',
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
});
