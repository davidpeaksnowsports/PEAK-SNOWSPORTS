# peaksnowsports-web

Brand front-end for [peaksnowsports.com](https://peaksnowsports.com). Drives traffic into the Arch booking system.

See [`CLAUDE.md`](./CLAUDE.md) for the canonical project brief — every contributor (and Claude Code session) should read it first.

## Stack

| Layer | Tool |
|---|---|
| Framework | Astro 5 |
| UI islands | React 18 |
| Styling | Tailwind CSS 3 |
| CMS | Sanity (Studio in `/sanity`) |
| Localisation | Weglot |
| Hosting | Vercel |

## Brand tokens

Locked palette (see `tailwind.config.ts`):

| Token | Hex |
|---|---|
| `navy` | `#162F4A` |
| `navy-deep` | `#0F2032` |
| `salt` | `#EFEEE7` |
| `brown` | `#2D291E` |
| `yellow` | `#EFFDA4` |

Type: Source Sans Pro 400 / 600 (`font-sans`). Courier for metadata (`font-mono` / `.meta`).

## Getting started

```bash
npm install
npm run dev          # Astro dev server → http://localhost:4321

# In a second terminal:
cd sanity
npm install
npm run dev          # Sanity Studio → http://localhost:3333
```

Copy `.env.example` to `.env` and fill in Sanity / Resend / Weglot keys before going further than the static scaffold.

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Astro dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the built site |
| `npm run sanity:dev` | Sanity Studio dev server |
| `npm run sanity:build` | Build Sanity Studio |
| `npm run sanity:deploy` | Deploy Studio to *.sanity.studio |

## Repo layout

```
peaksnowsports-web/
├── CLAUDE.md                 # project brief — read first
├── public/                   # static assets (fonts, images, videos)
├── src/
│   ├── components/           # nav, hero, ui, instructors, booking, journal
│   ├── layouts/              # Base / Page / Journal
│   ├── pages/                # routes — see CLAUDE.md §6
│   ├── lib/                  # sanity client, utils
│   └── styles/global.css
└── sanity/                   # Studio + schemas
```

## Deploy

Vercel auto-deploys `main`. Preview deploys on every PR.

## Working with this codebase

See [`CLAUDE.md`](./CLAUDE.md) §13 for the working conventions. TL;DR: Astro by default, React only when interactive, Tailwind utilities only, mobile-first from 375px, short declarative copy.
