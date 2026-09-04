# Peak Snowsports — Website Project Brief

This document is the canonical context for the peaksnowsports.com rebuild. Every Claude Code session should read this first.

---

## 1. Background

Peak Snowsports is a network of premium ski schools operating in Morzine-Avoriaz, Chatel, and Les Gets. We have 20,000+ clients and 25+ instructors. What sets us apart: time invested in the client, time invested in our team. Learning to ski with Peak is an experience, not a transaction.

We also run the GAP Course — a six-week instructor training programme that's becoming a flagship product in its own right.

The booking system is **SkiOperator**, our own product (Laravel + Filament CMS, integrating Stripe, Hubspot, SkiIQ, and Weglot). It handles all booking, payments, instructor scheduling, partner/agent management, and admin workflows. This website's job is to be the brand front-end that drives traffic to SkiOperator.

The website will eventually serve as the reference template for multi-tenant white-label deployments of SkiOperator to other ski schools.

---

## 2. Goals

**Primary:**
- Establish Peak as the premium ski school brand in the Northern Alps
- Drive online booking conversion via the embedded SkiOperator booking widget
- Generate qualified GAP course enquiries (handed off to the WhatsApp GAP track)
- Build an SEO content engine via the journal so we win organic traffic against ESF and Evolution2

**Secondary:**
- Showcase the instructor team as a competitive differentiator (no other school in the region profiles their team this well)
- Support EN + FR from launch given French resort base
- Be visually impressive enough to double as a sales asset when pitching the multi-tenant platform to other ski schools

---

## 3. Brand & design direction

### Voice
Casual, confident, founder-voiced. Short declarative statements. No marketing fluff. Think internal team doc, not corporate marketing.

Examples:
- ✅ "We don't run lessons. We build skiers."
- ❌ "Elevating your snow sports journey to new heights"

### Visual language
- **Light-mode primary, monochrome.** Off-white paper (`#FAFAFA`) with charcoal ink (`#1A1A1A`) and a single accent. Neither pure black nor pure white appears anywhere — both strain the eyes. Cards and the hero overlay flip to ink for contrast moments. Photography is the only chroma on the page besides the accent.
- **Type:** Geist 700 for display (headlines, hero, nav, CTA labels), Source Sans Pro 400/600 for body. Courier for metadata (kickers, bylines, captions, timestamps). With colour stripped out, type size and weight carry the hierarchy, so the scale runs deliberately wide — 11px metadata to hero display.
- **Imagery:** Real, raw mountain photography. Real Peak team faces. Video backgrounds on hero. Instructor portraits shot consistently — same lighting, same crop, builds the team as a visual ensemble.
- **Layout:** A shared 12-column grid, 24px gutters, 40px page gutters. Sections separate by hairline rule and by varying their column structure, never by background colour. Photography and ink bands are the only full-bleed elements. Generous vertical rhythm. Mobile-first (majority of traffic is mobile).
- **No stock photo clichés.** No corporate-handshake imagery, no generic-skier-in-action stock.

### Palette — Winter Collection (monochrome)
Defined in [`tailwind.config.ts`](./tailwind.config.ts). Do not introduce hex codes outside that file.

Off-white and charcoal with **one** accent. The colour budget is spent entirely on buttons and active links; everything else is the grey ramp.

| Token | Hex | Role |
|---|---|---|
| `paper` | `#FAFAFA` | Page ground, nav, sub-footer. Not pure white. |
| `paper-2` | `#F2F2F3` | Subtle second surface. |
| `ink` | `#1A1A1A` | Body type and dark bands. Not pure black. |
| `ink-70` | `#5C5C5E` | Secondary copy. 6.41:1 on paper — AA. |
| `ink-45` | `#8A8A8D` | Marks, captions, large text only. 3.31:1 — fails AA for body copy. |
| `accent` | `#67458D` | **Purple.** Buttons, links, active nav, numbered markers, quote marks. |
| `snow` `salt` | `#FAFAFA` | Legacy aliases → `paper`. |
| `cream` | `#F2F2F3` | Legacy alias → `paper-2`. |
| `navy` `brown` `olive` `olive-deep` | `#1A1A1A` | Legacy aliases → `ink`. |
| `pink` `yellow` | `#67458D` | Legacy aliases → `accent`. |
| `blue` `green` | `#5C5C5E` | Legacy aliases → `ink-70`. |

