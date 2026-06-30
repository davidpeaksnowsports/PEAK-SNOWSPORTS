import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sanity from '@sanity/astro';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
//
// Pages remain static (prerendered) by default. Individual routes can opt into
// per-request server rendering with `export const prerender = false`. The
// Vercel adapter ships server routes as Vercel functions; static pages are
// served from the edge as before. See src/pages/api/booking-token.ts.
export default defineConfig({
  site: 'https://www.peaksnowsports.com',
  output: 'static',
  adapter: vercel(),
  integrations: [
    sanity({
      projectId: process.env.PUBLIC_SANITY_PROJECT_ID ?? 'un1s8qq9',
      dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
      useCdn: false,
      studioBasePath: '/admin',
    }),
    tailwind({ applyBaseStyles: false }),
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/api/') &&
        !page.includes('/admin') &&
        !page.includes('/_'),
      changefreq: 'weekly',
      priority: 0.7,
      serialize: (item) => {
        // Astro emits trailing slashes on every URL by default, but our
        // canonical tags carry none (the live site serves /gap-course, not
        // /gap-course/). Strip the slash so each sitemap entry matches its
        // canonical character-for-character — keep "/" for the root.
        const url = new URL(item.url);
        url.pathname = url.pathname.replace(/\/+$/, '') || '/';
        item = { ...item, url: url.href };
        // Per-route priority tuning. Match against the path part of the URL.
        const path = url.pathname;
        if (path === '/') return { ...item, priority: 1.0, changefreq: 'weekly' };
        if (/^\/(gap-course|ski-camps)\/?$/.test(path)) return { ...item, priority: 0.95, changefreq: 'weekly' };
        if (/^\/lessons\//.test(path)) return { ...item, priority: 0.9, changefreq: 'weekly' };
        if (/^\/resorts\//.test(path)) return { ...item, priority: 0.85, changefreq: 'monthly' };
        if (/^\/instructors\//.test(path)) return { ...item, priority: 0.8, changefreq: 'monthly' };
        if (/^\/journal\//.test(path)) return { ...item, priority: 0.7, changefreq: 'monthly' };
        if (/^\/accommodation\//.test(path)) return { ...item, priority: 0.6, changefreq: 'monthly' };
        if (/^\/(privacy|terms|cookies|book|join|contact|about)\/?$/.test(path)) return { ...item, priority: 0.4, changefreq: 'yearly' };
        return { ...item, priority: 0.5 };
      },
    }),
  ],
  vite: {
    ssr: {
      noExternal: ['@sanity/client', '@sanity/image-url'],
    },
  },
});
