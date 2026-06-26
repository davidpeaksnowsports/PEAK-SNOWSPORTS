export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function readingTime(body: string): number {
  // Strip frontmatter, code blocks, then count words. ~225 wpm reading speed.
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`\-]/g, '');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

// Extract plain text from a Portable Text block array — used for reading-time
// estimates and basic text fallbacks.
export function portableTextToPlain(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map((block: any) => {
      if (block?._type !== 'block' || !Array.isArray(block.children)) return '';
      return block.children.map((c: any) => c?.text ?? '').join('');
    })
    .filter(Boolean)
    .join('\n\n');
}

export function portableTextReadingTime(blocks: unknown): number {
  return readingTime(portableTextToPlain(blocks));
}

export function formatDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const LOREM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`;

export const LOREM_LONG = `${LOREM} Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.`;
