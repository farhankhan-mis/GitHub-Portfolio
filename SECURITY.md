# Security model

The public portfolio demo contains fictional data. The account-enabled version
uses Supabase Auth and Postgres Row Level Security (RLS).

## Core rules

- Every private row carries the signed-in user's `user_id`.
- RLS compares that value with `auth.uid()` on every read and write.
- Signed-out (`anon`) database access is revoked.
- The browser receives only a Supabase publishable key.
- A Supabase secret or `service_role` key must never appear in this repository,
  browser code, screenshots, or GitHub Pages settings.
- Résumé files use a private owner-only storage bucket. Extracted text remains in an owner-only RLS record.

## Required production checks

- Verify RLS with two unrelated test accounts before public launch.
- Keep the service-role key only in Supabase function secrets or GitHub Actions encrypted secrets.
- Enable CAPTCHA, authentication rate limits, leaked-password protection, and custom SMTP.
- Test deletion of the authentication user, database rows, and private storage objects.
- Do not use recommendation scores for employment decisions; they only organize opportunities for the user.

## Before launch

1. Confirm email verification is enabled.
2. Restrict redirect URLs to the production Pages URL and local development URL.
3. Run `supabase/schema.sql`.
4. Test two accounts and confirm neither can access the other's records.
5. Review Supabase Security Advisor and resolve every RLS warning.
6. Add rate limiting or CAPTCHA before enabling open public registration.
7. Publish a privacy notice and account-deletion process before collecting real user data.
