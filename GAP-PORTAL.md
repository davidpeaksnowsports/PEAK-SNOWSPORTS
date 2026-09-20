# GAP student portal

Server-rendered area at `/gap`, behind a login. Same repo, same deploy, same
Winter Collection design system as the public site and the instructor portal.

Not to be confused with `/gap-course`, the public marketing page — that stays
public, indexed and unchanged.

---

## What it is for

One place that answers three questions every day:

- What am I doing next?
- What do I need to complete?
- Am I on track to pass?

Structurally it is a journey — pre-arrival → training → feedback → experience →
assessment readiness — not a content library.

---

## Routes

| Route | What it does |
|---|---|
| `/gap` | Dashboard: today, next three activities, readiness, actions, announcements |
| `/gap/programme` | Today / this week / full course, plus `/gap/programme.ics` |
| `/gap/progress` | The six-point benchmark. Self-assessment beside the coach's |
| `/gap/workbook` | Module list with status, reflections, evidence, coach comments |
| `/gap/learning` | Off-snow resources by week and topic |
| `/gap/experience` | Shadowing log + `/gap/experience.csv` export |
| `/gap/resort` | Resort guide with map links |
| `/gap/checklist` | Pre-arrival tasks and packing |
| `/gap/essentials` | FAQs, contacts, emergency procedure |
| `/gap/feedback` | Session feedback, confidential course feedback, support requests |
| `/gap/checkin` | Two-minute weekly reflection |
| `/gap/staff` | Coach dashboard, sorted by who needs attention |
| `/gap/staff/assess` | **Bulk assessment** — the whole group in one grid |
| `/gap/staff/verify` | Experience verification queue |
| `/gap/staff/student/[id]` | One student's whole record |

Every route sets `prerender = false`; `src/middleware.ts` guards them.

---

## Why the data is in Postgres, not Sanity

The instructor portal keeps its content in a private Sanity dataset because it
*is* content — documents someone writes and someone else reads.

This portal is almost entirely structured records: activities, criteria,
scores, log entries, checklist ticks. Those want a schema, foreign keys and
row-level security, which is Postgres. The handful of genuinely editorial
pieces — the resort guide, the FAQs — are in Postgres too, so the coach admin
is one system rather than two.

Nothing about the portal lives in this repo as content, for the same reason as
`/portal`: **`github.com/davidpeaksnowsports/PEAK-SNOWSPORTS` is public.**

---

## Access model

Three roles in `gap_members.role`:

| Role | Sees |
|---|---|
| `student` | Their own cohort's content, and their own records |
| `coach` | The same, plus every student on **their** cohort |
| `admin` | Every cohort, plus confidential course feedback |

Enforced by RLS, not by the pages. Two consequences worth knowing:

- **A student guessing `/gap/staff` is redirected home**, and a coach querying a
  student on another cohort gets nothing back — so the student page 404s rather
  than returning a "forbidden" that confirms the person exists.
- **Confidential course feedback is invisible to coaches**, including the coach
  it might be about. That is a policy in `gap_feedback`, not a filter in a page,
  because feedback nobody believes is private is feedback nobody gives.

Students cannot see each other. A student directory is a phase-two feature, and
the roster row carries dietary and medical notes, so it cannot simply be opened
up when that is built.

### What students cannot write

Three things are locked by database triggers rather than by policy, because
policies gate rows and these are columns:

- **A self-assessment is always `source = 'self'`** and always their own.
- **An experience entry is always `pending`.** Editing an already-verified entry
  sends it back to pending — verified hours must be hours a coach actually saw.
- **An action's title, detail and deadline are the coach's.** A student can move
  the status and nothing else.

---

## Setup

### 1. Supabase

Same project as the instructor portal. Run the migration:

```bash
supabase db push
```

Or paste `supabase/migrations/0002_gap_student_portal.sql` into the SQL editor.

### 2. Create a cohort

