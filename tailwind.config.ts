import type { Config } from 'tailwindcss';

// Locked palette per CLAUDE.md §3 / project brief.
// Do not introduce new brand colours here without an explicit decision.
const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        olive: {
          DEFAULT: '#3B4131', // mid-tone, matches team uniform jackets
          deep: '#1B1F17',    // primary dark surface
        },
        brown: '#2D291E',     // warm dark — alt surface, sectional accent
        salt: '#EFEEE7',
        yellow: '#EFFDA4',
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      fontWeight: {
        normal: '400',
        semibold: '600',
      },
    },
  },
  plugins: [],
};

export default config;
