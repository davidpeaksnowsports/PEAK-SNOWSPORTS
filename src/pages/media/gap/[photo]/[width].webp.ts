/**
 * Build-time WebP variants of the portal's photography.
 *
 * Prerendered: getStaticPaths lists every photo at every width, and each one
 * is written into the deployment as a static file. At request time there is
 * nothing here to run, which is the point. See src/lib/gap/photos.ts for why
 * the portal does not use astro:assets for these.
 *
 * These are brand photographs, not course material, so being publicly
 * reachable is fine. Course files live in the private bucket instead.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import path from 'node:path';
import sharp from 'sharp';
import { GAP_PHOTOS, widthsFor, type GapPhoto } from '../../../../lib/gap/photos';

export const prerender = true;

export const getStaticPaths = (() =>
  (Object.keys(GAP_PHOTOS) as GapPhoto[]).flatMap((photo) =>
    widthsFor(photo).map((width) => ({
      params: { photo, width: String(width) },
    })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const photo = params.photo as GapPhoto;
  const source = path.join(process.cwd(), 'src/assets/images/gap', GAP_PHOTOS[photo].file);

  const body = await sharp(source)
    // Honour any EXIF orientation flag, so a portrait never ships sideways.
    .rotate()
    .resize({ width: Number(params.width), withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  // Response wants a web type; a Node Buffer is not one to the type checker.
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': 'image/webp' },
  });
};
