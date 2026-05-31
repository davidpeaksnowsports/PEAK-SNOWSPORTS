import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

// Summer Collection palette — see CLAUDE.md §3.
//
// Pink-led vibrant system. Pink is the dominant accent; blue and green
// appear sparingly for specific signals (level coding, success states).
//
// Historic token names (snow / olive / olive-deep / brown / salt / yellow)
// are preserved so every existing `text-olive`, `bg-yellow`, etc. class
// keeps working. Their hex values have been swapped to the new palette:
//
//   snow + salt                → true white  (#FFFFFF)
//   olive + olive-deep + brown → true black  (#0A0A0A)
//   yellow                     → pink (#EB437F) — same primary-accent role
//
// New explicit-name tokens (`pink`, `blue`, `green`) are added for new
// code. Prefer them going forward — `yellow` is a legacy alias.
const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces + type
        snow: '#FFFFFF',      // primary surface (was #F7F7F7 off-white)
        olive: {
          DEFAULT: '#0A0A0A', // body type (was #3B4131 olive green)
          deep: '#0A0A0A',    // dark surface (was #1B1F17, now matches olive)
        },
        brown: '#0A0A0A',     // card dark surface (was #2D291E warm brown)
        salt: '#FFFFFF',      // type on dark surfaces (was #EFEEE7 cream)

        // Summer Collection accents
        pink: '#EB437F',      // primary accent · CTAs, kickers, highlights, hover
        blue: '#2E55E2',      // sparingly · level / category coding only
        green: '#1FB089',     // sparingly · success / confirmation only

        // Legacy alias — `yellow` was the original accent token. Mapped to
        // pink for backward compatibility. Migrate `bg-yellow` etc. to
        // `bg-pink` over time.
        yellow: '#EB437F',
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
