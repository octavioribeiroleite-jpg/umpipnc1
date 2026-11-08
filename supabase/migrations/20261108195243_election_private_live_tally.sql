begin;

-- Only the capability-authenticated mesário command calls this private helper.
-- No participant snapshot, public report, casting rule or business row changes.
create or replace function ipnc_private.election_demo_control_snapshot(p_room_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 r ipnc_private.election_rooms;
 e ipnc_private.election_demo_elections;
 current_candidates jsonb;
 public_candidates jsonb;
 live_rounds jsonb;
begin
 select * into r from ipnc_private.election_rooms where public_token=p_room_token and kind='demo';
 select * into e from ipnc_private.election_demo_elections where id=r.active_election_id;
 select coalesce(jsonb_agg(c),'[]') into current_candidates
 from jsonb_array_elements(e.candidates) c where (c->>'nomination_round')::integer=e.current_round;
 select coalesce(jsonb_agg(c-'birth_date'),'[]') into public_candidates
 from jsonb_array_elements(e.candidates) c;
 select ipnc_private.election_aggregate_rounds(
  coalesce(jsonb_agg(jsonb_build_object('ballot_id',b.ballot_id,'candidate_id',b.choices[1],
   'round_number',b.round_number,'is_blank',b.blanks=1) order by b.created_at,b.ballot_id),'[]'),
  e.candidates,1,e.current_round,e.majority_rule)
 into live_rounds from ipnc_private.election_demo_ballots b where b.election_id=e.id;
 return public.election_room_snapshot(r.public_token,null)||jsonb_build_object(
  'room_token',r.public_token,'urn_token',r.demo_urn_token,
  'attendance',e.attendance,'attendance_confirmed',e.attendance_confirmed,
  'current_candidates',current_candidates,'all_candidates',e.candidates,
  'admin_live_result',jsonb_build_object('candidates',public_candidates,'rounds',live_rounds));
end;
$$;
revoke all on function ipnc_private.election_demo_control_snapshot(uuid) from public,anon,authenticated;

commit;
