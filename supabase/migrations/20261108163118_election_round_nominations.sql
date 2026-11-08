begin;

-- Keep the election OPEN while the mesário prepares another round. A separate
-- persisted gate blocks every vote until fresh nominations are explicitly started.
alter table public.elections add column if not exists nominations_open boolean not null default false;
-- Existing catalogs were reused by legacy runoffs. Assign their current scope
-- once; candidate IDs and every historical vote/name/photo remain unchanged.
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='election_candidates' and column_name='nomination_round') then
  alter table public.election_candidates add column nomination_round integer not null default 1;
  update public.election_candidates c set nomination_round=e.current_round from public.elections e where c.election_id=e.id;
 end if;
end $$;
create index if not exists election_candidates_round_scope on public.election_candidates(election_id,nomination_round);
alter table ipnc_private.election_demo_elections add column if not exists nominations_open boolean not null default false;
alter table ipnc_private.election_demo_elections add column if not exists attendance jsonb not null default '[]';
alter table ipnc_private.election_demo_elections add column if not exists attendance_confirmed boolean not null default false;
alter table ipnc_private.election_demo_elections drop constraint if exists election_demo_elections_total_present_check;
alter table ipnc_private.election_demo_elections add constraint election_demo_elections_total_present_check check(total_present between 0 and 2000);
-- Compatibility for preexisting, exclusively synthetic rehearsals.
update ipnc_private.election_demo_elections e set attendance=(select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'name','Participante fictício '||n,'present',true)) from generate_series(1,e.total_present) n),attendance_confirmed=true
 where e.total_present>0 and e.attendance='[]'::jsonb;
update ipnc_private.election_demo_elections e set candidates=coalesce((select jsonb_agg(c||jsonb_build_object('nomination_round',e.current_round)) from jsonb_array_elements(e.candidates) c),'[]')
 where exists(select 1 from jsonb_array_elements(e.candidates) c where not (c ? 'nomination_round'));

