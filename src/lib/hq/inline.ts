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
