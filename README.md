# Public Opportunity Catalog

A static, privacy-safe catalog of internships and early-career opportunities collected from public sources.

[View the live catalog](https://farhankhan-mis.github.io/GitHub-Portfolio/)

## Scope

This project contains only public opportunity metadata. It must never contain a private application tracker, application statuses, notes, networking contacts, résumés, extracted résumé text, user accounts, or credentials.

The browser reads `opportunities.json` directly. Search and filtering run locally; there is no account system and no private data collection.

## Catalog rules

- Prefer canonical employer application pages.
- Every record requires an HTTPS source URL and a verification date.
- Records older than 14 days are shown as needing re-verification.
- Passed deadlines are closed during normalization.
- A stable `canonical_key` prevents duplicates across publishing systems.
- `node scripts/validate_catalog.mjs` must pass before publishing or syncing.

## Maintenance

```text
node scripts/normalize_catalog.mjs
node scripts/validate_catalog.mjs
node scripts/audit_catalog.mjs
```

The Supabase sync is optional and public-only. It validates the catalog, upserts current records, and closes database records no longer present in the JSON source. Its service-role credential belongs only in encrypted GitHub Actions secrets.

## Architecture

- `index.html`, `styles.css`, `app.js`: static GitHub Pages interface
- `opportunities.json`: public source of truth
- `taxonomy.js`: classification vocabulary used by maintenance workflows
- `scripts/`: normalization, validation, audit, and optional Supabase sync
- `.github/workflows/catalog-sync.yml`: scheduled validation and public sync

See [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).