create or replace function public.election_room_snapshot(p_room_token uuid,p_device_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ipnc_private.election_rooms; e jsonb; candidates jsonb; public_candidates jsonb; votes jsonb; rounds jsonb; prior_rounds jsonb;
 present_count integer; ballot_count integer; already boolean; exact boolean; elected uuid[]; eligible uuid[]; max_choices integer; phase text; result jsonb; eligible_rank jsonb; eligible_cutoff integer;
begin
 select * into r from ipnc_private.election_rooms where public_token=p_room_token;
 if not found or (r.expires_at is not null and r.expires_at<=now()) then raise exception 'Sala indisponível ou expirada'; end if;
 if r.kind='real' then
  select jsonb_build_object('id',x.id,'name',x.name,'position',x.position,'status',x.status,'current_round',x.current_round,'total_present',x.total_present,'seats_count',coalesce(x.seats_count,1),'max_choices_per_ballot',coalesce(x.max_choices_per_ballot,1),'majority_rule',coalesce(x.majority_rule,'simple'),'voting_mode',coalesce(x.voting_mode,'shared'),'round2_candidate_ids',x.round2_candidate_ids,'show_result',coalesce(x.show_result,false),'nominations_open',x.nominations_open,'type',coalesce(x.type,'cargo'))
   into e from public.elections x where id=r.active_election_id;
  select count(*) into present_count from public.election_attendance where election_id=r.active_election_id and present;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'photo_url',c.photo_url,'photo_urls',c.photo_urls,'birth_date',c.birth_date,'nomination_round',c.nomination_round) order by c.display_order,c.id),'[]') into candidates from public.election_candidates c where election_id=r.active_election_id;
  select coalesce(jsonb_agg(jsonb_build_object('ballot_id',v.ballot_id,'candidate_id',v.candidate_id,'round_number',v.round_number,'is_blank',v.is_blank) order by v.id),'[]') into votes from public.election_votes v where election_id=r.active_election_id;
  select exists(select 1 from public.election_votes where election_id=r.active_election_id and round_number=(e->>'current_round')::integer and device_id=p_device_id::text) into already;
 else
  select jsonb_build_object('id',x.id,'name',x.name,'position',x.position,'status',x.status,'current_round',x.current_round,'total_present',x.total_present,'seats_count',1,'max_choices_per_ballot',1,'majority_rule',x.majority_rule,'voting_mode','both','round2_candidate_ids',x.round2_candidate_ids,'show_result',x.show_result,'nominations_open',x.nominations_open,'type','cargo'),x.candidates,x.total_present into e,candidates,present_count from ipnc_private.election_demo_elections x where id=r.active_election_id;
  select count(*) into present_count from ipnc_private.election_demo_elections d cross join lateral jsonb_array_elements(d.attendance) a where d.id=r.active_election_id and coalesce((a->>'present')::boolean,false);
  select coalesce(jsonb_agg(jsonb_build_object('ballot_id',b.ballot_id,'candidate_id',b.choices[1],'round_number',b.round_number,'is_blank',b.blanks=1) order by b.created_at,b.ballot_id),'[]') into votes from ipnc_private.election_demo_ballots b where election_id=r.active_election_id;
  select exists(select 1 from ipnc_private.election_demo_ballots where election_id=r.active_election_id and round_number=(e->>'current_round')::integer and device_id=p_device_id) into already;
 end if;
 if e is null then raise exception 'Eleição indisponível'; end if;
 select count(distinct v->>'ballot_id') into ballot_count from jsonb_array_elements(votes) v where (v->>'round_number')::integer=(e->>'current_round')::integer;
 exact:=present_count>0 and present_count=(e->>'total_present')::integer and ballot_count=present_count;
 select coalesce(jsonb_agg(c-'birth_date'),'[]') into public_candidates from jsonb_array_elements(candidates) c;
 prior_rounds:=case when (e->>'current_round')::integer>1 then ipnc_private.election_aggregate_rounds(votes,candidates,(e->>'seats_count')::integer,(e->>'current_round')::integer-1,e->>'majority_rule') else '[]'::jsonb end;
 select coalesce(array_agg(chosen.value::uuid),'{}') into elected from jsonb_array_elements(prior_rounds) r0 cross join lateral jsonb_array_elements_text(r0->'electedIds') chosen;
 select coalesce(array_agg((c->>'id')::uuid),'{}') into eligible from jsonb_array_elements(candidates) c
  where (c->>'nomination_round')::integer=(e->>'current_round')::integer and not ((c->>'id')::uuid=any(elected)) and ((e->>'current_round')::integer=1 or e->'round2_candidate_ids'='null'::jsonb or jsonb_array_length(e->'round2_candidate_ids')=0 or e->'round2_candidate_ids' ? (c->>'id'));
 if (e->>'current_round')::integer>1 and (e->'round2_candidate_ids'='null'::jsonb or jsonb_array_length(e->'round2_candidate_ids')=0) then
  -- Legacy rounds without an explicit runoff list use the same previous-round
  -- top (remaining seats + one), including every candidate tied at the cutoff.
  select coalesce(jsonb_agg(to_jsonb(q) order by q.votes desc,q.ord),'[]') into eligible_rank from (
   select c->>'id' as id,ord,(select count(*) from jsonb_array_elements(votes) v where v->>'candidate_id'=c->>'id' and not coalesce((v->>'is_blank')::boolean,false) and (v->>'round_number')::integer=(e->>'current_round')::integer-1)::integer as votes
   from jsonb_array_elements(candidates) with ordinality c(c,ord) where (c->>'nomination_round')::integer=(e->>'current_round')::integer and not ((c->>'id')::uuid=any(elected))
  ) q;
  eligible_cutoff:=coalesce((eligible_rank->(greatest(2,(e->>'seats_count')::integer-cardinality(elected)+1)-1)->>'votes')::integer,0);
  select coalesce(array_agg((c->>'id')::uuid),'{}') into eligible from jsonb_array_elements(eligible_rank) c where (c->>'votes')::integer>=eligible_cutoff;
 end if;
 max_choices:=greatest(1,least((e->>'max_choices_per_ballot')::integer,greatest(1,(e->>'seats_count')::integer-cardinality(elected))));
 result:=null;
 if (e->>'show_result')::boolean and exact then
  rounds:=ipnc_private.election_aggregate_rounds(votes,candidates,(e->>'seats_count')::integer,(e->>'current_round')::integer,e->>'majority_rule');
  result:=jsonb_build_object('rounds',rounds,'candidates',public_candidates);
 end if;
 if (e->>'nominations_open')::boolean then eligible:='{}'; end if;
 phase:=case when r.completed then 'finished' when (e->>'nominations_open')::boolean then 'nominations' when result is not null then 'result' when e->>'status'='open' and already then 'voted' when e->>'status'='open' then 'voting' else 'waiting' end;
 return jsonb_build_object('kind',r.kind,'room_id',r.id,'title',r.title,'revision',r.revision,'phase',phase,'activeElection',e,
  'candidates',case when result is not null then public_candidates when e->>'status'='open' and not (e->>'nominations_open')::boolean then coalesce((select jsonb_agg(c) from jsonb_array_elements(public_candidates) c where (c->>'nomination_round')::integer=(e->>'current_round')::integer),'[]') else '[]'::jsonb end,
  'already_voted',already,'count',jsonb_build_object('ballots',ballot_count,'present',present_count,'confirmed',(e->>'total_present')::integer,'exact',exact),
  'eligible_candidate_ids',to_jsonb(eligible),'elected_ids',to_jsonb(elected),'max_choices',max_choices,'published_result',result);
end;
$$;

