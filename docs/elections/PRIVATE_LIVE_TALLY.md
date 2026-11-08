# Private live tally for the isolated rehearsal

Migration: `20261108195243_election_private_live_tally.sql`.
Source MD5: `f7e8fb2824cf70379ebfbb0867f4d314`.

The mesário's `election_demo_command` response adds
`admin_live_result: { candidates, rounds }`. It uses the same aggregate shape
as `published_result`, including previous rounds and the current partial tally.
Candidates exclude birth dates. No individual ballots or browser identifiers
are returned. The current round is a **preview** until the count is exact;
clients must not describe its provisional `electedIds` as a confirmed result.

Only the existing private control helper changes. It remains security invoker,
with an empty search path and no execute permission for PUBLIC, anon or
authenticated. The existing command authenticates the secret mesário capability
before calling it. Participant and urn tokens do not authorize this response.
The participant snapshot, public report, casting endpoints, revision guards,
and stored business rows are unchanged. Public results remain subject to the
existing explicit release and exact-count requirements.

The database tests exercise anonymous calls with and without the control
capability, partial current and previous rounds, read-only snapshots, stale
revision rejection, blocked publication of incomplete counts and idempotent
reapplication. PGlite is an isolated single-connection database; these tests do
not exercise native multi-connection contention or any user rehearsal.

Applied on 2026-11-08 by the deploying agent through the authorized SQL
Editor in Chrome, using the transactional migration-history wrapper. Postflight
verification confirmed source MD5 `f7e8fb2824cf70379ebfbb0867f4d314`, denied direct
execution of the private helper for both anon and authenticated roles, presence
of the admin preview in the control helper and its absence from the public
snapshot. Verification did not cast a vote, invoke a mesário command or update
business rows. The validated SQL source remains unchanged; frontend publication
is a separate delivery step.
