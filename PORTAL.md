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
| 3 | Employed office staff only | Employer policies — paid time off, separation, working from home. Never rendered for an instructor, and not visible in their navigation. |

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

There is no public sign-up. Create accounts in **Authentication → Users**; a
profile row is created automatically by trigger. Promote yourself with:

```sql
update public.instructors set role = 'admin' where id = '<your-auth-uid>';
```

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
- `/admin/portal` — portal documents (private dataset)

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