create or replace function ipnc_private.election_demo_cast_internal(p_room_token uuid,p_device_id uuid,p_election_id uuid,p_round integer,p_ballot_id uuid,p_choices uuid[],p_blanks integer,p_shared boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r ipnc_private.election_rooms; e ipnc_private.election_demo_elections; previous ipnc_private.election_demo_ballots; snapshot jsonb; n integer;
begin
 select * into r from ipnc_private.election_rooms where public_token=p_room_token and kind='demo' for update;
 if not found or r.expires_at<=now() or r.completed then raise exception 'Sala indisponível'; end if;
 if (not p_shared and p_device_id is null) or p_ballot_id is null or p_election_id is null then raise exception 'Cédula inválida'; end if;
 select * into e from ipnc_private.election_demo_elections where id=r.active_election_id;
 if p_election_id<>e.id or e.status<>'open' or e.nominations_open or p_round<>e.current_round then raise exception 'A votação mudou'; end if;
 select * into previous from ipnc_private.election_demo_ballots where ballot_id=p_ballot_id;
 if found then
  if previous.election_id=p_election_id and previous.round_number=p_round and previous.device_id is not distinct from p_device_id and previous.choices=p_choices and previous.blanks=p_blanks then return jsonb_build_object('success',true); end if;
  raise exception 'Cédula já utilizada';
 end if;
 if not p_shared and exists(select 1 from ipnc_private.election_demo_ballots where election_id=e.id and round_number=p_round and device_id=p_device_id) then raise exception 'Este navegador já votou'; end if;
 if p_choices is null or p_blanks is null or p_blanks not between 0 and 1 or cardinality(p_choices)+p_blanks<>1 or array_position(p_choices,null) is not null then raise exception 'Cédula inválida'; end if;
 snapshot:=public.election_room_snapshot(p_room_token,p_device_id);
 if exists(select 1 from unnest(p_choices) x where not (snapshot->'eligible_candidate_ids' ? x::text)) then raise exception 'Candidato fora deste escrutínio'; end if;
 select count(*) into n from ipnc_private.election_demo_ballots where election_id=e.id and round_number=p_round;
 if n>=e.total_present then raise exception 'Todos os presentes já votaram'; end if;
 insert into ipnc_private.election_demo_ballots(ballot_id,election_id,round_number,device_id,choices,blanks) values(p_ballot_id,e.id,p_round,p_device_id,p_choices,p_blanks);
 return jsonb_build_object('success',true);
end;
$$;

create or replace function ipnc_private.election_room_changed()
returns trigger language plpgsql security definer set search_path='' as $$
declare r ipnc_private.election_rooms; target_order integer; active_order integer; active_status text;
begin
 if new.status is not distinct from old.status and new.current_round is not distinct from old.current_round and new.show_result is not distinct from old.show_result and new.nominations_open is not distinct from old.nominations_open then return new; end if;
 select rooms.* into r from ipnc_private.election_rooms rooms join ipnc_private.election_room_steps s on s.room_id=rooms.id where s.election_id=new.id for update of rooms;
 if not found then return new; end if;
 if r.active_election_id<>new.id and new.status='open' and old.status='draft' then
  select ordinal into target_order from ipnc_private.election_room_steps where room_id=r.id and election_id=new.id;
  select ordinal into active_order from ipnc_private.election_room_steps where room_id=r.id and election_id=r.active_election_id;
  select status into active_status from public.elections where id=r.active_election_id;
  if r.completed or target_order<>active_order+1 or active_status<>'finished' then raise exception 'A sala ainda não pode abrir este cargo'; end if;
  update ipnc_private.election_rooms set active_election_id=new.id,revision=revision+1 where id=r.id;
 elsif r.active_election_id=new.id then
  update ipnc_private.election_rooms set revision=revision+1 where id=r.id;
 end if;
 return new;
end;
$$;
drop trigger if exists election_room_changed on public.elections;
create trigger election_room_changed after update of status,current_round,show_result,nominations_open on public.elections for each row execute function ipnc_private.election_room_changed();


create or replace function ipnc_private.create_election_demo(p_title text,p_present integer,p_seed_counts jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r ipnc_private.election_rooms; eid uuid:=gen_random_uuid(); candidate_ids uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()]; candidates jsonb; names text[]:=array['Alfa','Beta','Gama']; i integer; n integer; total integer:=0;
begin
 if p_present not between 0 and 2000 or length(trim(p_title))=0 or length(p_title)>200 or jsonb_typeof(p_seed_counts)<>'object' then raise exception 'Ensaio inválido'; end if;
 for i in 1..3 loop
  n:=coalesce((p_seed_counts->>names[i])::integer,0); if n<0 then raise exception 'Contagem inválida'; end if; total:=total+n;
 end loop;
 if total>p_present then raise exception 'Contagem inválida'; end if;
 candidates:=jsonb_build_array(jsonb_build_object('id',candidate_ids[1],'name','Alfa','photo_url',null,'photo_urls','[]'::jsonb,'nomination_round',1),jsonb_build_object('id',candidate_ids[2],'name','Beta','photo_url',null,'photo_urls','[]'::jsonb,'nomination_round',1),jsonb_build_object('id',candidate_ids[3],'name','Gama','photo_url',null,'photo_urls','[]'::jsonb,'nomination_round',1));
 if p_present=0 then candidates:='[]'; end if;
 insert into ipnc_private.election_rooms(kind,title,active_election_id,expires_at,demo_admin_token,demo_urn_token) values('demo',trim(p_title),eid,now()+interval '7 days',gen_random_uuid(),gen_random_uuid()) returning * into r;
 insert into ipnc_private.election_demo_elections(id,room_id,name,position,status,total_present,candidates,attendance,attendance_confirmed)
  values(eid,r.id,trim(p_title),'Tesoureiro',case when total>0 then 'open' else 'draft' end,p_present,candidates,coalesce((select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'name','Participante fictício '||seed_row.ordinal,'present',true)) from generate_series(1,p_present) seed_row(ordinal)),'[]'),p_present>0);
 for i in 1..3 loop
  for n in 1..coalesce((p_seed_counts->>names[i])::integer,0) loop
   insert into ipnc_private.election_demo_ballots(ballot_id,election_id,round_number,device_id,choices,blanks) values(gen_random_uuid(),eid,1,null,array[candidate_ids[i]],0);
  end loop;
 end loop;
 return jsonb_build_object('room_id',r.id,'room_token',r.public_token,'admin_token',r.demo_admin_token,'urn_token',r.demo_urn_token,'election_id',eid,'expires_at',r.expires_at,'imported_synthetic_ballots',total);
