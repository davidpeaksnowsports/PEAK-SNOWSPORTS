# Instructor portal

Server-rendered area at `/portal`, behind a login. Same repo, same deploy, same
Winter Collection design system as the public site.

Phase 1 (auth + handbook) is built. The training tracker, ops forms and ideas
are Phases 2 and 3. Contracts and digital signatures are **out of scope** —
those are issued and signed offline.

---

## Why the content is not in this repo

`github.com/davidpeaksnowsports/PEAK-SNOWSPORTS` is **public**. Safeguarding
procedures, pay rates and the code of conduct cannot be markdown files here.

They also cannot go in the `production` Sanity dataset, whose reads are public
and unauthenticated — anyone holding the project ID can fetch it.

So portal documents live in a **separate, private Sanity dataset**, read
server-side with a token that never reaches the browser.

---

## Three tiers

`tier` on each document is the access control, enforced in the GROQ query rather
than in the page. An instructor requesting a tier 3 document by URL gets a 404,
not a "forbidden" that confirms it exists.

| Tier | Who | What |
|---|---|---|
| 1 | Everyone, versioned | Documents the offline contract points at — code of conduct, rates and benefits. Breach of the code of conduct is a stated termination trigger, so these carry a version number and a material change means notifying people. |
| 2 | Everyone who teaches | Mountain standards — safeguarding, health and safety, accident procedure. Written as standards and duties, not as instructions about how, when or where someone works. |
| 3 | Staff only, in Peak HQ | Employer policies, such as paid time off, separation and working from home. They live in the staff portal at `/hq` (see `HQ.md`). The instructor hub's query excludes tier 3 for every role, including admins. |

**Why tier 3 is separate.** Instructors are self-employed contractors, and their
contract sets out how they engage with Peak. Employer policies written for
employed staff do not describe that relationship, so they are not published to
instructors. This split is a requirement, not a preference — check with David
before moving any document between tiers.

---

## Setup

### 1. Supabase

Create a project, then run the migration:

```bash
supabase db push
```

Or paste `supabase/migrations/0001_portal_instructors.sql` into the SQL editor.

Instructor profiles are created **explicitly by an admin**, never by a
trigger. This Supabase project also holds GAP students, who can self-enrol, and
office staff — every one of them has a valid session, and a valid session is
not access. Only an `instructors` row is. Migration 0006 explains why no
sign-up trigger can do this safely.

1. **Authentication → Users → Add user.** No special metadata.
2. Then, in the SQL editor:

```sql
insert into public.instructors (id, name, role, resorts)
select id, 'Ada Lovelace', 'instructor', array['Morzine']
from auth.users where email = 'ada@example.com';
```

Use `role = 'admin'` for yourself. An account with no `instructors` row, or
with `active = false`, is refused at sign-in with an explanation.

Set the site URL and redirect allow-list in **Authentication → URL
Configuration** so password reset emails come back to the right host:

```
https://www.peaksnowsports.com/portal/reset-password
https://staging.peaksnowsports.com/portal/reset-password
```

### 2. Private Sanity dataset

In `sanity.io/manage`, add a dataset named `portal` with visibility
**private** — not public. Then create two tokens:

- a **read** token → `SANITY_PORTAL_TOKEN` (used by the site)
- a **write** token → `SANITY_PORTAL_WRITE_TOKEN` (used by the import script only,
  never set in Vercel)

### 3. Environment variables

In Vercel, Preview **and** Production:

```
SUPABASE_URL
SUPABASE_ANON_KEY
SANITY_PORTAL_DATASET=portal
SANITY_PORTAL_TOKEN
```

None carry a `PUBLIC_` prefix — the portal is entirely server-rendered and no
credential reaches the browser. **Never** put the Supabase service-role key
here; nothing in the request path should be able to bypass row-level security.

### 4. Import the documents

The `.docx` sources are not in this repo. Unzip the handover folder somewhere
local and point the script at it:

```bash
PORTAL_SOURCE_DIR="$HOME/Documents/Instructor portal" \
  node --env-file=.env scripts/portal/import-docs.mjs --dry-run
```

Drop `--dry-run` to write. Documents use a deterministic `_id`
(`portalDoc-<slug>`) so re-running updates in place rather than duplicating.

`scripts/portal/manifest.json` decides which documents are imported and what
tier each gets. It holds metadata only — no policy text — which is why it is
safe in a public repo. Only documents cleared in the audit are listed; anything
third-party, board-level or still undecided is deliberately absent.

**Read every imported document at `/admin/portal` before telling anyone the
portal is live.** These are verbatim policy documents. Conversion preserves
headings, lists and bold, but Word tables convert poorly and the Notion exports
have no heading styles in a few places.

---

## Studio

Two workspaces, deliberately separated so a portal document cannot be created in
the public dataset by accident:

- `/admin` — public site content (`production` dataset)
- `/admin/portal` — portal documents (private dataset), for both the instructor
  hub and Peak HQ. Each document's `section` places it in the hub, and its
  `hqSection` in HQ.

---

## Routes

| Route | |
|---|---|
| `/portal` | Directory of the seven sections |
| `/portal/login` | Email + password. Server-side, no client JS |
| `/portal/forgot-password` | Self-service reset via Supabase email |
| `/portal/reset-password` | Landing page for the emailed link |
| `/portal/<section>` | Section index |
| `/portal/<section>/<slug>` | One document |

Every portal route sets `prerender = false`. Middleware (`src/middleware.ts`)
guards them, sets `Cache-Control: private, no-store` and `X-Robots-Tag:
noindex`, and `/portal` is disallowed in `robots.txt` for every named crawler
group — the named groups say `Allow: /` and therefore ignore the wildcard group
entirely, so the disallow has to be repeated in each.

---

## Before Phase 3

- **The rates page is blocked** pending confirmation from David of the rate
  structure by qualification level. Do not publish figures taken from the older
  benefits documents; they disagree with each other.
- **The privacy notice needs updating** before any accident-report feature
  ships. That form handles special-category personal data, so it needs a stated
  lawful basis, a retention period and admin-only access before it goes live.
- **Naming.** The instructor contract already points people at a "portail des
  Moniteurs", which is SkiOperator. Two things with that name will confuse the
  team — worth settling before launch.

---

## Sign-up and join codes

People create their own accounts at **`/portal/join`** (instructors) and
**`/hq/join`** (office staff). Each needs the join code for that area.

**The code decides the area, not the page.** Someone using the HQ code on the
instructor page gets an HQ profile and nothing else. New accounts always land on
the lowest role, `instructor` or `staff`; nobody signs themselves up as a
manager or an admin.

**One login, both areas.** The "Already have a Peak login?" form on either join
page signs you in and adds that area to the account you already have. Redeeming
a code you have already used changes nothing, and never changes a role you hold.

### Where the codes live

In `area_join_codes`, one row per area. The table has row-level security on and
**no policies at all**, so no signed-in user can read it: staff cannot look up
the instructor code, and the function that matches a code cannot be called from
a browser either. Only the service role and the sign-up machinery see them.

The codes are not in this repo, which is public. To read or rotate them, use the
SQL editor:

```sql
select area, code, label, active, expires_at from public.area_join_codes;

update public.area_join_codes
set code = 'PEAK-SKI-NEWCODE1', label = 'Instructors, 27/28 season'
where area = 'portal';
```

To close sign-up for an area, `set active = false`. To let a code lapse on its
own, set `expires_at`.

### What a wrong code does

It still creates an account, but with no profile, so it reaches nothing: every
area refuses a session without a profile row. There is no endpoint that will
tell you whether a code is right before an account exists, deliberately, because
that would let someone test codes from the outside. Clear out the leftovers
occasionally with the query at the bottom of migration 0009.

Treat a code like the office door key. Anyone holding it can make an account, so
rotate it each season and when someone leaves.
