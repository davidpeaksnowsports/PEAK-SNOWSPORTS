import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

// Winter Collection palette - Monochrome. See CLAUDE.md section 3.
//
// The page is off-white and charcoal with a single accent. Neither pure
// black nor pure white appears anywhere: #FAFAFA paper, #1A1A1A ink.
// Between them sits a grey ramp with a faint cool bias so the neutrals
// read chosen rather than dead.
//
// ONE accent, Peak olive #3B4131 - the value retired in the Summer
// rebrand, restored. It is deliberately dark: in a monochrome layout an
// accent has to work as a link, as a button fill, as that button's edge,
// and stay visibly distinct from the body ink. Pale accents fail the
// first, third and sometimes all of those. Measured against #FAFAFA:
//
//   accent as link        10.13:1   AAA
//   paper label on accent 10.13:1   AAA
//   accent vs body ink     1.65:1   distinct enough to read as colour
//   ink-70 on paper        6.41:1   AA   secondary copy
//   ink-45 on paper        3.31:1   large text and marks only
//
// Historic token names (snow / cream / olive / brown / salt / navy /
// pink / yellow) are preserved so the ~1,150 existing class references
// keep working, remapped onto the ramp. NOTE the collision: the legacy
// `olive` token is the type colour and now points at ink, while the new
// accent - which is the actual olive - is `accent`. New code should use
// paper / ink / accent and ignore the aliases.
const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Monochrome surfaces + type
        paper: '#FAFAFA',      // page ground
        'paper-2': '#F2F2F3',  // subtle second surface
        ink: {
          DEFAULT: '#1A1A1A',  // body type, dark bands
          70: '#5C5C5E',       // secondary copy      6.41:1 on paper
          45: '#8A8A8D',       // marks, large text   3.31:1 on paper
        },

        // The single accent
        accent: '#3B4131',     // Peak olive - buttons, links, active states

        // Legacy aliases, remapped. Do not use in new code.
        snow: '#FAFAFA',
        salt: '#FAFAFA',
        cream: '#F2F2F3',
        navy: '#1A1A1A',
        brown: '#1A1A1A',
        olive: {
          DEFAULT: '#1A1A1A',
          deep: '#1A1A1A',
        },
        pink: '#3B4131',
        yellow: '#3B4131',
        blue: '#5C5C5E',
        green: '#5C5C5E',
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Geist', '"SF Pro Display"', 'system-ui', '-apple-system', 'helvetica', 'sans-serif'], // neutral grotesque — headlines, hero, nav, CTA labels
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
