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
| `/hq/<section>` | What we do, how we work, playbook, policies, people |
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
