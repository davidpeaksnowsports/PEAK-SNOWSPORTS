# Peak Snowsports — Website Project Brief

This document is the canonical context for the peaksnowsports.com rebuild. Every Claude Code session should read this first.

---

## 1. Background

Peak Snowsports is a network of premium ski schools operating in Morzine-Avoriaz, Chatel, and Les Gets. We have 20,000+ clients and 25+ instructors. What sets us apart: time invested in the client, time invested in our team. Learning to ski with Peak is an experience, not a transaction.

We also run the GAP Course — a six-week instructor training programme that's becoming a flagship product in its own right.

A separate booking system is being delivered by Arch (May 2026) — built on Laravel + Filament CMS, integrating Stripe, Hubspot, SkiIQ, and Weglot. It handles all booking, payments, instructor scheduling, partner/agent management, and admin workflows. This website's job is to be the brand front-end that drives traffic to that booking system.

The website will eventually serve as the reference template for multi-tenant white-label deployments to other ski schools (Arch WP4).

---

## 2. Goals

**Primary:**
- Establish Peak as the premium ski school brand in the Northern Alps
- Drive online booking conversion via the embedded Arch booking widget
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
- **Light-mode primary.** Warm snow surface (`#F7F7F7`) with olive type — editorial feel, like a premium magazine. Cards and the hero overlay flip dark (brown / olive-deep) for contrast moments. No corporate navy/baby-blue ski-school cliché.
- **Type:** Source Sans Pro 400/600 for display + body. Courier for metadata (kickers, bylines, captions, timestamps).
- **Imagery:** Real, raw mountain photography. Real Peak team faces. Video backgrounds on hero. Instructor portraits shot consistently — same lighting, same crop, builds the team as a visual ensemble.
- **Layout:** Full-bleed everywhere. Generous vertical rhythm. Mobile-first (majority of traffic is mobile per Arch discovery).
- **No stock photo clichés.** No corporate-handshake imagery, no generic-skier-in-action stock.

### Palette — Summer Collection (locked)
Defined in [`tailwind.config.ts`](./tailwind.config.ts). Do not introduce hex codes outside that file.

The "Summer Collection" is the active palette. The system is **pink-led** — pink is the dominant accent everywhere. Blue and green appear sparingly, each with one specific job.

| Token | Hex | Role |
|---|---|---|
| `snow` | `#FFFFFF` | Primary surface — body bg, nav, footer. True white. |
| `olive` | `#0A0A0A` | Default text colour. True near-black. (Name kept for class-compat — see migration note below.) |
| `olive-deep` | `#0A0A0A` | Dark surface for hero overlays. Same value as `olive` — both render as black. |
| `brown` | `#0A0A0A` | Card dark surface. Same value as `olive` / `olive-deep`. |
| `salt` | `#FFFFFF` | Type on dark surfaces. Same value as `snow` — both render as white. |
| `pink` | `#EB437F` | **Primary accent** — CTAs, kickers, hero highlights, hover-bgs, badges, underlines. Used everywhere. |
| `blue` | `#2E55E2` | Sparingly — **level / category coding only**. Never as a CTA, never as a kicker. |
| `green` | `#1FB089` | Sparingly — **success / confirmation only** (e.g. "Place confirmed" chips). |
| `yellow` | `#EB437F` | **Legacy alias** for `pink` (same hex). Existing `bg-yellow` / `text-yellow` classes keep working; prefer `pink` in new code. |

**Discipline:** each colour stays in its lane. Pink does ~80% of accent work. Blue is reserved for level coding (e.g. "Intermediate" level card). Green is reserved for confirmation moments. This is what keeps a multi-colour system disciplined rather than chaotic.

**Migration note:** the previous palette (olive `#3B4131`, yellow `#EFFDA4`, brown `#2D291E`, etc.) was retired in the Summer Collection rebrand. Token names were preserved so the ~700 existing class references keep working — the hex values just changed. New code should use the explicit names (`pink`, `blue`, `green`) rather than the legacy `yellow` alias. The site visual no longer matches the green team uniform — that's an accepted divergence per the rebrand.

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
| Localisation | **Weglot** | Same Weglot account/API key as the Arch booking system so translations stay consistent site-wide. Get to bilingual fast at launch. Can graduate to native Sanity localisation later if needed. |
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
│   │   ├── booking/             # Arch widget wrappers
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
- **Book** — dedicated booking page hosting the full Arch widget
- **Account** — deep-link into Arch's client portal
- **Contact**
- **EN / FR** toggle (Weglot)

### Footer
- FAQs, Contact, Privacy, T&Cs, partner enquiries (for future multi-tenant prospects), social, newsletter signup

---

## 6. Pages — launch scope

### Home (`/`)
- Full-bleed hero with video background. Single headline statement ("LEARN TO SKI. PROPERLY." or similar — TBD). One primary CTA: "Book a lesson." Secondary: "Explore the GAP Course."
- Three resort cards (Morzine / Chatel / Les Gets) with imagery.
- "Why Peak" — three concise pillars: **Premium**, **Personal**, **Professional**.
- Instructor strip — scrolling horizontal showcase of team faces with names.
- Two or three testimonials.
- Journal teaser (latest 3 posts).
- Newsletter signup.

