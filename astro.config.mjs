import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
//
// Pages remain static (prerendered) by default. Individual routes can opt into
// per-request server rendering with `export const prerender = false`. The
// Vercel adapter ships server routes as Vercel functions; static pages are
// served from the edge as before. See src/pages/api/booking-token.ts.
export default defineConfig({
  site: 'https://peaksnowsports.com',
  output: 'static',
  adapter: vercel(),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    react(),
  ],
  vite: {
    ssr: {
      noExternal: ['@sanity/client', '@sanity/image-url'],
    },
  },
});
