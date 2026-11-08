# Persistent election rooms and isolated rehearsal

Migration: `20261108155947_persistent_election_rooms_and_isolated_demo.sql`.

The stable participant route is `/vote/sala/:roomToken`. The token resolves a
server-owned room; it does not rely on the organizing browser's UMP localStorage.
Each real cargo remains an independent existing election. An authenticated
manager calls `election_room_ensure(p_election_id)` once, then
`election_room_attach(p_room_token,p_source_election_id,p_target_election_id)`
after copying a finished cargo to a new draft. Attach is idempotent and checks
both election permissions, society, sequence and the source's exact count. The
existing start command activates the attached successor through a database
trigger. Merely preparing a draft does not move participants away from the
previous result. Existing ballot Edge Function/RPC behavior is unchanged.

## Participant contract

`election_room_snapshot(p_room_token,p_device_id)` returns the room title,
revision, phase, `activeElection`, candidates, receipt (`already_voted`), count,
`eligible_candidate_ids`, `elected_ids`, `max_choices` and `published_result`.
The caller's random browser ID is not a personal identity. The accepted limit
remains one vote per browser/election/round, not a cross-browser identity check.

`published_result` is null unless the mesário has enabled `show_result` and the
current round has exactly one unique ballot per confirmed actual present.
Published data contains per-round totals/ranking and elected candidate IDs;
no ballot IDs, device IDs, attendance names or birth dates are returned.
Eligibility uses only previous rounds, with the existing runoff and cutoff tie
rules. A waiting draft does not expose its candidate names. A changed
election/round/revision must invalidate an in-progress client confirmation.

`election_public_count(p_election_id)` is the legacy presentation's sanitized
anonymous read. It returns only `election_id`, `current_round`, `total_present`
and distinct current-round `ballots`. Draft counts are zero. The client checks
the returned scope; it must not count choice rows or previous rounds.

## Isolated cross-device rehearsal

The rehearsal uses four RLS-enabled tables in `ipnc_private`, with no raw anon
or authenticated table privileges. Its cédulas never enter `public.elections`,
`public.election_votes`, `public.election_attendance` or production reports.
It has separate capabilities for participants, the mesário and a shared urn.
All expire after seven days. A public snapshot exposes neither control token.

Only the database administrator can run the explicitly synthetic importer:

```sql
select ipnc_private.create_election_demo(
  'Teste acompanhado — 150 participantes', 150,
  '{"Alfa":60,"Beta":55,"Gama":34}'::jsonb
);
```

This creates a **new isolated server rehearsal**, initialized to the agreed
149 synthetic ballots. It does not move, reinterpret or mutate any real vote,
nor does it consume the reserved 150th participant's vote. The original browser
fixture remains separate. Do not put the returned tokens in version control.
Serve the participant route through the existing public HTTPS app so Wi-Fi and
4G use the same server state. A localhost URL or browser-local fixture store
cannot provide that cross-device behavior.

The importer returns `room_id`, `room_token`, `admin_token`, `urn_token`,
`election_id`, `expires_at` and `imported_synthetic_ballots`.

- Participant: `election_demo_cast(p_room_token,p_device_id,p_election_id,
  p_round,p_ballot_id,p_choices,p_blanks)`. One browser per round, a stable ballot
  ID for retry, and a locked capacity check. Exact retries do not add a vote.
- Shared urn: `election_demo_urn_cast(p_urn_token,p_election_id,p_round,
  p_ballot_id,p_choices,p_blanks)`. Successive synthetic participants are allowed;
  the same capacity/round/idempotency rules apply. This capability cannot control
  the mesário. Suggested route: `/vote/sala/:roomToken?urna=:urnToken`.
- Mesário: `election_demo_command(p_admin_token,p_action,p_expected_revision,
  p_payload)`. `snapshot` reads the control state and urn capability. Mutations
  require the current revision. Actions: `start`, `publish`, `hide_result`,
  `next_round`, `finish`, `next_election` (`{position: "..."}`), and `complete`.
  The demo has one seat and one choice per ballot; names are Alfa/Beta/Gama.
  New demo cargos copy the synthetic quorum and these names with new IDs, begin
  as drafts, and require an explicit mesário start. Real next-cargo candidate
  entry remains separate and unchanged.

The shared room row serializes demo casts and mesário commands. Missing ballots,
surplus attempts, stale rounds, stale control revisions, invalid/null candidates
and unauthorized capabilities are rejected. Results below first-round absolute
majority do not elect the leader; round two preserves simple majority. The SQL
aggregate is tested against the existing TypeScript calculation, including
multi-seat cutoff ties and the third-round age rule for real elections.

## Verification and deployment

`tests/election-rooms-database.test.mjs` executes the actual migration in PGlite.
It covers isolated 149 import, reserved last ballot, duplicate response retries,
capacity, receipts, secret separation, grants, expiry, control transitions,
retained historical ballots, real-room switching, exact distinct-ballot counts,
rule parity and migration reapplication. The existing ballot/count database
tests also pass. PGlite uses one connection: these tests cover serialized
operation orders, not native multi-connection lock contention.

Apply the migration and its migration-history record in one transaction. Verify
the history source hash, function `search_path`, function grants, private-table
RLS/no client SELECT privileges and the enabled `election_room_changed` trigger.
No real-election mutation is required for deployment verification. Seed the
user's isolated rehearsal only after the schema verification; do not exercise
its final vote for testing. Run the full repository checks before publication.

Applied on 2026-11-08 through the authorized project's SQL Editor, in one
transaction with migration history. The deploying agent verified source MD5
`2d37a417b8541622a82331b69866a408`, protection of the four private tables and
privileged functions, the five intended anonymous capability/read endpoints,
and the enabled `election_room_changed` trigger. This verification changed no
real election, vote or attendance record. Frontend publication and the separate
synthetic rehearsal import are independent delivery steps.