end;
$$;

create or replace function ipnc_private.guard_election_nominations()
returns trigger language plpgsql security definer set search_path='' as $$
declare candidate_ids uuid[]; votes jsonb; candidates jsonb; rounds jsonb; filled integer;
begin
 if tg_op='INSERT' then
  if new.nominations_open then raise exception 'As indicações do primeiro escrutínio pertencem ao rascunho'; end if;
  return new;
 end if;
 if old.status='draft' and new.status='open' and not exists(select 1 from public.election_candidates where election_id=old.id and nomination_round=old.current_round) then raise exception 'Indique pelo menos um candidato neste escrutínio'; end if;
 if new.current_round is distinct from old.current_round then
  if old.nominations_open or old.current_round>=3 then raise exception 'Conclua as indicações e a votação deste escrutínio'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('ballot_id',v.ballot_id,'candidate_id',v.candidate_id,'round_number',v.round_number,'is_blank',v.is_blank)),'[]') into votes from public.election_votes v where election_id=old.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'birth_date',c.birth_date) order by c.display_order,c.id),'[]') into candidates from public.election_candidates c where election_id=old.id;
  rounds:=ipnc_private.election_aggregate_rounds(votes,candidates,coalesce(old.seats_count,1),old.current_round,coalesce(old.majority_rule,'simple'));
  select count(*) into filled from jsonb_array_elements(rounds) rr cross join lateral jsonb_array_elements_text(rr->'electedIds') winner;
  if filled>=coalesce(old.seats_count,1) then raise exception 'As vagas já foram preenchidas'; end if;
  new.nominations_open:=true; new.round2_candidate_ids:='{}'; new.show_result:=false;
 elsif old.nominations_open and not new.nominations_open then
  if old.status<>'open' or new.status<>'open' then raise exception 'Transição de indicações inválida'; end if;
  select array_agg(id) into candidate_ids from public.election_candidates where election_id=old.id and nomination_round=old.current_round;
  if coalesce(cardinality(candidate_ids),0)=0 then raise exception 'Indique pelo menos um candidato neste escrutínio'; end if;
  if exists(select 1 from public.election_votes where election_id=old.id and round_number=old.current_round) then raise exception 'Este escrutínio já possui votos'; end if;
  new.round2_candidate_ids:=candidate_ids;new.show_result:=false;
 elsif not old.nominations_open and new.nominations_open then
  raise exception 'Abra as indicações pelo próximo escrutínio';
 end if;
 if new.nominations_open and (new.status<>'open' or new.show_result) then raise exception 'As indicações ainda estão abertas'; end if;
 return new;
end;
$$;
drop trigger if exists election_nomination_transition on public.elections;
create trigger election_nomination_transition before insert or update on public.elections for each row execute function ipnc_private.guard_election_nominations();

create or replace function ipnc_private.lock_election_candidate_nomination()
returns trigger language plpgsql security invoker set search_path='' as $$
declare target uuid; e public.elections;
begin
 if tg_op='UPDATE' and new.election_id is distinct from old.election_id then raise exception 'Não é permitido mover uma candidatura'; end if;
 target:=case when tg_op='DELETE' then old.election_id else new.election_id end;
 select * into e from public.elections where id=target for update;
 if not found then if tg_op='DELETE' then return old; end if; raise exception 'Eleição indisponível'; end if;
 if e.status<>'draft' and not (e.status='open' and e.nominations_open) then raise exception 'As indicações estão fechadas'; end if;
 if tg_op='INSERT' then new.nomination_round:=e.current_round;
 else
  if old.nomination_round<>e.current_round then raise exception 'A candidatura histórica deve ser preservada'; end if;
  if tg_op='UPDATE' and new.nomination_round<>old.nomination_round then raise exception 'Não é permitido mover uma candidatura de escrutínio'; end if;
  if exists(select 1 from public.election_votes where candidate_id=old.id) then raise exception 'A candidatura já possui votos'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
