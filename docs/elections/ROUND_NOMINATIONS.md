# Fresh nominations for each escrutínio

Migration: `20261108163118_election_round_nominations.sql`.

The mesário controls nominations and start. Phones cannot nominate candidates.
An election remains `status = 'open'` between rounds, preserving the existing
confirmed-call and exact-count guards. Its new `nominations_open` field blocks
voting during preparation. Advancing a round still requires the previous
round's exact ballot count; it also refuses filled seats and rounds beyond the
existing three-round limit. The transition opens nominations, clears the old
runoff eligibility list and hides results. It never deletes candidates or votes.

Candidates have `nomination_round`. The database assigns the current round on
insert and permits changes only in the initial draft or current nominations.
Historical candidates and previous-round votes cannot be rewritten/deleted by
ordinary candidate/reset operations. The first migration application assigns
existing catalogs to their then-current round for legacy compatibility; it
keeps all IDs, names, photos, choices and ballot history. Reapplication does not
repeat that assignment.

`election_start_nominated_round(p_election_id,p_expected_round)` requires an
authenticated manager, at least one current nominee and no current-round
ballots. It returns `{id,current_round,nominations_open:false}`. Adding a name
is already an accepted nomination; there is no extra approval stage. Only the
explicit start unlocks voting. Both the legacy ballot RPC and child-table
triggers reject voting during nominations; candidate scope is checked on each
insert. Existing majority, multi-seat and age rules remain in effect.

Room snapshots add `activeElection.nominations_open`, candidate
`nomination_round`, and phase `nominations`. Phones see no current candidate
names or eligible IDs while nominations are open. The organizing UI keeps all
candidates for historical results and filters only the entry form to the
current round. The room revision changes on the explicit start as well as on
round/status changes.

## Empty isolated rehearsal

The DBA can create a new, completely empty isolated rehearsal using:

```sql
select ipnc_private.create_election_demo('Teste acompanhado — desde o início',0,'{}'::jsonb);
```

The returned demo is a draft with zero attendance, zero confirmed presents,
zero candidates and zero ballots. It expires in seven days and retains the
separate participant, urn and mesário capabilities described in
`PERSISTENT_ROOMS.md`. It does not create records in real election tables.
Existing isolated rehearsals retain their ballots; the migration only backfills
their synthetic attendance metadata and candidate round scope.

`election_demo_command` keeps its token/revision contract and adds:

- `configure`: `{name,position}` in the initial draft.
- `attendance_add`: `{name,present?}`; default absent.
- `attendance_bulk_add`: `{names:string[],present?}`; one atomic operation,
  maximum 2,000 total rows. Invalid lists roll back completely.
- `attendance_toggle`: `{id,present}` and `attendance_remove`: `{id}`.
- `confirm_attendance`: explicitly confirms the actual positive present count.
- `candidate_add`: `{name}` and `candidate_remove`: `{id}` for the current
  nomination stage only.

Attendance edits invalidate its confirmation; candidate entry in an initial
draft requires the call to have been confirmed. After voting begins, the call
cannot change. `start` serves both an initial draft and an open nomination stage.
`next_round` creates an empty nomination list while keeping historical names.
`next_election` copies confirmed synthetic attendance, creates no candidates,
and waits for the mesário to indicate names and start. Nothing starts on load.

An authenticated-by-capability control snapshot additionally returns
`attendance`, `attendance_confirmed`, `current_candidates` and `all_candidates`.
None of these control-only additions are exposed by the participant snapshot.

## Public report

`election_room_report(p_room_token)` returns
`{room_id,title,generated_at,completed,elections}`. Entries follow cargo order
and contain election metadata, public candidates, aggregate `rounds`,
`electedIds`, and the verified `count`.

Only **finished, explicitly published and exactly counted** cargos are included.
An unfinished, hidden or inconsistent cargo is omitted. Each included cargo
contains all its historical escrutínios, preserving old and new nominations.
The endpoint exposes no attendance names, raw ballot/device identifiers, birth
dates or mesário/urn secrets. It is suitable for the public downloadable report.

## Verification

`tests/election-nominations-database.test.mjs` executes the previous room and
count migrations plus this migration in PGlite. Cases cover empty second/third
rounds, old/new/blank vote rejection during nominations, manager-only start,
fresh setup order, atomic bulk attendance, exact-count blockers, old 149-ballot
rehearsal preservation, report visibility/order and idempotent migration
reapplication. Existing ballot, exact-count and room database suites also pass.
PGlite has one connection; tests exercise serialization outcomes, not native
multi-connection contention. Deployment verification should inspect metadata
without consuming a vote in the user's rehearsal or any real election.

Applied on 2026-11-08 through the authorized project's SQL Editor. The deploying
agent verified migration source MD5 `4c62c0538b4ffaae75f189db9f0bba6a`, all six
enabled guards/triggers, denied anonymous execution of the round-start RPC,
allowed authenticated-manager execution, and the intended public report grant.
The validated backend source remains unchanged; frontend publication is a
separate delivery step.
