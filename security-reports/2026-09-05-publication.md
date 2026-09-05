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

## Published and checked

- Sites version 4 deployed successfully; audience explicitly changed to public.
- Anonymous HTTP requests to /, /auth, /financas and /manifest.json return 200.
  Downloaded live application bundle identifies the owned backend, has the finance
  correction and contains no old backend hostname.
- Application changes merged to GitHub main without rewriting its history.
  Main build/regression and responsive-shell checks passed.
- Retired a malformed historical one-time workflow that rewrote login source.
  It now only displays an informational message when manually dispatched.
- Supabase Site URL saved as the public Site origin; exact /auth and
  /reset-password redirect entries saved and verified after dashboard reload.
- Final comparison: 49 normalized table digests/counts match the source.
  All three release-validation accounts removed; 32 original accounts remain.
  Zero temporary profiles or test receipts remain.
- Chrome successfully renders the published login screen. It now requires login
  against the owned backend; the source session is intentionally not reused.

## Remaining acceptance checks

Publication verification and full desktop/mobile Computer walkthrough are recorded
after deployment. Computer inspection became stuck returning an old Supabase
sidebar with no screenshot; user was asked to refocus Chrome. Do not interpret
backend checks as proof that every screen was visually tested.
The user was asked to sign in on the Chrome Site tab using their normal access.
Existing username/password login is independently verified by live fixtures;
the full visual PIN workflow with the user's account still needs acceptance.
This is not a completed exhaustive security audit or a promise of zero defects.

No real financial transaction, real password reset or source deletion was performed.
Private backups, account passwords, auth tokens and API secrets stay out of Git.