**Why the accent is dark.** In a monochrome layout an accent has to do four jobs: read as a link on paper, fill a button, give that button an edge, and stay visibly distinct from the body ink. Pale accents fail at least one — the retired Peak yellow `#EFFDA4` scores 1.04:1 as a link and has no pill edge at all, and every navy Peak uses (`#192747`, `#1A2647`, `#14243F`) sits under 1.2:1 against the ink, so it reads as a second black rather than a colour.

Candidates that pass all four, ranked by how much they announce themselves against the ink:

| Accent | As link | As button | vs ink |
|---|---|---|---|
| **Purple `#67458D`** — current | 7.15 | 7.15 | **2.33** |
| Royal blue `#324E8E` | 7.69 | 7.69 | 2.17 |
| Uniform olive `#4F4A36` | 8.51 | 8.51 | 1.96 |
| Peak olive `#3B4131` | 10.13 | 10.13 | 1.65 |
| Slate navy `#213E63` | 10.40 | 10.40 | 1.60 |

Swapping the accent is a one-line change to `accent` plus its two legacy aliases in `tailwind.config.ts` — nothing else in the codebase hardcodes it.

**Rhythm**: with only one surface, sections separate by **column structure and hairline rules**, not by background colour. Vary the grid per section — 7/4, 5/6, four columns, a narrow measure — so no two adjacent sections share a shape. One ink band per page maximum, used where numbers or an offer need to land.

**Naming collision — read this.** The legacy `olive` token is the *type* colour and points at ink `#1A1A1A`. The new accent, which is the actual olive, is `accent`. New code should use `paper` / `ink` / `accent` and ignore the aliases entirely.

**Migration history**: original palette (olive `#3B4131` + yellow `#EFFDA4` + brown `#2D291E`) → Summer Collection (white + cream + pink `#EB437F` + navy) → Winter Collection (monochrome + purple). Token names have been preserved throughout, so ~1,150 class references keep resolving; only the hex values change. The Winter migration also required two mechanical fixes: 40 accent fills carried `text-olive-deep` labels, which against any dark accent is close to invisible — they now take paper labels (7.15:1 on the current purple), and 27 accent buttons used `hover:bg-salt` which would have gone light-on-light (now `hover:bg-ink`). The accent was briefly Peak olive `#3B4131` — the original pre-rebrand value — before moving to purple.

**Recommended for new code**: `bg-paper`, `text-ink`, `text-ink-70`, `bg-accent`. Never `bg-yellow` / `text-olive`.

### Aspirational references
- **barrys.com** — the lifestyle/brand-led model. Confident type, full-bleed video, booking tucked behind a single CTA.
- **ski-booker.com** — the booking-tech reference (Next.js, clean, modern) — but we lean further toward brand than tool.

### What we are not
- Not a marketplace (Viator, GetYourGuide). Peak is a single premium brand, not a directory.
- Not ESF (municipal, dated, anonymous instructors).
- Not Evolution2 (closer competitor, but more cluttered and less brand-led).

---

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro** | Content-first, ships ~zero JS by default, great for SEO and mobile performance. Islands architecture lets us drop React in only where needed (booking widget embed, interactive maps). |
| UI components | **React** (via Astro islands) where interactivity is needed; otherwise Astro components | Pragmatic. Most pages don't need a JS framework. |
| Styling | **Tailwind CSS** | Fast to build in, ergonomic in Claude Code, easy to enforce a design system. |
| CMS | **Sanity** | Genuinely good editing UX for George, real-time collaboration, excellent image handling with auto-optimisation, generous free tier. |
| Localisation | **Weglot** | Same Weglot account/API key as SkiOperator so translations stay consistent site-wide. Get to bilingual fast at launch. Can graduate to native Sanity localisation later if needed. |
| Forms | **Resend** for transactional email, **Formspree** or custom Astro endpoint for contact/enquiry submissions | Simple, no separate backend. |
| Hosting | **Vercel** | Free tier sufficient initially. Edge CDN, automatic deploys from GitHub, native Astro support. |
| Analytics | **Plausible** or **GA4** | Plausible preferred for clean privacy-friendly stats. GA4 if we need deeper funnel analysis. |
| Domain | peaksnowsports.com | Existing. |

