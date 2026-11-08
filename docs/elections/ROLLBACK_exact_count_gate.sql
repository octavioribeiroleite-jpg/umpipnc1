-- Emergency rollback only: removes count protection, changes no business rows.
-- Reconcile migration history separately if this rollback is deliberately used.
begin;
drop trigger if exists election_exact_count_transition on public.elections;
drop trigger if exists election_attendance_count_lock on public.election_attendance;
drop trigger if exists election_votes_count_lock on public.election_votes;
drop function if exists ipnc_private.guard_election_count_transition();
drop function if exists ipnc_private.lock_election_count_child_write();
drop index if exists public.idx_election_attendance_present_count;
drop index if exists public.idx_election_votes_round_ballot_count;
commit;
