/**
 * The portal's photography, and the widths each photo is published at.
 *
 * Why this exists instead of astro:assets <Image>: the portal's pages render
 * per request, and on a per-request page <Image> emits /_image URLs that
 * Astro resizes at runtime. To do that, Astro's image endpoint downloads the
 * original over HTTP from the request's own origin, and inside a Vercel
 * function that origin is not the public site. The download fails and every
 * image 404s. It works perfectly under `astro dev`, which is the trap.
 *
 * So the resized WebP files are made at BUILD time instead, by the
 * prerendered endpoint in src/pages/media/gap/, and land in the deployment as
 * plain static files. Nothing about them depends on a runtime service, so they
 * behave the same in dev and in production.
 *
 * `width` is the source file's own width, so no variant is ever upscaled. If a
 * photo is replaced, update its width here.
 */
export const GAP_PHOTOS = {
  'group-lesson-village': { file: 'group-lesson-village.jpg', width: 1333 },
  'coach-demonstrating': { file: 'coach-demonstrating.jpg', width: 2000 },
  carving: { file: 'carving.jpg', width: 600 },
  'coach-hand-raised': { file: 'coach-hand-raised.jpg', width: 2000 },
} as const;

export type GapPhoto = keyof typeof GAP_PHOTOS;

/**
 * Candidate widths. The largest band is about 1100px wide, so 2000 covers it on
 * a retina screen; 640 covers a phone.
 */
const CANDIDATE_WIDTHS = [640, 1024, 1600, 2000];

/** Widths to publish for a photo: the candidates below its size, plus its size. */
export function widthsFor(photo: GapPhoto): number[] {
  const source = GAP_PHOTOS[photo].width;
  const widths = CANDIDATE_WIDTHS.filter((w) => w < source);
  widths.push(source);
  return widths;
}

export const photoUrl = (photo: GapPhoto, width: number) =>
  `/media/gap/${photo}/${width}.webp`;
