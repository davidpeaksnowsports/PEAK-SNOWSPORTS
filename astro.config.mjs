import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sanity from '@sanity/astro';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

// Google's job-posting guidance asks for accurate <lastmod> so it knows when to
// recrawl a posting. We only set it where we have a real date to give: each job
// file's own `datePosted`. Stamping every page with the build time would be a
// lie that triggers pointless recrawls, which the same guidance warns against.
const jobLastmod = Object.fromEntries(
  fs
    .readdirSync('./src/content/jobs')
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const src = fs.readFileSync(path.join('./src/content/jobs', f), 'utf8');
      const posted = src.match(/^datePosted:\s*(\S+)/m)?.[1];
      return [`/join/${f.replace(/\.md$/, '')}`, posted];
    })
    .filter(([, posted]) => posted),
);

// https://astro.build/config
//
// Pages remain static (prerendered) by default. Individual routes can opt into
// per-request server rendering with `export const prerender = false`. The
// Vercel adapter ships server routes as Vercel functions; static pages are
// served from the edge as before. See src/pages/api/skioperator-token.ts.
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
        if (/^\/book\/?$/.test(path)) return { ...item, priority: 0.95, changefreq: 'weekly' };
        if (/^\/(gap-course|ski-camps)\/?$/.test(path)) return { ...item, priority: 0.95, changefreq: 'weekly' };
        if (/^\/lessons\//.test(path)) return { ...item, priority: 0.9, changefreq: 'weekly' };
        if (/^\/resorts\//.test(path)) return { ...item, priority: 0.85, changefreq: 'monthly' };
        if (/^\/instructors\//.test(path)) return { ...item, priority: 0.8, changefreq: 'monthly' };
        if (/^\/journal\//.test(path)) return { ...item, priority: 0.7, changefreq: 'monthly' };
        if (/^\/accommodation\//.test(path)) return { ...item, priority: 0.6, changefreq: 'monthly' };
        if (/^\/join(\/|$)/.test(path)) {
          const lastmod = jobLastmod[path];
          return {
            ...item,
            priority: 0.6,
            changefreq: 'monthly',
            ...(lastmod ? { lastmod: new Date(lastmod).toISOString() } : {}),
          };
        }
        if (/^\/(privacy|terms|cookies|contact|about)\/?$/.test(path)) return { ...item, priority: 0.4, changefreq: 'yearly' };
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
