import type { ArrayOfType } from 'sanity';

/**
 * What a portal document body can hold, shared by every private document type:
 * `portalDoc` (instructor hub and Peak HQ) and `campDoc` (the ski camp
 * portal). One definition, so `DocBody.astro` renders all of them and a block
 * added here is available everywhere at once.
 */
export const docBodyMembers: ArrayOfType[] = [
  { type: 'block' },
  {
    // A simple grid of plain-text cells. The first row is the header.
    // Portable Text has no table of its own; the HQ booking pages are
    // mostly tables (rate card, refund bands), so they need one.
    type: 'object',
    name: 'table',
    title: 'Table',
    fields: [
      {
        name: 'rows',
        title: 'Rows',
        type: 'array',
        of: [
          {
            type: 'object',
            name: 'tableRow',
            fields: [
              { name: 'cells', title: 'Cells', type: 'array', of: [{ type: 'string' }] },
            ],
            preview: {
              select: { cells: 'cells' },
              prepare: ({ cells }) => ({ title: (cells ?? []).join(' | ') }),
            },
          },
        ],
      },
    ],
    preview: {
      select: { rows: 'rows' },
      prepare: ({ rows }) => ({
        title: 'Table',
        subtitle: `${rows?.length ?? 0} rows`,
      }),
    },
  },
  {
    // A shaded box that stands out from the text: a rule to follow, a tip,
    // a warning, or a plain note.
    type: 'object',
    name: 'callout',
    title: 'Callout',
    fields: [
      {
        name: 'tone',
        type: 'string',
        options: { list: ['note', 'tip', 'rule', 'warning', 'action'] },
        initialValue: 'note',
      },
      { name: 'title', type: 'string' },
      { name: 'text', type: 'text', rows: 4, description: '**bold** and [links](/hq) work.' },
    ],
    preview: { select: { title: 'title', subtitle: 'tone' } },
  },
  {
    type: 'object',
    name: 'pills',
    title: 'Pills',
    fields: [{ name: 'items', type: 'array', of: [{ type: 'string' }] }],
    preview: {
      select: { items: 'items' },
      prepare: ({ items }) => ({ title: 'Pills', subtitle: (items ?? []).join(' · ') }),
    },
  },
  {
    // An email or message to adapt and send. Rendered as a card with a
    // copy button. [Square brackets] mark what to fill in.
    type: 'object',
    name: 'template',
    title: 'Email template',
    fields: [
      { name: 'title', type: 'string' },
      {
        name: 'kind',
        type: 'string',
        options: { list: ['email', 'script'] },
        initialValue: 'email',
        description: 'An email to send, or words to say out loud.',
      },
      { name: 'when', type: 'string', title: 'When to use it' },
      { name: 'text', type: 'text', rows: 10 },
    ],
    preview: { select: { title: 'title', subtitle: 'when' } },
  },
  {
    type: 'object',
    name: 'facts',
    title: 'Key figures',
    fields: [
      {
        name: 'items',
        type: 'array',
        of: [
          {
            type: 'object',
            name: 'fact',
            fields: [
              { name: 'value', type: 'string' },
              { name: 'label', type: 'string' },
            ],
            preview: { select: { title: 'value', subtitle: 'label' } },
          },
        ],
      },
    ],
    preview: { prepare: () => ({ title: 'Key figures' }) },
  },
  {
    // A left-to-right sequence of stages, with arrows between them.
    type: 'object',
    name: 'flow',
    title: 'Flow',
    fields: [
      {
        name: 'steps',
        type: 'array',
        of: [
          {
            type: 'object',
            name: 'flowStep',
            fields: [
              { name: 'title', type: 'string' },
              { name: 'text', type: 'text', rows: 2 },
            ],
            preview: { select: { title: 'title', subtitle: 'text' } },
          },
        ],
      },
    ],
    preview: { prepare: () => ({ title: 'Flow' }) },
  },
  {
    // The Peak email signature, filled in for whoever is reading the
    // page, with a copy button. Place it where the signature belongs.
    type: 'object',
    name: 'signature',
    title: 'Email signature',
    fields: [{ name: 'note', type: 'string', title: 'Note (not shown)' }],
    preview: { prepare: () => ({ title: 'Email signature' }) },
  },
  {
    type: 'object',
    name: 'siteImage',
    title: 'Website photo',
    fields: [
      { name: 'src', type: 'string', description: 'Path of a photo on the public site, e.g. /images/gap/gap-1.jpg' },
      { name: 'alt', type: 'string' },
      { name: 'caption', type: 'string' },
    ],
    preview: { select: { title: 'caption', subtitle: 'src' } },
  },
  {
    type: 'image',
    options: { hotspot: true },
    fields: [
      { name: 'alt', title: 'Alt text', type: 'string' },
    ],
  },
];
