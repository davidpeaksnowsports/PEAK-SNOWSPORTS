# Peak HQ

The staff portal, at `/hq`: onboarding for new starters, and a knowledge hub for
employed office and booking staff. It covers what Peak sells, how the office
works, the booking playbook, policies and job descriptions.

It is the third signed-in area in this repo, alongside the instructor hub
(`/portal`, see `PORTAL.md`) and the GAP student portal (`/gap`, see
`GAP-PORTAL.md`). All three share one Supabase project and one design system.

---

## Who sees what

A valid Supabase session is **not** access. Each area checks its own profile
table and nothing else:

| Area | Profile table | Created by |
|---|---|---|
| `/portal` | `instructors` | an admin, by SQL |
| `/gap` | `gap_members` | the enrolment trigger, gated on a course code |
| `/hq` | `staff_members` | an admin, by SQL |

One person can hold rows in more than one table (a manager who also teaches,
say) and sign in to each area with the same account. Nobody gets into an area
without its row.

**Why HQ exists separately from `/portal`.** Instructors are self-employed
contractors, and their contract sets out how they engage with Peak. Employer
policies don't describe that relationship. Keeping staff-only documents in a
different area means they never share navigation, pages or queries with
instructor content. Before HQ, the instructor hub had an `office` role that
could see them; that path is gone.

---

## Adding a member of staff

There is no sign-up. Accounts are made deliberately.

1. **Supabase → Authentication → Users → Add user.** Tick auto-confirm, and set
   a temporary password or send an invite.
2. Then, in the SQL editor:

```sql
insert into public.staff_members (id, name, role, job_title, start_date)
select id, 'Alex Martin', 'staff', 'Booking specialist', '2026-11-02'
from auth.users where email = 'alex@peaksnowsports.com';
```

Roles:

- `staff` sees everything in HQ except the team view.
- `manager` also sees **Team**: everyone's onboarding details, emergency
  contacts, and which accounts they need.
- `admin` also edits staff rows and the checklist.

To remove access without losing history, set `active = false`. That takes
effect on the next request, including for someone already signed in. Deleting
the auth user deletes their onboarding details and checklist ticks with it,
which is what the onboarding form tells staff will happen.

---

## Onboarding

On first sign-in, `/hq` sends a new starter to `/hq/start` until they submit
their details:

- what they want to be called
- phone *(required)*
- an emergency contact and their phone *(required)*
- jacket size, for uniform
- which accounts they need: Peak email, SkiOperator, Google Chat, OneDrive,
  website editor
- anything else we should know

**Deliberately not collected:** numéro de sécurité sociale, IBAN, identity
documents. Those go to payroll directly and never pass through the portal.

Then a first-week checklist. The ten items live in `staff_checklist_items`;
edit them in the Supabase table editor. Set `active = false` to retire one
without losing who ticked it.

---

## Documents

HQ reads the same private Sanity dataset as the instructor hub, and the same
`portalDoc` type, so a shared policy exists once:

- `section` places a document in the instructor hub
- `hqSection` places it in Peak HQ
- a document can have either or both, never neither
- **tier 3** means staff only. The Studio refuses to give a tier 3 document an
  instructor hub section, the importer refuses it, and the instructor hub's
  query excludes tier 3 regardless.

Edit documents at `/admin/portal`. Import from the source `.docx` files with the
same script as the instructor hub. See `PORTAL.md`, step 4.

### What's in HQ

34 documents from the handover. 17 are shared with the instructor hub (code of
conduct, safeguarding, health and safety, how we work and so on), and 17 are
staff only: office manual, culture, phone etiquette, email templates, sales
training, GAP pipeline, chalet script, partner commission, paid time off,
working from home, morale events, duty of loyalty, immigration, separation of
employment, the 26/27 season plan, the ski camps explainer, and the booking
specialist job description.

**What we do** also lists every product with the page to send a client. Those
summaries are in `src/lib/hq/content.ts` and are copied verbatim from each
public page's own meta description, so they match what the client sees. Update
both together.

### Booking team pages

The **Booking team** section (`/hq/booking-team`) is the day-one guide for
booking specialists: welcome and first week, how Peak works, logins, the life
of a booking, the SkiOperator walkthrough, and the rate card. They are written
as markdown by David, kept in `portal-content/hq/booking-team/` (gitignored:
they hold team phone numbers and prices), and published with:

```
node --env-file=.env scripts/portal/seed-hq.mjs --dry-run
node --env-file=.env scripts/portal/seed-hq.mjs
```

The seeder turns markdown tables into a `table` block (rendered by
`src/components/hq/PtTable.astro`), rewrites links between the files to HQ
URLs, makes every page tier 3, and carries `owner` and `last_reviewed` onto the
page. A file whose front matter `status` starts with `outline` is held back,
and links to it become plain text. The SkiOperator walkthrough is held back
until it has screenshots.

### How documents look

Every document page in HQ and the instructor hub renders through
`src/components/doc/DocBody.astro`, styled like the public site: Geist
headings on hairlines, accent dot bullets, numbered steps with round accent
markers, and pull quotes. A `hero` photo (a path to an image already on the
site) sits across the top of the page, and a section whose documents have
photos shows them as cards.

