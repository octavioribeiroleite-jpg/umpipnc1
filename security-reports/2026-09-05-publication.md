# Publication validation — 2026-09-05

This report supersedes the earlier migration gate where explicitly noted.
Public hosting and GitHub main publication are authorized. Member portal stays
closed, preserving existing accounts; no name-only impersonation endpoint remains.

## Verified

- Gemini paid project confirmed by owner; prior live text/JSON/tool-call tests passed.
- 30 offline tests, explicit app TypeScript project check, production Vite build.
- Computer inspection reproduced the finance crash: duplicate mounting attempted
  to add postgres_changes handlers after subscribing to annual-charges-realtime.
  The responsive layout now mounts content once and finance channels are unique.
- Root error recovery and bounded permission fetches avoid silent blank screens.
- Real temporary admin and director account-login calls passed.
- Twelve screen data sources read successfully under authenticated director.
  Five foreign-society reads returned no rows; four anonymous data reads denied.
- Real director-created temporary viewer passed the create-user endpoint and
  transactional onboarding. Existing member links cannot be overwritten.
- Private receipt upload uncovered ambiguous SQL name resolution. A new migration
  qualifies storage.objects.name in receipt and election-photo policies.
  Retest: upload, signed download, exact-byte comparison and fixture deletion passed.
- Birthday cron restored at the source schedule, 11:00 UTC daily; service-only,
  transaction-locked generation with unique day/type constraint.
- Fresh source comparison identified one updated study summary; copied with
  optimistic target hash guard, preserving source and both private backup versions.

## Remaining acceptance checks

Publication verification and full desktop/mobile Computer walkthrough are recorded
after deployment. Computer inspection became stuck returning an old Supabase
sidebar with no screenshot; user was asked to refocus Chrome. Do not interpret
backend checks as proof that every screen was visually tested.
Auth Site URL/redirect configuration still requires verification in the dashboard.
Existing username/password and PIN login are independently verified.
This is not a completed exhaustive security audit or a promise of zero defects.

No real financial transaction, real password reset or source deletion was performed.
Private backups, account passwords, auth tokens and API secrets stay out of Git.
