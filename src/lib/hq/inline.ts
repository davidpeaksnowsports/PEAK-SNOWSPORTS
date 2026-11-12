/**
 * The smallest inline markdown a table cell needs: **bold** and links.
 *
 * Table cells are stored as plain strings (Portable Text has no table type of
 * its own), so this runs at render time. It escapes everything first, then
 * re-introduces only the two marks, so a cell can never inject markup. Links
 * are limited to site-relative paths and https URLs.
 */
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inlineMarkdown(text: string): string {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:\/|https:\/\/)[^)\s]*)\)/g, '<a href="$2">$1</a>');
}

/**
 * A few lines of text as HTML: blank lines make paragraphs, "- " lines make a
 * list, and the inline marks above apply. For callouts and similar boxes.
 */
export function richText(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length && lines.every((l) => l.startsWith('- '))) {
        return `<ul>${lines.map((l) => `<li>${inlineMarkdown(l.slice(2))}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.map(inlineMarkdown).join('<br>')}</p>`;
    })
    .join('');
}

/** A photo already on this site, by path. Anything else is refused. */
export function safeSiteImage(src?: string | null): string | null {
  return src && /^\/images\/[\w./ -]+\.(jpe?g|png|webp)$/i.test(src) ? src : null;
}