drop trigger if exists election_candidate_nomination_lock on public.election_candidates;
create trigger election_candidate_nomination_lock before insert or update or delete on public.election_candidates for each row execute function ipnc_private.lock_election_candidate_nomination();

-- Extend the existing count lock. The same parent lock still serializes votes,
-- attendance and transitions; no caller can bypass nominations with the old RPC.
create or replace function ipnc_private.lock_election_count_child_write()
returns trigger language plpgsql security invoker set search_path='' as $$
declare target uuid; e public.elections;
begin
 if tg_op='UPDATE' and new.election_id is distinct from old.election_id then raise exception 'Não é permitido mover a chamada ou os votos para outra eleição'; end if;
 target:=case when tg_op='DELETE' then old.election_id else new.election_id end;
 select * into e from public.elections where id=target for update;
 if not found then if tg_op='DELETE' then return old; end if; raise exception 'Eleição indisponível'; end if;
 if tg_table_name='election_attendance' then
  if e.status<>'draft' then raise exception 'A chamada está fechada para alterações'; end if;
 else
  if e.status<>'open' then raise exception 'A votação não está aberta'; end if;
  if e.nominations_open then raise exception 'Aguarde o mesário iniciar este escrutínio após as indicações'; end if;
  if tg_op<>'INSERT' and old.round_number<>e.current_round then raise exception 'Os votos de escrutínios anteriores devem ser preservados'; end if;
  if tg_op<>'DELETE' then
   if new.round_number<>e.current_round then raise exception 'O escrutínio foi alterado'; end if;
   if not new.is_blank and not exists(select 1 from public.election_candidates c where c.id=new.candidate_id and c.election_id=e.id and c.nomination_round=e.current_round) then raise exception 'Candidato não indicado neste escrutínio'; end if;
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;

