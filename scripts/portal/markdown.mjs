/**
 * Markdown to Portable Text for the private portal dataset, shared by the
 * seeders (seed-hq.mjs for Peak HQ, seed-camps.mjs for the ski camp portal).
 *
 * Tables become a `table` object (first row is the header). Directives become
 * the richer blocks in src/sanity/schemaTypes/docBody.ts:
 *
 *   :::callout tip|rule|warning|note|action Title        ::: closes
 *   :::template Title | when to use it                    body kept as written
 *   :::script Title | when to use it                      the same, for words said aloud
 *   :::pills                                               "- item" lines
 *   :::facts                                               "- value | label" lines
 *   :::flow                                                "- title | text" lines
 *   ::image /images/path.jpg | alt text | caption         one line
 *   ::signature                                            the Peak email signature
 *
 * `toBody` pushes anything it cannot convert onto the `problems` array it is
 * given, so the caller can refuse to publish.
 */
import { markdownToPortableText } from '@portabletext/markdown';

let keySeed = 0;
const key = () => `k${(keySeed++).toString(36)}`;
export const withKeys = (value) => {
  if (Array.isArray(value)) return value.map(withKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = withKeys(v);
    if (out._type && !out._key) out._key = key();
    return out;
  }
  return value;
};

// @portabletext/markdown leaks the mark of an auto-linked email address into
// the blocks after it, pointing at a link the later block does not define.
// Drop any mark that is neither a decorator nor defined on its own block.
const DECORATORS = new Set(['strong', 'em', 'code', 'underline', 'strike-through']);
export function cleanMarks(blocks) {
  for (const b of blocks) {
    if (b._type !== 'block' || !Array.isArray(b.children)) continue;
    const defs = new Set((b.markDefs ?? []).map((d) => d._key));
    for (const c of b.children) {
      if (Array.isArray(c.marks)) c.marks = c.marks.filter((m) => DECORATORS.has(m) || defs.has(m));
    }
  }
  return blocks;
}

const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

const isSeparator = (line) => /^\|?\s*:?-{3,}/.test(line.trim()) && /^[|\s:-]+$/.test(line.trim());

function tableBlock(lines) {
  let rows = lines.filter((l) => !isSeparator(l)).map(splitRow);
  const width = Math.max(...rows.map((r) => r.length));
  rows = rows.map((r) => [...r, ...Array(width - r.length).fill('')]);
  // Drop a column of empty checkboxes ("Done | [ ]"): ticking is done elsewhere.
  const keep = [...Array(width).keys()].filter(
    (i) => !rows.slice(1).every((r) => /^\[\s?\]$/.test(r[i])),
  );
  return {
    _type: 'table',
    rows: rows.map((r) => ({ _type: 'tableRow', cells: keep.map((i) => r[i]) })),
  };
}

// Directives: richer blocks written in plain markdown.
//
//   :::callout tip|rule|warning|note|action Title        ::: closes
//   :::template Title | when to use it                    body kept as written
//   :::script Title | when to use it                      the same, for words said aloud
//   :::pills                                               "- item" lines
//   :::facts                                               "- value | label" lines
//   :::flow                                                "- title | text" lines
//   ::image /images/path.jpg | alt text | caption         one line
//   ::signature                                            the Peak email signature
const TONES = ['note', 'tip', 'rule', 'warning', 'action'];
const listLines = (body) =>
  body.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim());
const pair = (l) => {
  const i = l.indexOf('|');
  return i < 0 ? [l.trim(), ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
};

function directiveBlock(name, args, body, file, problems) {
  switch (name) {
    case 'callout': {
      const [first, ...rest] = args.split(/\s+/);
      const tone = TONES.includes(first) ? first : 'note';
      const title = (TONES.includes(first) ? rest.join(' ') : args).trim();
      return { _type: 'callout', tone, ...(title ? { title } : {}), text: body.trim() };
    }
    case 'template':
    case 'script': {
      const [title, when] = pair(args);
      return {
        _type: 'template',
        kind: name === 'script' ? 'script' : 'email',
        title,
        ...(when ? { when } : {}),
        text: body.replace(/^\n+|\s+$/g, ''),
      };
    }
    case 'pills':
      return { _type: 'pills', items: listLines(body) };
    case 'facts':
      return {
        _type: 'facts',
        items: listLines(body).map((l) => {
          const [value, label] = pair(l);
          return { _type: 'fact', value, label };
        }),
      };
    case 'flow':
      return {
        _type: 'flow',
        steps: listLines(body).map((l) => {
          const [title, text] = pair(l);
          return { _type: 'flowStep', title, ...(text ? { text } : {}) };
        }),
      };
    default:
      problems.push(`${file}: unknown block ":::${name}"`);
      return null;
  }
}

/** Markdown → Portable Text, with tables and directives lifted out as objects. */
export function toBody(md, file = '', problems = []) {
  const blocks = [];
  let prose = [];
  let table = [];
  let directive = null;
  const flushProse = () => {
    const text = prose.join('\n').trim();
    if (text) blocks.push(...cleanMarks(markdownToPortableText(text)));
    prose = [];
  };
  const flushTable = () => {
    if (table.length) blocks.push(tableBlock(table));
    table = [];
  };
  for (const line of md.split('\n')) {
    if (directive) {
      if (line.trim() === ':::') {
        const b = directiveBlock(directive.name, directive.args, directive.body.join('\n'), file, problems);
        if (b) blocks.push(b);
        directive = null;
      } else {
        directive.body.push(line);
      }
      continue;
    }
    const open = line.match(/^:::(\w+)\s*(.*)$/);
    if (open) {
      flushTable();
      flushProse();
      directive = { name: open[1], args: open[2].trim(), body: [] };
      continue;
    }
    if (line.trim() === '::signature') {
      flushTable();
      flushProse();
      blocks.push({ _type: 'signature' });
      continue;
    }
    const image = line.match(/^::image\s+(.+)$/);
    if (image) {
      flushTable();
      flushProse();
      const [src, alt = '', caption = ''] = image[1].split('|').map((x) => x.trim());
      if (!/^\/images\/[\w./ -]+\.(jpe?g|png|webp)$/i.test(src)) problems.push(`${file}: image must be a site path: ${src}`);
      blocks.push({ _type: 'siteImage', src, alt, ...(caption ? { caption } : {}) });
      continue;
    }
    if (line.trim().startsWith('|')) {
      flushProse();
      table.push(line);
    } else {
      flushTable();
      prose.push(line);
    }
  }
  flushTable();
  flushProse();
  if (directive) problems.push(`${file}: ":::${directive.name}" is never closed`);
  return blocks;
}
