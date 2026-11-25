# Opportunity Catalog

A job search for college students: internships, co-ops, fellowships, apprenticeships and entry-level jobs, refreshed every morning from employers' own job boards.

[Open the live site](https://farhankhan-mis.github.io/GitHub-Portfolio/)

## How listings stay accurate

- **Daily refresh.** `.github/workflows/catalog-refresh.yml` runs `scripts/refresh_catalog.mjs` every morning. It reads the documented public posting feeds (Greenhouse, Lever, Ashby, SmartRecruiters) of every employer in `data/sources.json` and keeps US student and early-career postings.
- **Closed means gone.** A posting that leaves its employer's feed is marked Closed the next day and disappears from search. A listing with a passed deadline is closed too. Closed feed listings are pruned after 45 days; git keeps the history.
- **Safe by default.** If a board fails to load, its listings are left alone rather than closed. If a third of boards fail, or open listings drop by half, the run stops without writing anything. The site is published only when the validator and unit tests pass.
- **Explainable classification.** `scripts/lib/classify.mjs` uses plain rules to decide whether a posting is for students, and to set its type, field, role, location, work mode and term. `scripts/classify.test.mjs` pins the rules down with real titles.
- **Hand-verified listings.** Employers without a public feed (for example, Workday sites) are added by hand and appear in search only while their last check is under 14 days old.

## Privacy

There are no accounts and no tracking. Saved jobs, application statuses and notes are stored only in the visitor's browser (`localStorage`) and are never sent anywhere. The repository holds public posting data only. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Working on it

```text
npm test                         # syntax, classifier tests, catalog validation
node scripts/refresh_catalog.mjs --dry-run      # read feeds, print the summary, write nothing
node scripts/refresh_catalog.mjs --out=tmp.json # write the result somewhere else to inspect it
```

To add an employer, add `{ "ats": "greenhouse" | "lever" | "ashby" | "smartrecruiters", "slug": "<board name>", "company": "<display name>" }` to `data/sources.json`. Optionally add `default_role` and `default_field` (taxonomy values) for employers whose titles don't say the field, such as a newsroom.

## Architecture

- `index.html`, `styles.css`, `app.js`: static GitHub Pages site. Search, filters, list and detail view, and the private tracker.
- `opportunities.json`: the listings; `data/refresh-status.json`: when and how the last refresh ran.
- `taxonomy.js`: career fields, roles and opportunity types.
- `scripts/`: refresh, classifier, validation and audit.
- `.github/workflows/catalog-refresh.yml`: the daily refresh and publish.
