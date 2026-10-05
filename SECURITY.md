# Security policy

## Public-only boundary

This repository accepts public opportunity metadata only. Never add private trackers, user accounts, application history, notes, contacts, résumés, extracted text, local file paths, API secrets, or personal identifiers.

## Browser protections

- The interface creates DOM nodes and assigns untrusted values with `textContent`.
- External links are restricted to HTTPS and use `noopener noreferrer`.
- The page defines a restrictive Content Security Policy and does not load third-party scripts.
- The site has no authentication, uploads, forms that transmit data, or cross-origin API access.

## Publishing controls

- Run catalog validation before publishing.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in encrypted workflow secrets.
- Treat the Supabase copy as a public catalog mirror, never as a source of private data.
- Review dependency and workflow action updates before merging.

To report a security issue, use GitHub's private vulnerability reporting feature rather than a public issue.
