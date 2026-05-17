import type { Config } from 'tailwindcss';

// Locked palette per CLAUDE.md §3 / project brief.
// Do not introduce new brand colours here without an explicit decision.
const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#162F4A',
          deep: '#0F2032',
        },
        salt: '#EFEEE7',
        brown: '#2D291E',
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