### Repo structure (target)
```
peaksnowsports-web/
├── CLAUDE.md                    # this file
├── README.md
├── astro.config.mjs
├── tailwind.config.ts
├── package.json
├── public/
│   ├── fonts/
│   ├── images/                  # static, non-CMS imagery
│   └── videos/                  # hero video assets
├── src/
│   ├── components/
│   │   ├── nav/
│   │   ├── hero/
│   │   ├── ui/                  # buttons, cards, etc.
│   │   ├── instructors/
│   │   ├── booking/             # SkiOperator embed wrappers
│   │   └── journal/
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── PageLayout.astro
│   │   └── JournalLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── lessons/
│   │   ├── gap-course.astro
│   │   ├── resorts/
│   │   ├── instructors/
│   │   ├── journal/
│   │   ├── about.astro
│   │   ├── book.astro
│   │   └── contact.astro
│   ├── lib/
│   │   ├── sanity.ts            # Sanity client + queries
│   │   └── utils.ts
│   └── styles/
│       └── global.css
└── sanity/                      # Sanity Studio in same repo (monorepo style)
    ├── sanity.config.ts
    ├── schemas/
    └── ...
```

---

## 5. Site structure

### Main nav
1. **Lessons** — main product pages with embedded booking widget
2. **GAP Course** — dedicated long-scroll landing page, enquiry form → WhatsApp GAP track
3. **Resorts** — Morzine, Chatel, Les Gets
4. **Instructors** — team showcase + individual profiles
5. **Journal** — blog/content engine for George
6. **About** — Peak's story, philosophy, team behind the team

### Secondary (top-right)
- **Book** — dedicated booking page hosting the full SkiOperator embed
- **Account** — deep-link into SkiOperator's client portal
- **Contact**
- **EN / FR** toggle (Weglot)

### Footer
- FAQs, Contact, Privacy, T&Cs, partner enquiries (for future multi-tenant prospects), social, newsletter signup

---

## 6. Pages — launch scope

### Home (`/`)
- Type-led hero: headline on paper at display size, with the video or image following as a bounded band. Optional `facts` strip under the headline. One primary CTA: "Book a lesson." Secondary: "Explore the GAP Course."
- Three resort cards (Morzine / Chatel / Les Gets) with imagery.
- "Why Peak" — three concise pillars: **Premium**, **Personal**, **Professional**.
- Instructor strip — scrolling horizontal showcase of team faces with names.
- Two or three testimonials.
- Journal teaser (latest 3 posts).
- Newsletter signup.

### Lessons (`/lessons`)
- Landing page introducing the lesson products.
- Sub-pages or anchor sections for: Private lessons, Group lessons, Family lessons, Off-piste & freeride, Race coaching.
- Each lesson type has its own page with: description, who it's for, what's included, an embedded SkiOperator availability widget for that product, and a "Request preferred instructor" link that ties into the SkiOperator preferred-instructor system.

### GAP Course (`/gap-course`)
- Long-scroll, sectioned landing page. Slightly more rugged/aspirational visual identity within the Peak system.
- Sections: hook → who it's for → six-week structure → the team (coaches: George, Marc, Tom Peek, Eilidh) → alumni stories → enquiry form.
- Enquiry form posts to the existing WhatsApp GAP track David has built.
- Important: this is a high-consideration purchase. Long-form content is correct here.

### Resorts (`/resorts`)
- Overview page + three resort detail pages (`/resorts/morzine`, `/resorts/chatel`, `/resorts/les-gets`).
- Each resort page: hero shot, what makes this resort good for which skiers, meeting points (with map), Peak's presence in the resort, lesson availability shortcuts. Strong SEO target ("ski lessons Morzine").

### Instructors (`/instructors`)
- Team page: brand statement + filterable grid (filter by resort, by speciality, by language spoken).
- Individual instructor detail pages (`/instructors/[slug]`) with photo, bio, qualifications, languages, specialities, and a "Request this instructor" CTA that deep-links into SkiOperator's preferred-instructor flow.
- This is a genuine differentiator vs ESF (anonymous) and Evolution2 (limited profiles).

### Journal (`/journal`)
- Listing page with category filters.
- Individual post pages (`/journal/[slug]`).
- Categories: Resort guides, Kit reviews, Season updates, Technique, GAP stories, Instructor profiles.
- Author = instructor, surfaces a "more from this instructor" section at the bottom.

### About (`/about`)
- Peak's story, philosophy, the 20,000 clients / 25+ instructors numbers, founder voice.
- Lower-priority for conversion, higher-priority for brand.

### Book (`/book`)
- Dedicated page hosting the full SkiOperator booking embed at full width. Hero + embed + "or talk to us" fallback + cross-nav. Primary conversion destination for the "BOOK" nav link and every "Book a lesson" CTA on the site.

### Contact (`/contact`)
- Simple form + WhatsApp deep-links for the appropriate route (GAP enquiry, general lesson enquiry, partner enquiry).

---

## 7. Booking system integration

### How it embeds
**SkiOperator** hosts the booking experience on `ski-operator.com` and renders inside an iframe. Two modes are in use, both gated by SkiOperator's origin allowlist:

