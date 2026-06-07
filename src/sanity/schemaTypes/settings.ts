import { defineType, defineField } from 'sanity';
import { CogIcon } from '@sanity/icons';

export const settings = defineType({
  name: 'settings',
  title: 'Settings',
  type: 'document',
  icon: CogIcon,
  // Singleton — only one Settings document should ever exist.
  fields: [
    defineField({ name: 'title', type: 'string', initialValue: 'Site settings' }),
    defineField({
      name: 'navLinks',
      type: 'array',
      of: [{ type: 'object', fields: [{ name: 'label', type: 'string' }, { name: 'href', type: 'string' }] }],
    }),
    defineField({
      name: 'footerLinks',
      type: 'array',
      of: [{ type: 'object', fields: [{ name: 'label', type: 'string' }, { name: 'href', type: 'string' }] }],
    }),
    defineField({
      name: 'social',
      type: 'object',
      fields: [
        { name: 'instagram', type: 'url' },
        { name: 'tiktok', type: 'url' },
        { name: 'youtube', type: 'url' },
        { name: 'facebook', type: 'url' },
      ],
    }),
    defineField({
      name: 'contact',
      type: 'object',
      fields: [
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'address', type: 'text', rows: 3 },
      ],
    }),
    defineField({
      name: 'whatsapp',
      type: 'object',
      description: 'WhatsApp deep-link URLs for each enquiry route.',
      fields: [
        { name: 'gap', type: 'url' },
        { name: 'lessons', type: 'url' },
        { name: 'partners', type: 'url' },
      ],
    }),
  ],
  preview: { select: { title: 'title' } },
});
