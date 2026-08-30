# SkiBooker — 10 Draft Blog Posts

10 insider-voice draft blog posts for SkiBooker (ski-booker.com), 400-600 words each, written from a working-instructor perspective.

## What's included

| # | Slug | Topic |
|---|------|-------|
| 1 | `prepare-for-winter-ski-holiday` | How to prepare for a winter ski holiday |
| 2 | `top-tips-skiing-with-family` | Top tips when skiing with the family |
| 3 | `best-things-to-do-in-morzine` | Best things to do in Morzine |
| 4 | `best-things-to-do-in-meribel` | Best things to do in Méribel |
| 5 | `best-things-to-do-in-verbier` | Best things to do in Verbier |
| 6 | `ski-horoscope-2026` | The 2026 ski horoscope |
| 7 | `how-to-choose-the-right-ski-school` | How to choose the right ski school |
| 8 | `off-piste-vs-piste-resort-choice` | Off-piste vs piste resort choice |
| 9 | `real-cost-ski-holiday-2026` | Real cost of a ski holiday in 2026 |
| 10 | `why-book-ski-lessons-in-advance` | Why book ski lessons in advance |

## How to push to Sanity as drafts

Each markdown file has YAML frontmatter (title, slug, excerpt, SEO fields, categories, tags). I've also generated **`sanity-import.ndjson`** — a Sanity-native bulk import file where every document is prefixed with `drafts.` so it lands in Studio as a draft, not a published document.

### Option 1 — Sanity CLI (recommended)

From your SkiBooker Sanity project directory:

```bash
sanity dataset import sanity-import.ndjson <your-dataset> --replace
```

(Use `--missing` instead of `--replace` if you want to keep any existing post with the same `_id` untouched.)

### Option 2 — Adjust schema mapping first

The NDJSON assumes a `post` schema with these fields:
- `title` (string)
- `slug` (slug)
- `excerpt` (text)
- `seo.title`, `seo.description` (object)
- `categories` (array of strings) — change to references if your schema uses category documents
- `tags` (array of strings)
- `body` (Portable Text — array of blocks)

If your actual SkiBooker schema names these differently (e.g. `metaTitle` instead of `seo.title`, or category references instead of strings), edit `build_sanity_import.py` and re-run it before importing.

### Option 3 — Manual

Open each `.md` file, copy the body into Sanity Studio manually, paste the frontmatter values into the corresponding fields, save as draft.

## Notes on voice & content

- **Voice:** "insider/local expert" — first-person plural ("we"), references to teaching/running schools, opinionated where it should be, restrained where it counts.
- **CTAs:** Every post ends with a soft SkiBooker CTA referencing the marketplace.
- **SEO:** Each post has a unique `seoTitle` and `seoDescription` written for search intent, plus targeted tags.
- **Length:** All in the 400-600 word range as requested (a couple run slightly longer where the topic demanded — horoscope and cost piece).
- **Resort facts:** Restaurant names, lift names, and resort details are based on common knowledge of these resorts. **Please have someone with current local knowledge verify specific business names and current operating status before publishing** — restaurants close, lifts get renamed, prices change.

## Files

```
01-prepare-for-winter-holiday.md
02-skiing-with-family.md
03-morzine.md
04-meribel.md
05-verbier.md
06-ski-horoscope.md
07-choose-ski-school.md
08-offpiste-vs-piste.md
09-cost-ski-holiday.md
10-book-lessons-advance.md
sanity-import.ndjson          ← bulk import file
build_sanity_import.py        ← regenerate NDJSON after editing markdown
README.md                     ← this file
```
