# Ski camp portal

Server-rendered area at `/camps`, behind a login, for skiers booked on a Peak
ski camp. Same repo, same deploy, same Supabase project and design system as
the instructor hub (`PORTAL.md`), the GAP portal (`GAP-PORTAL.md`) and Peak HQ
(`HQ.md`).

Not to be confused with `/ski-camps`, the public page that sells the camps.
That stays public and indexed. The middleware's prefix test is segment-exact,
so it never matches.

---

## What it is for

A booked skier arrives on Sunday ready: fit, kitted out, knowing the building
blocks, and knowing where to be on Monday morning.

| Route | What it does |
|---|---|
| `/camps` | Home: countdown to your camp, its status, ski fit this week, everything else |
| `/camps/knowledge` | Knowledge hub: before you go, on the camp, kit, mountain sense |
| `/camps/ski-system` | The building blocks, numbered, each with a drill and its videos |
| `/camps/videos` | Video library, filtered by topic and level (plain links, no JS) |
| `/camps/fitness` | The ski fit plan, counted down to your camp, with sessions to tick off |
| `/camps/dates` | Choose your camp, the season's schedule, each venue and its meeting notes |
| `/camps/<section>/<slug>` | One page from any section |
| `/camps/login` | Sign in and sign up: an email address, then a link. Password optional |
| `/camps/confirm` | Where the emailed link lands |
| `/camps/forgot-password`, `reset-password`, `logout` | Account. `/camps/join` redirects to login |

Every route sets `prerender = false`; `src/middleware.ts` guards them.

---

## Where things live

| What | Where | Why |
|---|---|---|
| Knowledge hub, ski system, ski fit, venue notes | `campDoc` in the **private** portal dataset | For booked clients only, and this repo is public |
| Video library | `campVideo` in the private portal dataset | Links to YouTube (unlisted is fine) or Vimeo, played in the page |
| Camp dates, venues, confirmed status | Public `skiCamp` and `campLocation` documents | The same ones `/ski-camps` shows. Change a date once |
| Who a camper is | `camp_members` (Supabase) | Access |
| Which camp they are on | `camp_choices` (Supabase) | Personalisation only, chosen by the camper |
| Ski fit ticks | `camp_fitness_ticks` (Supabase) | Per camper |

`campDoc` is a separate type from `portalDoc` on purpose. Campers are clients,
and `portalDoc` holds pay rates and policies. The camp portal queries
`campDoc` and `campVideo` by type and nothing else, so no Studio mistake on a
staff document can put it in front of a client.

Nothing medical, dietary or insurance-related is collected. That belongs with
the booking in SkiOperator.

---

## Setup

### 1. Supabase

Run both migrations (`supabase db push`, or paste them into the SQL editor):

- `0016_ski_camp_portal.sql` adds the three tables, and a `camps` area to the
  join-code table from 0009.
- `0017_open_camp_signup.sql` adds `join_camps()`, which is what lets anyone
  in with just an email address.

### 2. Sign-up: open, by email link

By David's decision there is no code. A camper enters their email at
`/camps/login` (first name optional), gets a link, taps it, and is in. Put
`https://www.peaksnowsports.com/camps/login` in the booking confirmation email.

What keeps that safe: no trigger reads sign-up metadata. Once someone has
proved they own the email address, `/camps/confirm` calls `join_camps()`, which
adds only the caller, only as `camper`, and never changes an existing row. It
opens `/camps` and nothing else. The trade-off, accepted: anyone who signs up
can read the camp pages, booked or not. Keep anything that must stay with
booked skiers only out of the camp portal.

Anyone with an existing Peak password can use it under "Use a password
instead", and becomes a camper too.

Everyone who signs up is a `camper`. To make a coach:

```sql
update public.camp_members set role = 'coach' where id = '<auth-uid>';
```

Coaches see the same pages for now; the role is there for a group roster
later. To remove someone, `active = false`.

### 3. Redirect URLs

Add to **Authentication → URL Configuration → Redirect URLs**:

```
https://www.peaksnowsports.com/camps/confirm
https://www.peaksnowsports.com/camps/reset-password
https://staging.peaksnowsports.com/camps/confirm
https://staging.peaksnowsports.com/camps/reset-password
```

Without `/camps/confirm` on the list, Supabase silently sends the sign-in link
to the Site URL instead, and campers land on the home page signed out.

### 3a. Make the link work on any device (recommended)

Supabase's default link only works in the browser that asked for it. A camper
who asks on a laptop and opens their email on a phone gets "open it on the
device you asked for it on". To fix that, in **Authentication → Emails →
Magic Link**, change the link in the template to:

```
{{ .SiteURL }}/camps/confirm?token_hash={{ .TokenHash }}&type=email
```

`/camps/confirm` accepts both styles, so this can be done any time. Only the
camp portal sends magic links, so no other area is affected. Check the Site
URL is `https://www.peaksnowsports.com`.

### 3b. Email sending

Every sign-in is now an email. Supabase's built-in mailer allows only a few
an hour for the whole project, so confirm a custom SMTP server (Resend) is set
under **Authentication → Emails → SMTP settings**. Supabase also limits how
often one address can ask for a link; the page says "wait a minute" when that
happens.

### 4. Content

Pages are written as markdown in `portal-content/camps/` (gitignored) and
published with:

```
node --env-file=.env scripts/portal/seed-camps.mjs --dry-run
node --env-file=.env scripts/portal/seed-camps.mjs --draft
```

`--draft` writes Sanity drafts, invisible to campers. Review them in the Studio
at `/admin/portal` (now titled "Portals (private)") and publish there. After
that, edit in the Studio directly, or re-run without `--draft`, which
publishes and overwrites.

The script's header documents the front matter. The short version:

- `knowledge/` takes `category: before | on-camp | kit | mountain`
- `ski-system/` pages are numbered in `order`
- `fitness/` pages with `weeks_out` and `sessions` are blocks of the plan; the
  rest are reading. Keep each session's `key` once it is live: ticks are
  stored against it.
- `venues/` needs `location: morzine-avoriaz | val-disere | verbier`
- `videos.json` is the video library; `videos.example.json` shows the shape
- `status: outline` holds a page back
- no em dashes, as in the other portals

Same environment as the other portals: `SANITY_PORTAL_DATASET` and
`SANITY_PORTAL_TOKEN` in Vercel, `SANITY_PORTAL_WRITE_TOKEN` locally for the
seeder.

---

## How the date logic works

`src/lib/camps/camp.ts`, pure functions:

- A `skiCamp`'s `startDate` is the Monday. Arrive Sunday, ski to Friday, check
  out Saturday, as the public page says.
- "Today" is today in Europe/Paris, not the server's UTC.
- The ski fit block for this week is the one that started most recently
  before the camper's camp. Before the plan starts, the first block is shown
  as early. In camp week there is nothing left to do.
- A camper whose chosen camp is removed from the schedule is asked to choose
  again. Nothing breaks.

## Known limits

- Venue meeting points are not written yet: the three venue files are held
  back as outlines until someone adds the real meeting point and time. Until
  then the page says the details come with the booking confirmation.
- The camp choice is the camper's own word, not read from SkiOperator. It is
  only used to personalise.
- No coach view, roster or messaging. `coach` exists as a role for that.
- No video upload. Videos are YouTube or Vimeo links.
- `astro dev` 500s on every page that imports `src/lib/sanity.ts`, including
  the public home page, because of `@sanity/image-url` in `vite.ssr.noExternal`.
  Production builds are fine. Not caused by this portal.
