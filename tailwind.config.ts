import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

// Locked palette per CLAUDE.md §3 / project brief.
// Do not introduce new brand colours here without an explicit decision.
const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        snow: '#F7F7F7',      // primary light surface — body bg in light mode
        olive: {
          DEFAULT: '#3B4131', // text default + brand signature (matches uniform)
          deep: '#1B1F17',    // dark surface for hero overlays + button text on yellow
        },
        brown: '#2D291E',     // card surface — warm dark contrast against snow
        salt: '#EFEEE7',      // text on dark surfaces (cards, hero)
        yellow: '#EFFDA4',    // single accent — kickers, CTAs, hover
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'], // architectural grotesque — headlines, hero, big stats
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      fontWeight: {
        normal: '400',
        semibold: '600',
      },
    },
  },
  plugins: [typography()],
};

export default config;