```sql
insert into public.gap_cohorts
  (name, slug, resort, starts_on, ends_on, assessment_on, experience_target_hours)
values
  ('Morzine 2027', 'morzine-2027', 'Morzine', '2027-01-03', '2027-02-12', '2027-02-08', 35);
```

`assessment_on` drives the "14 days until assessment" line on the dashboard.
`experience_target_hours` is the denominator on every hours figure.

### 3. Seed the reference content

```bash
npm run gap:seed -- --cohort morzine-2027
```

Seeds the benchmark criteria (global), and the workbook modules, checklist and
essentials for that cohort. Idempotent — re-run it freely. Add `--dry-run` to
see what it would do.

It needs `SUPABASE_SERVICE_ROLE_KEY` locally. **Never set that in Vercel.**

Not seeded, because there is nothing sensible to invent: the programme, the
resort guide and the learning hub. Those are per-intake and per-resort.

### 4. Create accounts

There is no public sign-up. In **Authentication → Users → Add user**, set the
user metadata so the trigger files them as a GAP member on the right cohort:

```json
{ "gap": true, "name": "Ada Lovelace", "cohort": "morzine-2027" }
```

Without `"gap": true` no profile row is created and the account cannot sign in
to `/gap` — which is what keeps instructor-portal accounts out of it.

Promote a coach:

```sql
update public.gap_members set role = 'coach' where id = '<auth-uid>';
```

### 5. Password reset URLs

Add to **Authentication → URL Configuration → Redirect URLs**:

```
https://www.peaksnowsports.com/gap/reset-password
https://staging.peaksnowsports.com/gap/reset-password
```

### 6. Notifications (optional)

Support requests and "I'd like to speak to a coach" check-ins email via the
existing Resend account. Set `GAP_SUPPORT_TO` if they should go somewhere other
than hello@peaksnowsports.com. Sending is best-effort — the record is written
to the database first, so a Resend outage loses a notification, never a request.

---

## The six-point scale

Deliberately developmental rather than a mark out of six, so a 2 in week one
reads as on-track rather than as a fail:

| | |
|---|---|
| 1 | Introduced |
| 2 | Understanding |
| 3 | Developing |
| 4 | Demonstrating |
| 5 | Consistent |
| 6 | Assessment ready |

Headings and criteria are configurable — edit `gap_criteria` in Supabase to
match the BASI course and the current assessment criteria. Do not edit the seed
script and re-run it mid-season: scores reference criteria by id.

### How readiness is calculated

`readiness()` in `src/lib/gap/course.ts`. Three things about it are deliberate:

- **Coach scores only.** A self-assessment beside the coach's is the point of
  the page, but it must never move the headline number.
- **The denominator is every active criterion**, not every criterion scored so
  far. "78% ready" means "we have seen 78% of what you need to show", not "of
  the three things we looked at, you did well."
- **Three strands, never one average.** Strong skiing must not be able to hide
  weak teaching — that is the exact failure the page exists to catch, so the
  dashboard headline takes the *weakest* strand, not the mean.

Readiness is an informed coaching indicator. It is not a prediction and not a
guarantee of passing; the pages say so where a student will read it.

---

## Known limits

- **`/gap/programme.ics` is a download, not a live subscription.** Calendar apps
  do not send cookies when they refresh, so a subscription would 302 to login. A
  real subscription needs a signed per-student token URL — worth building, not
  worth blocking the calendar export on.
- **No video hosting.** Learning-hub videos are links to Vimeo or unlisted
  YouTube. Native upload and timestamped feedback are phase two.
- **No student-to-student anything.** No directory, no messaging, no social feed.
- **Passport, medical and dietary data is not collected in the portal.** Those
  are pre-arrival checklist items that point at the office, because that data
  needs retention rules and access controls a tick-box list does not have. The
  `gap_members` columns exist for staff to record what the office holds; nothing
  in the student UI writes to them.
- **No automated readiness prediction, no CV builder, no parent access, no BASI
  platform integration.** All explicitly out of MVP scope.