### Lessons (`/lessons`)
- Landing page introducing the lesson products.
- Sub-pages or anchor sections for: Private lessons, Group lessons, Family lessons, Off-piste & freeride, Race coaching.
- Each lesson type has its own page with: description, who it's for, what's included, an embedded Arch availability widget for that product, and a "Request preferred instructor" link that ties into the Arch preferred-instructor system.

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
- Individual instructor detail pages (`/instructors/[slug]`) with photo, bio, qualifications, languages, specialities, and a "Request this instructor" CTA that deep-links into the Arch booking system's preferred-instructor flow.
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
- Dedicated page hosting the full Arch booking widget. Styled wrapper that feels continuous with the rest of the site. **Critical coordination with Arch on visual consistency.**

### Contact (`/contact`)
- Simple form + WhatsApp deep-links for the appropriate route (GAP enquiry, general lesson enquiry, partner enquiry).

---

## 7. Booking system integration

### How it embeds
Arch is delivering an embedded booking widget for the existing site. We need to confirm with Arch (contact: Rachel Vaclik, Product Manager) whether it ships as:
- An iframe (simplest, but styling/UX consistency is harder)
- A JavaScript snippet (better — can style with the parent site's tokens)
- A set of pre-built components we host ourselves (best, but unlikely)

Coordinate visual tokens with Jake Charlton (Arch designer): exact colour palette, type stack, button styles, spacing. The embedded widget must feel like part of the site, not a third-party drop-in.

### Where it appears
- `/book` — full widget
- `/lessons/[product]` — product-specific availability widget inline
- "Book a lesson" CTAs throughout the site — link to `/book` (or to the relevant product page if context-specific)

### What we do NOT build
- Booking flow, cart, payment — all Arch.
- Instructor management, admin panels — all Arch (Filament).
- Account/login — Arch handles. We link out to their portal.

### What we DO build
- Marketing site that drives traffic to those pages.
- Visual continuity wrapping the embed.

---

## 8. CMS schemas (Sanity)

### Document types to define
- **Page** — generic page with hero + sections (for About, evergreen content)
- **Resort** — name, slug, hero image, description, meeting points (array), what-it's-good-for, related lessons, related instructors
- **Lesson** — name, slug, description, who it's for, what's included, duration, price reference (for display only — actual booking via Arch), Arch product ID for embed targeting, hero image
- **Instructor** — name, slug, photo, bio, qualifications (array), languages (array), specialities (array), resorts (references), Arch instructor ID for "request this instructor" deep-link
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
- Buy/swap fonts (Söhne Mono or Geist if licensing budget; Inter as fallback)

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
- `/book` page wrapping Arch widget
- Product-specific embeds on lesson pages
- Deep-links into Arch system from instructor pages, CTAs

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

- **Mobile-first is non-negotiable** — Arch discovery confirmed majority of users are mobile.
- **Performance budget:** Lighthouse mobile 90+ on all key pages at launch.
- **WCAG 2.2 AA** — designed-in, not bolted-on.
- **GDPR-compliant** — cookie consent on launch (Cookiebot or similar).
- **301 redirects** — map every URL on the current Squarespace site to its new equivalent. Don't lose existing SEO equity.
- **Don't build a CMS field for everything** — content that changes once a year (e.g. "About") can live in Astro markdown; only put genuinely dynamic content (instructors, lessons, posts, testimonials) in Sanity.
- **Arch ownership boundary** — anything to do with bookings, payments, accounts, instructor management is theirs. We are pure marketing + brand + content.
- **Multi-tenant future** — keep design tokens centralised so other ski schools using the platform can re-skin without rebuilding components.

---

## 11. Open questions to resolve before/during build

1. **Booking embed format** — iframe vs JS snippet vs components? (Ask Rachel @ Arch)
2. **Shared Weglot key** — confirm with Arch we can reuse their API key
3. **Brand accent colour** — needs founder decision (David)
4. **Typography licensing** — Söhne/Geist licensed, or Inter free? Affects budget
5. **Hero video footage** — do we have season footage already shot, or commission?
6. **Existing site URL inventory** — pull the full sitemap from Squarespace for redirect mapping
7. **Current photography library** — what's already shot? What needs new shoots before launch?

---

## 12. Stakeholders

- **David Walton** — Director, founder voice, sign-off authority
- **Marc Walton** — Bookings Manager, technical/operational input
- **George Walton** — Digital Marketing / Content, day-to-day CMS user post-launch
- **Rachel Vaclik (Arch)** — Booking system Product Manager — coordinate on embed
- **Jake Charlton (Arch)** — Booking system Designer — coordinate on visual continuity

---

## 13. Working with Claude Code on this project

When working on this codebase:
- Default to Astro components unless interactivity is required → then React island
- Keep components small and composable
- Use Tailwind utility classes — no separate CSS files except `global.css` for resets/fonts
- All copy is short and declarative — flag to David if proposed copy reads as marketing-speak
- Mobile-first responsive: design from 375px up
- Every image goes through Astro's `<Image />` or Sanity's CDN for optimisation
- Never break the booking system embed — coordinate any changes affecting `/book` with Arch
- Update this CLAUDE.md when major decisions are made
