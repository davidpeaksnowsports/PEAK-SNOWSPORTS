import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

// Summer Collection palette — see CLAUDE.md §3.
//
// Four-colour system: white + cream + pink + navy. White is the clean
// surface, cream is the warm buffer, pink is the bold accent, navy is
// the deep voice (type, mood surfaces, outlines).
//
// Historic token names (snow / olive / olive-deep / brown / salt / yellow)
// are preserved so every existing `text-olive`, `bg-yellow`, etc. class
// keeps working. Their hex values now point to the new palette:
//
//   snow + salt                → true white  (#FFFFFF)
//   olive + olive-deep + brown → navy        (#1A2647)  — was black, was olive green
//   yellow                     → pink        (#EB437F)
//
// New explicit-name tokens (`cream`, `navy`, `pink`) are the preferred
// names for new code. `blue` and `green` remain defined for level-coding
// and success-state use, but are not actively deployed.
const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces + type
        snow: '#FFFFFF',      // bright clean surface
        cream: '#F1ECE0',     // Pantone 11-4201 Cloud Dancer — warm buffer
        olive: {
          DEFAULT: '#1A2647', // body type (now navy — was #0A0A0A black, originally olive)
          deep: '#1A2647',    // dark surface (matches navy)
        },
        brown: '#1A2647',     // card dark surface (matches navy)
        salt: '#FFFFFF',      // type on dark surfaces (white)

        // Summer Collection accents
        navy: '#1A2647',      // deep voice — type, mood surfaces, outlines
        pink: '#EB437F',      // bold accent — CTAs, kickers, highlights, hover
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