- **Publishable-key mode** (`SkiOperatorEmbed.astro`) — pub_ key + tenant baked into the iframe URL at build time; no server token, no client-side JS. Used on the five per-product lesson pages.
- **Secure server mode** (`SkiOperatorSecureEmbed.astro`) — the server mints a short-lived token per request from the `sec_` key. Used on `/book` and `/lessons/private`.

`SkiOperatorEmbed.astro` renders:
```
<iframe src="https://www.ski-operator.com/app/embed/products
             ?embed=1
             &tenant={PUBLIC_SKI_OPERATOR_TENANT}
             &sourceOrigin={URL-encoded Astro.site origin}
             &public_key={PUBLIC_SKI_OPERATOR_PUBLIC_KEY}"
        allow="payment"
        style="min-height:900px; border:0;">
```

Full guide: <https://www.ski-operator.com/docs/embed>. Checkout redirects the top-level browser to the payment provider, so **no iframe `sandbox`** — a sandbox would block that navigation.

**Required config**
- `PUBLIC_SKI_OPERATOR_TENANT` and `PUBLIC_SKI_OPERATOR_PUBLIC_KEY` in Vercel Preview + Production. `PUBLIC_`-prefixed = inlined into browser HTML by design — pub_ keys are browser-safe.
- Site origin `https://www.peaksnowsports.com` allowlisted in SkiOperator admin → Settings → Embed.

**Never** put a `sec_` key in browser code or in a `PUBLIC_`-prefixed env var. pub_ keys are browser-safe; sec_ keys are not.

### Secure server mode (`/book`, `/lessons/private`)
`SkiOperatorSecureEmbed.astro` POSTs `{ secure_api_key, domain }` to
`https://www.ski-operator.com/api/v1/embed/token/generate` from the server and renders
`…/app/embed/products?embed=1&sourceOrigin={origin}&token={token}` with the returned token.

**`sourceOrigin` is not optional.** Omit it and the embed renders "This embed link is
invalid or has expired" even with a freshly minted, correctly signed token — the origin
is checked from the query param, not only from the token payload. This cost an outage;
don't drop it.

```
POST /api/v1/embed/token/generate
{ "secure_api_key": SKI_OPERATOR_SECURE_KEY, "domain": "https://www.peaksnowsports.com" }
→ { "token": "…" }
```

Because tokens expire, both pages set `export const prerender = false` and
`Cache-Control: no-store` — they are the only server-rendered pages on the site.
Never prerender them or let a CDN cache them; a cached copy serves a dead token.

**Required config**
- `SKI_OPERATOR_SECURE_KEY` (the `sec_…` key) in Vercel Preview + Production. No `PUBLIC_` prefix, never committed, read from `process.env` at request time.
- If the key is missing or the token call fails, the page renders the "get in touch" fallback rather than a broken iframe, and logs the reason server-side.

### Where it appears
- `/book` — dedicated full-width embed in **secure server mode** (server-rendered, uncached). The primary conversion page for the "BOOK" nav link and every "Book a lesson" CTA.
- `/lessons/private` — sidebar embed in **secure server mode** (server-rendered, uncached).
- `/lessons/group`, `/lessons/family`, `/lessons/kids-club`, `/lessons/off-piste`, `/lessons/race-coaching` — sidebar embed per product page, publishable-key mode.

### What we do NOT build
- Booking flow, cart, payment — all SkiOperator.
- Instructor management, admin panels — all SkiOperator (Filament).
- Account/login — SkiOperator handles. We link out to its portal.

### What we DO build
- Marketing site that drives traffic to those pages.
- Visual continuity wrapping the embed.

---

## 8. CMS schemas (Sanity)

### Document types to define
- **Page** — generic page with hero + sections (for About, evergreen content)
- **Resort** — name, slug, hero image, description, meeting points (array), what-it's-good-for, related lessons, related instructors
- **Lesson** — name, slug, description, who it's for, what's included, duration, price reference (for display only — actual booking via SkiOperator), SkiOperator product ID for embed targeting, hero image
- **Instructor** — name, slug, photo, bio, qualifications (array), languages (array), specialities (array), resorts (references), SkiOperator instructor ID for "request this instructor" deep-link
- **Post (journal)** — title, slug, author (reference to Instructor), category, hero image, body (Portable Text), publish date, SEO fields
- **Testimonial** — quote, client name, lesson type, rating
- **Settings (singleton)** — site-wide config: nav links, footer links, social URLs, contact details, WhatsApp deep-link URLs

