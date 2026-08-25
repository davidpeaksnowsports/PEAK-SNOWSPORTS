/**
 * Guard against WhatsApp links that don't reach Peak.
 *
 * `https://wa.me/?text=...` is a valid-looking URL with no number in the path,
 * so it opens a contact picker instead of a chat with us. Seven links across
 * the site were broken this way before anyone noticed. Code now builds hrefs
 * via src/lib/whatsapp.ts, but links authored in Sanity (the /lessons closing
 * CTA, journal post bodies) bypass that helper entirely — so this checks the
 * rendered HTML, which catches both sources.
 *
 * Usage: npm run check:whatsapp   (run after `npm run build`)
 */
import fs from 'node:fs';
import path from 'node:path';

const NUMBER = '33610618558';
const ROOTS = ['.vercel/output/static', 'dist/client', 'dist'];

const root = ROOTS.find((d) => fs.existsSync(d));
if (!root) {
  console.error('No build output found — run `npm run build` first.');
  process.exit(2);
}

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(root);

// Any wa.me / api.whatsapp.com / web.whatsapp.com URL, however it's written.
const LINK = /https?:\/\/(?:wa\.me|(?:api|web)\.whatsapp\.com)\/[^"'\s<>)]*/g;

const bad = [];
let total = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const url of html.match(LINK) ?? []) {
    total++;
    // Decode entities so &amp; in HTML attributes doesn't hide a phone param.
    if (!url.replace(/&amp;/g, '&').includes(NUMBER)) {
      bad.push({ page: path.relative(root, file), url });
    }
  }
}

if (bad.length) {
  console.error(`\n✗ ${bad.length} of ${total} WhatsApp links do not point at ${NUMBER}:\n`);
  for (const { page, url } of bad) console.error(`  /${page}\n    ${url}`);
  console.error(
    '\nBuild hrefs with whatsappHref() from src/lib/whatsapp.ts. If the link is\n' +
      'authored in Sanity, fix it in the Studio and rebuild.\n'
  );
  process.exit(1);
}

console.log(`✓ all ${total} WhatsApp links across ${htmlFiles.length} pages point at ${NUMBER}`);
