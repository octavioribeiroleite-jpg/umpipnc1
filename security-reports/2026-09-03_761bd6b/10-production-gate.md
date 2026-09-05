# Migration release gate: REJECTED

## Update 2026-09-05 — supersedes historical findings below

Public publishing is explicitly authorized, but not executed until release gates pass.
Owned-backend RLS/grants, separate EBD sessions, safe ballot/visitor transports,
private receipt paths, scoped account/task access and 25 Edge Functions are implemented.
Member-login remains undeployed pending the individual-password decision.

25 offline tests, TypeScript and production build pass. Local SQL negative tests
pass; live synthetic Auth, EBD isolation and attendance writes pass. All synthetic
accounts and business fixtures were removed; 32 real Auth users remain. Final
49-table normalized source/target comparison has zero discrepancies, accounting
for intentional legacy shared-account deactivation and additive schema fields.

OpenAI live generation fails because the upstream rejects the configured key
(401; no secret read or logged). User is considering Gemini; provider change is
not yet approved. Auth redirect configuration, replacement birthday schedule,
member auth, remaining financial workflow tests, fresh cutover delta and public
deployment are still pending. This is NOT a completed full security audit.

---

## Historical state (2026-09-03)

This is a migration gate in progress, not a completed full security audit. No new version has been published. Source data and backend remain unchanged. The owned target still has no client data policies/grants and no deployed Edge Functions.

## Completed safely

- Official baseline database import previously independently verified with 75 exact comparisons.
- All 32 Storage objects uploaded. Independent SQL confirms exact paths, sizes and MIME; zero missing or unexpected objects. Receipts stay private; election photos public by explicit prior approval.
- User saved OPENAI_API_KEY in target Secrets; its value was never read or stored by the agent. No paid API smoke performed.
- 24 offline repository tests passed again.

## Blocking user choice

Existing member login proves no individual identity: selecting a member name can replace credentials on a linked existing account and return its session, including any elevated roles. No live exploit attempted. There are 17 active members: 15 already have individual linked accounts, and two do not. No usable real emails are recorded, so e-mail OTP cannot be assumed as a migration replacement.

Requested approval: require the existing individual username/password flow for members, preserving the 15 account IDs/password hashes. The administrator would provision the other two members. Await the user's decision; do not reset personal passwords or silently select a different identity model.

## Other integration gates still open

RLS, Storage path ownership, EBD operational capability/gateway, cross-society task/account/plenary checks, anonymous voting transport, shared service-account credentials, scheduled-function caller authentication, current data drift and final authenticated tests. Proposals are research only and are not deploy-ready. The member choice is not the only remaining implementation work.

Research evidence is stored privately outside the Site under migration-research/auth, migration-research/rls and migration-research/ebd. No backup, PII or credential value belongs in this report or in a source commit.