### Localisation
Each document gets EN + FR fields where appropriate, OR we use Weglot to translate the rendered site (simpler). Decision pending. Start with Weglot for speed.

---

## 9. Development phases

### Phase 0 — Setup (½ day)
- Init Astro + Tailwind + Sanity Studio in monorepo
- Set up Vercel deploys (auto-deploy on push to main)
- Set up Sanity project (free tier, EN + FR datasets if going native; single dataset if Weglot)
- Fonts: Geist (display) + Source Sans Pro (body), both via Google Fonts

### Phase 1 — Foundations (1-2 days)
- Base layout, nav, footer
- Design tokens (colours, type scale, spacing) in `tailwind.config.ts`
- Core UI components (Button, Card, Section)
- Sanity schemas for Instructor, Resort, Lesson
- Seed Sanity with real Peak data — at least 5 instructors with real photos, 3 resorts

### Phase 2 — Hero pages (2-3 days)
- Home page with full hero
- Lessons listing + at least one lesson detail page
- Resorts listing + one resort detail page
- Instructors listing + one instructor detail page

### Phase 3 — GAP Course + Journal (2-3 days)
- GAP Course long-scroll page (this is bespoke, more design-led)
- Journal listing + post template
- Seed Sanity with 3 starter posts

### Phase 4 — Booking integration (1-2 days)
- `/book` page wrapping the SkiOperator embed
- Product-specific embeds on lesson pages
- Deep-links into SkiOperator from instructor pages, CTAs

### Phase 5 — Localisation + polish (1-2 days)
- Weglot integration
- Performance pass (Lighthouse 95+ on mobile)
- SEO audit (meta tags, structured data, sitemap, robots.txt)
- Accessibility pass (WCAG 2.2)
- Cross-browser test

### Phase 6 — Soft launch
- Staging environment shared with Marc, George
- Content fill (real posts, real instructor bios, real testimonials)
- DNS swap

---

## 10. Constraints, gotchas, and decisions

- **Mobile-first is non-negotiable** — discovery confirmed majority of users are mobile.
- **Performance budget:** Lighthouse mobile 90+ on all key pages at launch.
- **WCAG 2.2 AA** — designed-in, not bolted-on.
- **GDPR-compliant** — cookie consent on launch (Cookiebot or similar).
- **301 redirects** — map every URL on the current Squarespace site to its new equivalent. Don't lose existing SEO equity.
- **Don't build a CMS field for everything** — content that changes once a year (e.g. "About") can live in Astro markdown; only put genuinely dynamic content (instructors, lessons, posts, testimonials) in Sanity.
- **SkiOperator ownership boundary** — anything to do with bookings, payments, accounts, instructor management lives in SkiOperator. This site is pure marketing + brand + content.
- **Multi-tenant future** — keep design tokens centralised so other ski schools using the platform can re-skin without rebuilding components.

---

## 11. Open questions to resolve before/during build

1. ~~**Brand accent colour**~~ — **Resolved.** Purple `#67458D` as the single accent in a monochrome system.
2. ~~**Typography licensing**~~ — **Resolved.** Geist, chosen over Inter Tight, Instrument Sans and Schibsted Grotesk. OFL, so free and self-hostable; currently served from Google Fonts, can move to `/public/fonts` later.
3. **Hero video footage** — do we have season footage already shot, or commission?
4. **Existing site URL inventory** — pull the full sitemap from Squarespace for redirect mapping
5. **Current photography library** — what's already shot? What needs new shoots before launch?

Resolved: booking embed format (SkiOperator iframe via `/api/skioperator-token`); Weglot key (shared with SkiOperator).

---

## 12. Stakeholders

- **David Walton** — Director, founder voice, sign-off authority
- **Marc Walton** — Bookings Manager, technical/operational input
- **George Walton** — Digital Marketing / Content, day-to-day CMS user post-launch

---

## 13. Working with Claude Code on this project

When working on this codebase:
- Default to Astro components unless interactivity is required → then React island
- Keep components small and composable
- Use Tailwind utility classes — no separate CSS files except `global.css` for resets/fonts
- All copy is short and declarative — flag to David if proposed copy reads as marketing-speak
- Mobile-first responsive: design from 375px up
- Every image goes through Astro's `<Image />` or Sanity's CDN for optimisation
- Never break the booking system embed — `PUBLIC_SKI_OPERATOR_TENANT`, `PUBLIC_SKI_OPERATOR_PUBLIC_KEY`, `SKI_OPERATOR_SECURE_KEY` (Vercel env), and the origin allowlist in SkiOperator admin are the moving parts; test any change end-to-end
- Update this CLAUDE.md when major decisions are made