create or replace function public.election_start_nominated_round(p_election_id uuid,p_expected_round integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.elections;
begin
 if auth.uid() is null or not ipnc_private.can_manage_election(p_election_id) then raise exception 'Não autorizado'; end if;
 update public.elections set nominations_open=false where id=p_election_id and status='open' and nominations_open and current_round=p_expected_round returning * into e;
 if not found then raise exception 'A sala mudou. Confira o escrutínio atual'; end if;
 return jsonb_build_object('id',e.id,'current_round',e.current_round,'nominations_open',e.nominations_open);
end;
$$;

create or replace function ipnc_private.election_demo_control_snapshot(p_room_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r ipnc_private.election_rooms; e ipnc_private.election_demo_elections; current_candidates jsonb;
begin
 select * into r from ipnc_private.election_rooms where public_token=p_room_token and kind='demo';
 select * into e from ipnc_private.election_demo_elections where id=r.active_election_id;
 select coalesce(jsonb_agg(c),'[]') into current_candidates from jsonb_array_elements(e.candidates) c where (c->>'nomination_round')::integer=e.current_round;
 return public.election_room_snapshot(r.public_token,null)||jsonb_build_object('room_token',r.public_token,'urn_token',r.demo_urn_token,'attendance',e.attendance,'attendance_confirmed',e.attendance_confirmed,'current_candidates',current_candidates,'all_candidates',e.candidates);
end;
$$;

create or replace function public.election_demo_command(p_admin_token uuid,p_action text,p_expected_revision bigint,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ipnc_private.election_rooms; e ipnc_private.election_demo_elections; snapshot jsonb; results jsonb; winners uuid[]; current_ids uuid[]; new_id uuid; next_attendance jsonb; current_candidates jsonb; entry jsonb; total integer; new_name text;
begin
 select * into r from ipnc_private.election_rooms where demo_admin_token=p_admin_token and kind='demo' for update;
 if not found or r.expires_at<=now() then raise exception 'Controle indisponível'; end if;
 if p_action='snapshot' then return ipnc_private.election_demo_control_snapshot(r.public_token); end if;
 if r.completed then raise exception 'Este ensaio já foi concluído'; end if;
 if p_expected_revision is null or r.revision<>p_expected_revision then raise exception 'A sala mudou. Atualize antes de continuar'; end if;
 select * into e from ipnc_private.election_demo_elections where id=r.active_election_id;
 snapshot:=public.election_room_snapshot(r.public_token,null);
 select coalesce(array_agg((c->>'id')::uuid),'{}'),coalesce(jsonb_agg(c),'[]') into current_ids,current_candidates from jsonb_array_elements(e.candidates) c where (c->>'nomination_round')::integer=e.current_round;
 select ipnc_private.election_aggregate_rounds(coalesce(jsonb_agg(jsonb_build_object('ballot_id',b.ballot_id,'candidate_id',b.choices[1],'round_number',b.round_number,'is_blank',b.blanks=1)),'[]'),e.candidates,1,e.current_round,e.majority_rule) into results from ipnc_private.election_demo_ballots b where b.election_id=e.id;
 select coalesce(array_agg(chosen.value::uuid),'{}') into winners from jsonb_array_elements(results) rr cross join lateral jsonb_array_elements_text(rr->'electedIds') chosen;
 if p_action='configure' then
  if e.status<>'draft' or e.current_round<>1 then raise exception 'Configure a eleição antes de iniciar'; end if;
  if length(trim(coalesce(p_payload->>'name','')))=0 or length(p_payload->>'name')>200 or length(trim(coalesce(p_payload->>'position','')))=0 or length(p_payload->>'position')>160 then raise exception 'Informe nome e cargo'; end if;
  update ipnc_private.election_demo_elections set name=trim(p_payload->>'name'),position=trim(p_payload->>'position') where id=e.id;
  update ipnc_private.election_rooms set title=trim(p_payload->>'name') where id=r.id;
 elsif p_action in ('attendance_add','attendance_bulk_add','attendance_toggle','attendance_remove','confirm_attendance') then
  if e.status<>'draft' then raise exception 'A chamada está fechada para alterações'; end if;
  next_attendance:=e.attendance;
  if p_action in ('attendance_add','attendance_bulk_add') then
   if p_action='attendance_add' then
    entry:=jsonb_build_array(p_payload->>'name');
   else entry:=p_payload->'names'; end if;
   if entry is null or jsonb_typeof(entry)<>'array' or jsonb_array_length(entry)=0 or jsonb_array_length(entry)+jsonb_array_length(e.attendance)>2000 then raise exception 'Lista de nomes inválida'; end if;
   if exists(select 1 from jsonb_array_elements(entry) x where jsonb_typeof(x)<>'string') or (p_payload ? 'present' and jsonb_typeof(p_payload->'present')<>'boolean') then raise exception 'Lista de nomes inválida'; end if;
   for new_name in select value from jsonb_array_elements_text(entry) loop
    if new_name is null or length(trim(new_name))=0 or length(new_name)>160 then raise exception 'Nome inválido'; end if;
    next_attendance:=next_attendance||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'name',trim(new_name),'present',coalesce((p_payload->>'present')::boolean,false)));
   end loop;
  elsif p_action in ('attendance_toggle','attendance_remove') then
   if not exists(select 1 from jsonb_array_elements(e.attendance) a where a->>'id'=p_payload->>'id') then raise exception 'Participante indisponível'; end if;
   if p_action='attendance_toggle' and jsonb_typeof(p_payload->'present') is distinct from 'boolean' then raise exception 'Presença inválida'; end if;
   select coalesce(jsonb_agg(case when a->>'id'=p_payload->>'id' and p_action='attendance_toggle' then a||jsonb_build_object('present',(p_payload->>'present')::boolean) else a end),'[]') into next_attendance from jsonb_array_elements(e.attendance) a where p_action<>'attendance_remove' or a->>'id'<>p_payload->>'id';
  end if;
  select count(*) into total from jsonb_array_elements(next_attendance) a where (a->>'present')::boolean;
  if p_action='confirm_attendance' then
   if total=0 then raise exception 'Confirme pelo menos um presente'; end if;
   update ipnc_private.election_demo_elections set total_present=total,attendance_confirmed=true where id=e.id;
  else update ipnc_private.election_demo_elections set attendance=next_attendance,total_present=0,attendance_confirmed=false where id=e.id; end if;
 elsif p_action in ('candidate_add','candidate_remove') then
  if not ((e.status='draft' and e.attendance_confirmed) or (e.status='open' and e.nominations_open)) then raise exception 'Confirme a chamada ou abra as indicações deste escrutínio'; end if;
  if p_action='candidate_add' then
   new_name:=trim(coalesce(p_payload->>'name',''));
   if length(new_name)=0 or length(new_name)>160 or jsonb_array_length(current_candidates)>=100 then raise exception 'Nome de candidato inválido'; end if;
   entry:=jsonb_build_object('id',gen_random_uuid(),'name',new_name,'photo_url',null,'photo_urls','[]'::jsonb,'nomination_round',e.current_round);
   update ipnc_private.election_demo_elections set candidates=candidates||jsonb_build_array(entry) where id=e.id;
  else
   if not exists(select 1 from jsonb_array_elements(current_candidates) c where c->>'id'=p_payload->>'id') then raise exception 'A candidatura histórica deve ser preservada'; end if;
   if exists(select 1 from ipnc_private.election_demo_ballots b where b.election_id=e.id and p_payload->>'id'=any(array(select x::text from unnest(b.choices) x))) then raise exception 'A candidatura já possui votos'; end if;
   update ipnc_private.election_demo_elections set candidates=(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(e.candidates) c where c->>'id'<>p_payload->>'id') where id=e.id;
  end if;
 elsif p_action='start' then
  if not (e.status='draft' or (e.status='open' and e.nominations_open)) or (snapshot->'count'->>'ballots')::integer<>0 then raise exception 'A votação já foi iniciada'; end if;
  if not e.attendance_confirmed or e.total_present<=0 or (snapshot->'count'->>'present')::integer<>e.total_present then raise exception 'Confirme a chamada'; end if;
  if cardinality(current_ids)=0 then raise exception 'Indique pelo menos um candidato neste escrutínio'; end if;
  update ipnc_private.election_demo_elections set status='open',nominations_open=false,round2_candidate_ids=case when e.current_round>1 then current_ids else null end where id=e.id;
 elsif p_action='publish' then
  if e.status='draft' or e.nominations_open or not (snapshot->'count'->>'exact')::boolean then raise exception 'Contagem divergente'; end if;
  update ipnc_private.election_demo_elections set show_result=true where id=e.id;
 elsif p_action='hide_result' then
  update ipnc_private.election_demo_elections set show_result=false where id=e.id;
 elsif p_action='next_round' then
  if e.status<>'open' or e.nominations_open or e.current_round>=3 or not (snapshot->'count'->>'exact')::boolean or cardinality(winners)>0 then raise exception 'Este escrutínio não pode avançar'; end if;
  update ipnc_private.election_demo_elections set current_round=current_round+1,nominations_open=true,show_result=false,round2_candidate_ids='{}' where id=e.id;
 elsif p_action='finish' then
  if e.status<>'open' or e.nominations_open or not (snapshot->'count'->>'exact')::boolean or cardinality(winners)<1 then raise exception 'Conclua uma apuração válida antes de finalizar'; end if;
  update ipnc_private.election_demo_elections set status='finished' where id=e.id;
 elsif p_action='next_election' then
  if e.status<>'finished' or not (snapshot->'count'->>'exact')::boolean then raise exception 'Conclua o cargo atual'; end if;
  if length(trim(coalesce(p_payload->>'position','')))=0 or length(p_payload->>'position')>160 then raise exception 'Informe o próximo cargo'; end if;
  new_id:=gen_random_uuid();
  select coalesce(jsonb_agg(a||jsonb_build_object('id',gen_random_uuid())),'[]') into next_attendance from jsonb_array_elements(e.attendance) a;
  insert into ipnc_private.election_demo_elections(id,room_id,ordinal,name,position,total_present,candidates,attendance,attendance_confirmed)
   values(new_id,r.id,e.ordinal+1,e.name,trim(p_payload->>'position'),e.total_present,'[]',next_attendance,true);
  update ipnc_private.election_rooms set active_election_id=new_id where id=r.id;
 elsif p_action='complete' then
  if e.status<>'finished' or not (snapshot->'count'->>'exact')::boolean then raise exception 'Conclua o cargo atual'; end if;
  update ipnc_private.election_rooms set completed=true where id=r.id;
 else raise exception 'Ação inválida'; end if;
 update ipnc_private.election_rooms set revision=revision+1 where id=r.id;
 return ipnc_private.election_demo_control_snapshot(r.public_token);
end;
$$;

create or replace function public.election_room_report(p_room_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare room ipnc_private.election_rooms; item record; e jsonb; candidates jsonb; votes jsonb; rounds jsonb; winners uuid[]; present_count integer; ballot_count integer; entries jsonb:='[]';
begin
 select * into room from ipnc_private.election_rooms where public_token=p_room_token;
 if not found or (room.expires_at is not null and room.expires_at<=now()) then raise exception 'Sala indisponível ou expirada'; end if;
 if room.kind='real' then
  for item in select x.* from ipnc_private.election_room_steps s join public.elections x on x.id=s.election_id where s.room_id=room.id and x.status='finished' and x.show_result order by s.ordinal loop
   select count(*) into present_count from public.election_attendance where election_id=item.id and present;
   select count(distinct ballot_id) into ballot_count from public.election_votes where election_id=item.id and round_number=item.current_round;
   if present_count<=0 or present_count<>item.total_present or ballot_count<>present_count then continue; end if;
   select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'photo_url',c.photo_url,'photo_urls',c.photo_urls,'birth_date',c.birth_date,'nomination_round',c.nomination_round) order by c.display_order,c.id),'[]') into candidates from public.election_candidates c where election_id=item.id;
   select coalesce(jsonb_agg(jsonb_build_object('ballot_id',v.ballot_id,'candidate_id',v.candidate_id,'round_number',v.round_number,'is_blank',v.is_blank)),'[]') into votes from public.election_votes v where election_id=item.id;
   rounds:=ipnc_private.election_aggregate_rounds(votes,candidates,coalesce(item.seats_count,1),item.current_round,coalesce(item.majority_rule,'simple'));
   select coalesce(array_agg(w.value::uuid),'{}') into winners from jsonb_array_elements(rounds) rr cross join lateral jsonb_array_elements_text(rr->'electedIds') w;
   e:=jsonb_build_object('id',item.id,'name',item.name,'position',item.position,'status',item.status,'current_round',item.current_round,'total_present',item.total_present,'seats_count',coalesce(item.seats_count,1),'majority_rule',coalesce(item.majority_rule,'simple'));
   entries:=entries||jsonb_build_array(jsonb_build_object('election',e,'candidates',(select coalesce(jsonb_agg(c-'birth_date'),'[]') from jsonb_array_elements(candidates) c),'rounds',rounds,'electedIds',to_jsonb(winners),'count',jsonb_build_object('ballots',ballot_count,'present',present_count,'confirmed',item.total_present,'exact',true)));
  end loop;
 else
  for item in select * from ipnc_private.election_demo_elections where room_id=room.id and status='finished' and show_result order by ordinal loop
   select count(*) into present_count from jsonb_array_elements(item.attendance) a where (a->>'present')::boolean;
   select count(*) into ballot_count from ipnc_private.election_demo_ballots where election_id=item.id and round_number=item.current_round;
   if not item.attendance_confirmed or present_count<=0 or present_count<>item.total_present or ballot_count<>present_count then continue; end if;
   select coalesce(jsonb_agg(jsonb_build_object('ballot_id',b.ballot_id,'candidate_id',b.choices[1],'round_number',b.round_number,'is_blank',b.blanks=1)),'[]') into votes from ipnc_private.election_demo_ballots b where election_id=item.id;
   rounds:=ipnc_private.election_aggregate_rounds(votes,item.candidates,1,item.current_round,item.majority_rule);
   select coalesce(array_agg(w.value::uuid),'{}') into winners from jsonb_array_elements(rounds) rr cross join lateral jsonb_array_elements_text(rr->'electedIds') w;
   e:=jsonb_build_object('id',item.id,'name',item.name,'position',item.position,'status',item.status,'current_round',item.current_round,'total_present',item.total_present,'seats_count',1,'majority_rule',item.majority_rule);
   entries:=entries||jsonb_build_array(jsonb_build_object('election',e,'candidates',(select coalesce(jsonb_agg(c-'birth_date'),'[]') from jsonb_array_elements(item.candidates) c),'rounds',rounds,'electedIds',to_jsonb(winners),'count',jsonb_build_object('ballots',ballot_count,'present',present_count,'confirmed',item.total_present,'exact',true)));
  end loop;
 end if;
 return jsonb_build_object('room_id',room.id,'title',room.title,'generated_at',now(),'completed',room.completed,'elections',entries);
