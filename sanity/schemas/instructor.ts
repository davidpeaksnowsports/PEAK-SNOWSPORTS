import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'instructor',
  title: 'Instructor',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'profile', title: 'Profile' },
    { name: 'personal', title: 'Personal' },
    { name: 'meta', title: 'Meta' },
  ],
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required(), group: 'identity' }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
      group: 'identity',
    }),
    defineField({ name: 'role', type: 'string', description: 'e.g. "Instructor | Co-Founder"', group: 'identity' }),
    defineField({
      name: 'photo',
      type: 'image',
      options: { hotspot: true },
      description: 'Same lighting / same crop convention across the team.',
      group: 'identity',
    }),
    defineField({ name: 'bio', type: 'array', of: [{ type: 'block' }], group: 'profile' }),
    defineField({ name: 'qualifications', type: 'array', of: [{ type: 'string' }], group: 'profile' }),
    defineField({ name: 'languages', type: 'array', of: [{ type: 'string' }], group: 'profile' }),
    defineField({ name: 'specialities', type: 'array', of: [{ type: 'string' }], group: 'profile' }),
    defineField({
      name: 'resorts',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Resorts this instructor works in. Will become references once resort docs land in Phase 4.',
      group: 'profile',
    }),
    defineField({ name: 'seasons', type: 'number', description: 'Total seasons with Peak', group: 'profile' }),
    defineField({ name: 'likes', type: 'text', rows: 2, group: 'personal' }),
    defineField({ name: 'dislikes', type: 'text', rows: 2, group: 'personal' }),
    defineField({ name: 'favouriteKit', type: 'text', rows: 2, group: 'personal' }),
    defineField({ name: 'topTip', type: 'text', rows: 2, group: 'personal' }),
    defineField({
      name: 'archInstructorId',
      type: 'string',
      description: 'Arch instructor ID used for the "request this instructor" deep-link.',
      group: 'meta',
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Sort order on the team page (lower = earlier).',
      group: 'meta',
    }),
  ],
  orderings: [
    { title: 'Display order', name: 'order', by: [{ field: 'order', direction: 'asc' }] },
    { title: 'Name', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'role', media: 'photo' },
  },
});
