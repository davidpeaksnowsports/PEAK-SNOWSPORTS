/**
 * Single source of truth for Peak's WhatsApp contact.
 *
 * Every WhatsApp CTA on the site must build its href through `whatsappHref()`
 * rather than hardcoding a URL. Links used to be written out by hand in each
 * page, which is how seven of them ended up as `https://wa.me/?text=...` —
 * no number in the path, so they opened a contact picker instead of a chat
 * with Peak. Changing the number is now a one-line edit here.
 *
 * Note: two WhatsApp links are authored in Sanity rather than in code (the
 * /lessons closing CTA and links inside journal post bodies). Those can't use
 * this helper, so `npm run check:whatsapp` validates the built HTML instead.
 */

/** International format, digits only — no `+`, spaces or dashes. */
export const WHATSAPP_NUMBER = '33610618558';

/** Human-readable form, for when the number is shown rather than linked. */
export const WHATSAPP_DISPLAY = '+33 6 10 61 85 58';

/**
 * Build a click-to-chat URL that opens a conversation with Peak.
 *
 * @param text Optional message to prefill in the composer. Passed as plain
 *             text — it is URL-encoded here, so don't pre-encode it.
 */
export function whatsappHref(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!text) return base;
  // encodeURIComponent leaves ' ( ) ! * unescaped — legal in a query string,
  // but they trip up naive linkifiers in email and chat clients, so escape
  // them too. Our copy is full of apostrophes ("I'd like to apply").
  const encoded = encodeURIComponent(text).replace(
    /['()!*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
  return `${base}?text=${encoded}`;
}