end;
$$;

revoke all on function ipnc_private.guard_election_nominations(),ipnc_private.lock_election_candidate_nomination(),ipnc_private.election_demo_control_snapshot(uuid),public.election_start_nominated_round(uuid,integer),public.election_room_report(uuid) from public,anon,authenticated;
grant execute on function public.election_start_nominated_round(uuid,integer) to authenticated;
grant execute on function public.election_room_report(uuid) to anon,authenticated;
-- The legacy Edge gateway also fails before its idempotent early-return while
-- nominations are open; raw INSERT paths are independently guarded above.
create or replace function public.cast_ipnc_ballot(p_election uuid,p_token uuid,p_device text,p_round integer,p_ballot uuid,p_choices uuid[],p_blanks integer,p_limit integer) returns void
language plpgsql security invoker set search_path='' as $$
declare e public.elections; d uuid; k uuid;
begin
 if auth.role()<>'service_role' then raise exception 'Não autorizado'; end if;
 select * into e from public.elections where id=p_election for update;
 if not found or e.status<>'open' or e.current_round<>p_round then raise exception 'Votação encerrada'; end if;
 if e.nominations_open then raise exception 'Aguarde o mesário iniciar este escrutínio após as indicações'; end if;
 if exists(select 1 from public.election_votes where ballot_id=p_ballot and election_id=p_election) then return; end if;
 if p_token is not null then
  select id into d from public.election_devices where token=p_token and election_id=p_election;
  if d is null then raise exception 'Urna inválida'; end if;
 elsif e.voting_mode in ('individual','both') then
  if p_device is null or p_device !~* '^[0-9a-f-]{36}$' then raise exception 'Dispositivo inválido'; end if;
  if exists(select 1 from public.election_votes where election_id=p_election and round_number=p_round and device_id=p_device) then raise exception 'Voto já registrado'; end if;
 elsif e.voting_mode<>'shared' then raise exception 'Modo de votação inválido';
 end if;
 if p_blanks<0 or p_limit<1 or p_limit>100 or cardinality(p_choices)+p_blanks<>p_limit then raise exception 'Cédula inválida'; end if;
 if (select count(distinct x) from unnest(p_choices) x)<>cardinality(p_choices) then raise exception 'Candidatos repetidos'; end if;
 foreach k in array p_choices loop
  if not exists(select 1 from public.election_candidates where id=k and election_id=p_election) then raise exception 'Candidato inválido'; end if;
  insert into public.election_votes(election_id,candidate_id,device_id,ballot_id,round_number,is_blank) values(p_election,k,case when d is not null then null else p_device end,p_ballot,p_round,false);
 end loop;
 for i in 1..p_blanks loop
  insert into public.election_votes(election_id,candidate_id,device_id,ballot_id,round_number,is_blank) values(p_election,null,case when d is not null then null else p_device end,p_ballot,p_round,true);
 end loop;
end;
$$;

commit;