Authored markdown can use richer blocks, which `seed-hq.mjs` turns into
Portable Text objects:

```
:::callout tip|rule|warning|note|action Title
Text, with **bold** and [links](/hq).
:::

:::template Title | when to use it      (an email, with a Copy button)
:::script Title | when to use it        (words said out loud)
:::pills                                 "- item" lines
:::facts                                 "- value | label" lines
:::flow                                  "- title | text" lines
::image /images/path.jpg | alt | caption
```

In templates, [square brackets] mark the gaps to fill.

**Thirteen documents are authored, not imported.** The six playbook
documents, "Ski camps, explained", mission and values, the code of conduct
(tier 1, version 2026.1, wording unchanged), how we work, how we
communicate, the email policy and the accident procedure were rewritten in
November 2026 and live under `portal-content/hq/`. They keep their original Sanity ids (front
matter `id`) and are no longer in `manifest.json`, so re-running
`import-docs.mjs` will not overwrite them.

`--draft` writes Sanity drafts that the live site cannot see, for previewing
new block types before the code that renders them is deployed; a normal run
publishes and removes the drafts. `--only=slug,slug` limits a run.

### Accident reports in HQ

Staff file and read accident reports at `/hq/accidents`, the same reports
instructors file in the hub (`/portal/ops/reports`): one table, two sets of
pages. Every active staff member can file and read every report in full, by
David's decision of 12 November 2026 (migration 0015). The panel linking to
them sits at the top of How we work and on the accident procedure.

### Email signature

The email policy carries the Peak signature (`::signature` in markdown,
`src/components/doc/Signature.astro`). It fills in the reader's name, job
title and phone from their HQ profile, and copies with its formatting for
pasting into Gmail. Its colours are written as hex because a pasted
signature can't use the site's tokens.

### People

The top of `/hq/people` shows how the roles fit together, as a diagram and as
cards, then the whole team with headshots. Roles and their hand-offs live in
`src/lib/hq/people.ts`, following the Basecamp framework (October 2026); pay
and Basecamp deliberations are deliberately left out. The teaching team is
the website's instructor list (`src/content/instructors`), so it updates with
the site. Office roles that are not on the website are listed in
`PeopleOverview.astro`.

Job descriptions are documents in the People section. The instructor,
Operations Lead and Marketing and Brand Lead ones are authored in
`portal-content/hq/people/` and published with `seed-hq.mjs` as tier 2.

**Instructors see People too** (David, 12 November 2026): the instructor hub
has its own People section (`/portal/people`) with the same diagram, team and
all four job descriptions, booking specialist included (moved from tier 3 to
tier 2 in the manifest). In `seed-hq.mjs`, `hubSection: people` in front
matter is what puts a document there, and it is refused unless the document
is tier 2.

### Was this unclear?

Every HQ document ends with a "Was this unclear?" form. Notes land in
`hq_page_feedback` (migration 0014) and are listed for managers at the bottom
of `/hq/team`, where they can be marked dealt with. Staff can only write their
own notes; nobody can edit or delete someone else's.

### Substitutions

SkiOperator is the only system staff use now, so the importer rewrites three
stale references. Each is declared in `scripts/portal/manifest.json`, and the
import reports how many times each one fired:

- `{{ contact.firstname }}` (a HubSpot merge tag) → `[first name]`, in email
  templates
- `Rezdy` → `SkiOperator`, in email templates and partner commission
- `Pipedrive-driven` → `SkiOperator-driven`, in the season plan

### Deliberately left out

- **Customer payments.** It documents Rezdy end to end and needs rewriting for
  SkiOperator by someone who knows the payment flow.
- **HubSpot guides.** Retired.
- **Sales & Marketing job description.** It is an Apple Pages file. Re-export it
  as Word or PDF and add it to the manifest.
- **Board material:** cash flow and dividend policies, the property and coffee
  van models.
- **Third-party course material.**

---

## Routes

| Route | |
|---|---|
| `/hq` | Home; sends people to `/hq/start` until onboarded |
| `/hq/start` | Onboarding form and first-week checklist |
| `/hq/<section>` | Booking team, what we do, how we work, playbook, policies, people |
| `/hq/<section>/<slug>` | One document |
| `/hq/team` | Managers only; 404 for anyone else |
| `/hq/login`, `/logout`, `/forgot-password`, `/reset-password` | Auth |

Every route sets `prerender = false`. Middleware guards them and sets
`Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. `/hq` is
disallowed in every crawler group in `robots.txt` and kept out of the sitemap.

---

## Setup status

- **Database:** migration `0008_staff_hq.sql` is applied to the live project.
- **Password reset:** add `https://www.peaksnowsports.com/hq/reset-password` and
  the staging equivalent to Supabase → Authentication → URL Configuration →
  Redirect URLs. Until then, reset emails fall back to the site's home page.
- **Documents:** blocked on the private `portal` Sanity dataset, same as the
  instructor hub. Until it exists, the document sections say so. Onboarding,
  the checklist, the team view and the product list all work without it.

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
