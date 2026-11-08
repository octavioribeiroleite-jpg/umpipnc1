begin;

-- Stable public rooms contain capabilities, never voter identities. Anonymous
-- callers receive only the deliberately shaped RPC responses below.
create table if not exists ipnc_private.election_rooms (
 id uuid primary key default gen_random_uuid(),
 public_token uuid not null unique default gen_random_uuid(),
 kind text not null check(kind in ('real','demo')),
 title text not null,
 society_id uuid,
 created_by uuid,
 active_election_id uuid,
 revision bigint not null default 1,
 completed boolean not null default false,
 expires_at timestamptz,
 demo_admin_token uuid unique,
 demo_urn_token uuid unique,
 created_at timestamptz not null default now()
);
create table if not exists ipnc_private.election_room_steps (
 room_id uuid not null references ipnc_private.election_rooms(id) on delete cascade,
 election_id uuid not null unique references public.elections(id) on delete cascade,
 ordinal integer not null check(ordinal>0),
 primary key(room_id,ordinal)
);
create table if not exists ipnc_private.election_demo_elections (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references ipnc_private.election_rooms(id) on delete cascade,
 ordinal integer not null default 1,
 name text not null, position text not null,
 status text not null default 'draft' check(status in ('draft','open','finished')),
 current_round integer not null default 1 check(current_round between 1 and 3),
 total_present integer not null check(total_present between 1 and 2000),
 show_result boolean not null default false,
 majority_rule text not null default 'absolute_50' check(majority_rule in ('absolute_50','simple')),
 candidates jsonb not null check(jsonb_typeof(candidates)='array'),
 round2_candidate_ids uuid[],
 unique(room_id,ordinal)
);
create table if not exists ipnc_private.election_demo_ballots (
 ballot_id uuid primary key,
 election_id uuid not null references ipnc_private.election_demo_elections(id) on delete cascade,
 round_number integer not null check(round_number between 1 and 3),
 device_id uuid,
 choices uuid[] not null,
 blanks integer not null check(blanks between 0 and 1),
 created_at timestamptz not null default now(),
 check(cardinality(choices)+blanks=1)
);
create unique index if not exists election_demo_one_browser_round
 on ipnc_private.election_demo_ballots(election_id,round_number,device_id) where device_id is not null;
create index if not exists election_demo_round_count on ipnc_private.election_demo_ballots(election_id,round_number);
alter table ipnc_private.election_rooms enable row level security;
alter table ipnc_private.election_room_steps enable row level security;
alter table ipnc_private.election_demo_elections enable row level security;
alter table ipnc_private.election_demo_ballots enable row level security;
revoke all on ipnc_private.election_rooms,ipnc_private.election_room_steps,
 ipnc_private.election_demo_elections,ipnc_private.election_demo_ballots from public,anon,authenticated;

-- Same rules as calculateElectionRounds. Input is private; only aggregates and
-- candidate IDs leave this helper. Blank slots do not inflate ballot totals.
create or replace function ipnc_private.election_aggregate_rounds(p_votes jsonb,p_candidates jsonb,p_seats integer,p_round integer,p_majority text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare r integer; total integer; blanks integer; vacancies integer; threshold integer;
 rows_json jsonb; approved jsonb; elected uuid[]:='{}'; chosen uuid[]; cutoff integer; next_count integer;
 tie boolean; result jsonb:='[]'; row_item jsonb; remaining integer;
begin
 for r in 1..greatest(1,p_round) loop
  select count(distinct v->>'ballot_id'),count(*) filter(where coalesce((v->>'is_blank')::boolean,false))
   into total,blanks from jsonb_array_elements(p_votes) v where (v->>'round_number')::integer=r;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc,x.candidate_id),'[]') into rows_json from (
   select v->>'candidate_id' as candidate_id,count(*)::integer as count from jsonb_array_elements(p_votes) v
   where (v->>'round_number')::integer=r and not coalesce((v->>'is_blank')::boolean,false)
    and v->>'candidate_id' is not null and not ((v->>'candidate_id')::uuid=any(elected)) group by v->>'candidate_id'
  ) x;
  vacancies:=greatest(0,p_seats-cardinality(elected)); threshold:=total/2+1; chosen:='{}';tie:=false;
  select coalesce(jsonb_agg(x order by (x->>'count')::integer desc,x->>'candidate_id'),'[]') into approved
   from jsonb_array_elements(rows_json) x where r<>1 or p_majority<>'absolute_50' or (x->>'count')::integer>=threshold;
  if vacancies>0 then
   cutoff:=(approved->(vacancies-1)->>'count')::integer; next_count:=(approved->vacancies->>'count')::integer;
   tie:=coalesce(cutoff is not null and cutoff=next_count,false);
   if not tie then
    select coalesce(array_agg((x->>'candidate_id')::uuid),'{}') into chosen
     from (select value as x from jsonb_array_elements(approved) limit vacancies) q;
   elsif r=1 or r>=3 then
    select coalesce(array_agg((x->>'candidate_id')::uuid),'{}') into chosen from jsonb_array_elements(approved) x where (x->>'count')::integer>cutoff;
    if r>=3 then
     remaining:=vacancies-cardinality(chosen);
     select chosen||coalesce(array_agg((q.c->>'id')::uuid),'{}') into chosen from (
      select c,ord from jsonb_array_elements(p_candidates) with ordinality as c(c,ord)
      where exists(select 1 from jsonb_array_elements(approved) a where a->>'candidate_id'=c->>'id' and (a->>'count')::integer=cutoff)
      order by nullif(c->>'birth_date','')::date nulls last,ord limit remaining
     ) q;
    end if;
   end if;
  end if;
  elected:=elected||chosen;
  result:=result||jsonb_build_array(jsonb_build_object('round',r,'totalBallots',total,'blankVotes',blanks,'rows',rows_json,'electedIds',to_jsonb(chosen),'hasTie',tie));
 end loop;
 return result;
end;
$$;

create or replace function public.election_public_count(p_election_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.elections; n integer;
begin
 select * into e from public.elections where id=p_election_id;
 if not found then raise exception 'Eleição indisponível'; end if;
 select count(distinct ballot_id)::integer into n from public.election_votes where election_id=e.id and round_number=e.current_round;
 return jsonb_build_object('election_id',e.id,'current_round',e.current_round,'total_present',e.total_present,'ballots',case when e.status='draft' then 0 else n end);
end;
$$;

create or replace function public.election_room_ensure(p_election_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.elections; r ipnc_private.election_rooms;
begin
 if auth.uid() is null or not ipnc_private.can_manage_election(p_election_id) then raise exception 'Não autorizado'; end if;
 -- Serializes two organizers generating the first link for the same election.
 perform pg_advisory_xact_lock(hashtextextended(p_election_id::text,491));
 select * into e from public.elections where id=p_election_id;
 if not found then raise exception 'Eleição indisponível'; end if;
 select rooms.* into r from ipnc_private.election_rooms rooms join ipnc_private.election_room_steps s on s.room_id=rooms.id where s.election_id=e.id;
 if not found then
  insert into ipnc_private.election_rooms(kind,title,society_id,created_by,active_election_id)
   values('real',e.name,e.society_id,auth.uid(),e.id) returning * into r;
  insert into ipnc_private.election_room_steps(room_id,election_id,ordinal) values(r.id,e.id,1);
 end if;
 return jsonb_build_object('room_id',r.id,'room_token',r.public_token,'title',r.title);
end;
$$;

create or replace function public.election_room_attach(p_room_token uuid,p_source_election_id uuid,p_target_election_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ipnc_private.election_rooms; source public.elections; target public.elections; source_order integer; existing_order integer; present_count integer; ballots integer;
begin
 if auth.uid() is null or not ipnc_private.can_manage_election(p_source_election_id) or not ipnc_private.can_manage_election(p_target_election_id) then raise exception 'Não autorizado'; end if;
 select * into r from ipnc_private.election_rooms where public_token=p_room_token and kind='real' for update;
 if not found or r.completed then raise exception 'Sala indisponível'; end if;
 select * into source from public.elections where id=p_source_election_id;
 select * into target from public.elections where id=p_target_election_id;
 select ordinal into source_order from ipnc_private.election_room_steps where room_id=r.id and election_id=source.id;
 if source_order is null or source.society_id is distinct from target.society_id or r.society_id is distinct from target.society_id then raise exception 'Cargo fora desta sala'; end if;
 select ordinal into existing_order from ipnc_private.election_room_steps where room_id=r.id and election_id=target.id;
 if existing_order=source_order+1 then return jsonb_build_object('room_id',r.id,'room_token',r.public_token,'title',r.title); end if;
 if source.status<>'finished' or target.status<>'draft' or source.id=target.id then raise exception 'Conclua o cargo atual e prepare um novo rascunho'; end if;
 select count(*) into present_count from public.election_attendance where election_id=source.id and present;
 select count(distinct ballot_id) into ballots from public.election_votes where election_id=source.id and round_number=source.current_round;
 if present_count<1 or source.total_present<>present_count or ballots<>present_count then raise exception 'Contagem divergente'; end if;
 insert into ipnc_private.election_room_steps(room_id,election_id,ordinal) values(r.id,target.id,source_order+1);
 update ipnc_private.election_rooms set revision=revision+1 where id=r.id;
 return jsonb_build_object('room_id',r.id,'room_token',r.public_token,'title',r.title);
end;
$$;

-- Existing start/round/show-result commands retain their API. This trigger
-- advances only a previously attached successor when the mesário opens it.
create or replace function ipnc_private.election_room_changed()
returns trigger language plpgsql security definer set search_path='' as $$
declare r ipnc_private.election_rooms; target_order integer; active_order integer; active_status text;
begin
 if new.status is not distinct from old.status and new.current_round is not distinct from old.current_round and new.show_result is not distinct from old.show_result then return new; end if;
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
create trigger election_room_changed after update of status,current_round,show_result on public.elections for each row execute function ipnc_private.election_room_changed();

create or replace function public.election_room_snapshot(p_room_token uuid,p_device_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ipnc_private.election_rooms; e jsonb; candidates jsonb; public_candidates jsonb; votes jsonb; rounds jsonb; prior_rounds jsonb;
 present_count integer; ballot_count integer; already boolean; exact boolean; elected uuid[]; eligible uuid[]; max_choices integer; phase text; result jsonb; eligible_rank jsonb; eligible_cutoff integer;
begin
 select * into r from ipnc_private.election_rooms where public_token=p_room_token;
 if not found or (r.expires_at is not null and r.expires_at<=now()) then raise exception 'Sala indisponível ou expirada'; end if;
 if r.kind='real' then
  select jsonb_build_object('id',x.id,'name',x.name,'position',x.position,'status',x.status,'current_round',x.current_round,'total_present',x.total_present,'seats_count',coalesce(x.seats_count,1),'max_choices_per_ballot',coalesce(x.max_choices_per_ballot,1),'majority_rule',coalesce(x.majority_rule,'simple'),'voting_mode',coalesce(x.voting_mode,'shared'),'round2_candidate_ids',x.round2_candidate_ids,'show_result',coalesce(x.show_result,false),'type',coalesce(x.type,'cargo'))
   into e from public.elections x where id=r.active_election_id;
  select count(*) into present_count from public.election_attendance where election_id=r.active_election_id and present;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'photo_url',c.photo_url,'photo_urls',c.photo_urls,'birth_date',c.birth_date) order by c.display_order,c.id),'[]') into candidates from public.election_candidates c where election_id=r.active_election_id;
  select coalesce(jsonb_agg(jsonb_build_object('ballot_id',v.ballot_id,'candidate_id',v.candidate_id,'round_number',v.round_number,'is_blank',v.is_blank) order by v.id),'[]') into votes from public.election_votes v where election_id=r.active_election_id;
  select exists(select 1 from public.election_votes where election_id=r.active_election_id and round_number=(e->>'current_round')::integer and device_id=p_device_id::text) into already;
 else
  select jsonb_build_object('id',x.id,'name',x.name,'position',x.position,'status',x.status,'current_round',x.current_round,'total_present',x.total_present,'seats_count',1,'max_choices_per_ballot',1,'majority_rule',x.majority_rule,'voting_mode','both','round2_candidate_ids',x.round2_candidate_ids,'show_result',x.show_result,'type','cargo'),x.candidates,x.total_present into e,candidates,present_count from ipnc_private.election_demo_elections x where id=r.active_election_id;
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
  where not ((c->>'id')::uuid=any(elected)) and ((e->>'current_round')::integer=1 or e->'round2_candidate_ids'='null'::jsonb or jsonb_array_length(e->'round2_candidate_ids')=0 or e->'round2_candidate_ids' ? (c->>'id'));
 if (e->>'current_round')::integer>1 and (e->'round2_candidate_ids'='null'::jsonb or jsonb_array_length(e->'round2_candidate_ids')=0) then
  -- Legacy rounds without an explicit runoff list use the same previous-round
  -- top (remaining seats + one), including every candidate tied at the cutoff.
  select coalesce(jsonb_agg(to_jsonb(q) order by q.votes desc,q.ord),'[]') into eligible_rank from (
   select c->>'id' as id,ord,(select count(*) from jsonb_array_elements(votes) v where v->>'candidate_id'=c->>'id' and not coalesce((v->>'is_blank')::boolean,false) and (v->>'round_number')::integer=(e->>'current_round')::integer-1)::integer as votes
   from jsonb_array_elements(candidates) with ordinality c(c,ord) where not ((c->>'id')::uuid=any(elected))
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
 phase:=case when r.completed then 'finished' when result is not null then 'result' when e->>'status'='open' and already then 'voted' when e->>'status'='open' then 'voting' else 'waiting' end;
 return jsonb_build_object('kind',r.kind,'room_id',r.id,'title',r.title,'revision',r.revision,'phase',phase,'activeElection',e,
  'candidates',case when e->>'status'='open' or result is not null then public_candidates else '[]'::jsonb end,
  'already_voted',already,'count',jsonb_build_object('ballots',ballot_count,'present',present_count,'confirmed',(e->>'total_present')::integer,'exact',exact),
  'eligible_candidate_ids',to_jsonb(eligible),'elected_ids',to_jsonb(elected),'max_choices',max_choices,'published_result',result);
end;
$$;

-- Public demo participants have only a per-browser cast capability. The secret
-- mesário token is separate, never returned by snapshots or cast responses.
create or replace function ipnc_private.election_demo_cast_internal(p_room_token uuid,p_device_id uuid,p_election_id uuid,p_round integer,p_ballot_id uuid,p_choices uuid[],p_blanks integer,p_shared boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r ipnc_private.election_rooms; e ipnc_private.election_demo_elections; previous ipnc_private.election_demo_ballots; snapshot jsonb; n integer;
begin
 select * into r from ipnc_private.election_rooms where public_token=p_room_token and kind='demo' for update;
 if not found or r.expires_at<=now() or r.completed then raise exception 'Sala indisponível'; end if;
 if (not p_shared and p_device_id is null) or p_ballot_id is null or p_election_id is null then raise exception 'Cédula inválida'; end if;
 select * into e from ipnc_private.election_demo_elections where id=r.active_election_id;
 if p_election_id<>e.id or e.status<>'open' or p_round<>e.current_round then raise exception 'A votação mudou'; end if;
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

create or replace function public.election_demo_cast(p_room_token uuid,p_device_id uuid,p_election_id uuid,p_round integer,p_ballot_id uuid,p_choices uuid[],p_blanks integer default 0)
returns jsonb language sql security definer set search_path='' as $$
 select ipnc_private.election_demo_cast_internal(p_room_token,p_device_id,p_election_id,p_round,p_ballot_id,p_choices,p_blanks,false);
$$;

create or replace function public.election_demo_urn_cast(p_urn_token uuid,p_election_id uuid,p_round integer,p_ballot_id uuid,p_choices uuid[],p_blanks integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ipnc_private.election_rooms;
begin
 select * into r from ipnc_private.election_rooms where demo_urn_token=p_urn_token and kind='demo' for update;
 if not found or r.expires_at<=now() or r.completed then raise exception 'Urna indisponível'; end if;
 return ipnc_private.election_demo_cast_internal(r.public_token,null,p_election_id,p_round,p_ballot_id,p_choices,p_blanks,true);
end;
$$;

create or replace function public.election_demo_command(p_admin_token uuid,p_action text,p_expected_revision bigint,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ipnc_private.election_rooms; e ipnc_private.election_demo_elections; snapshot jsonb; results jsonb; winners uuid[]; next_ids uuid[]; cutoff integer; new_id uuid; new_candidates jsonb;
begin
 select * into r from ipnc_private.election_rooms where demo_admin_token=p_admin_token and kind='demo' for update;
 if not found or r.expires_at<=now() then raise exception 'Controle indisponível'; end if;
 if p_action='snapshot' then return public.election_room_snapshot(r.public_token,null)||jsonb_build_object('room_token',r.public_token,'urn_token',r.demo_urn_token); end if;
 if r.completed then raise exception 'Este ensaio já foi concluído'; end if;
 if p_expected_revision is null or r.revision<>p_expected_revision then raise exception 'A sala mudou. Atualize antes de continuar'; end if;
 select * into e from ipnc_private.election_demo_elections where id=r.active_election_id;
 snapshot:=public.election_room_snapshot(r.public_token,null);
 -- Aggregation here is private even before publication.
 select ipnc_private.election_aggregate_rounds(coalesce(jsonb_agg(jsonb_build_object('ballot_id',b.ballot_id,'candidate_id',b.choices[1],'round_number',b.round_number,'is_blank',b.blanks=1)),'[]'),e.candidates,1,e.current_round,e.majority_rule)
  into results from ipnc_private.election_demo_ballots b where b.election_id=e.id;
 select coalesce(array_agg(chosen.value::uuid),'{}') into winners from jsonb_array_elements(results) rr cross join lateral jsonb_array_elements_text(rr->'electedIds') chosen;
 if p_action='start' then
  if e.status<>'draft' or (snapshot->'count'->>'ballots')::integer<>0 then raise exception 'A votação já foi iniciada'; end if;
  update ipnc_private.election_demo_elections set status='open' where id=e.id;
 elsif p_action='publish' then
  if e.status='draft' or not (snapshot->'count'->>'exact')::boolean then raise exception 'Contagem divergente'; end if;
  update ipnc_private.election_demo_elections set show_result=true where id=e.id;
 elsif p_action='hide_result' then
  update ipnc_private.election_demo_elections set show_result=false where id=e.id;
 elsif p_action='next_round' then
  if e.status<>'open' or e.current_round>=3 or not (snapshot->'count'->>'exact')::boolean or cardinality(winners)>0 then raise exception 'Este escrutínio não pode avançar'; end if;
  select (x->>'count')::integer into cutoff from jsonb_array_elements(results->(e.current_round-1)->'rows') with ordinality q(x,ord) where ord=2;
  select coalesce(array_agg((x->>'candidate_id')::uuid),'{}') into next_ids from jsonb_array_elements(results->(e.current_round-1)->'rows') x where cutoff is null or (x->>'count')::integer>=cutoff;
  if cardinality(next_ids)=0 then select array_agg((c->>'id')::uuid) into next_ids from jsonb_array_elements(e.candidates) c; end if;
  update ipnc_private.election_demo_elections set current_round=current_round+1,show_result=false,round2_candidate_ids=next_ids where id=e.id;
 elsif p_action='finish' then
  if e.status<>'open' or not (snapshot->'count'->>'exact')::boolean or cardinality(winners)<1 then raise exception 'Conclua uma apuração válida antes de finalizar'; end if;
  update ipnc_private.election_demo_elections set status='finished' where id=e.id;
 elsif p_action='next_election' then
  if e.status<>'finished' or not (snapshot->'count'->>'exact')::boolean then raise exception 'Conclua o cargo atual'; end if;
  if length(trim(coalesce(p_payload->>'position','')))=0 or length(p_payload->>'position')>160 then raise exception 'Informe o próximo cargo'; end if;
  new_id:=gen_random_uuid();
  select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'name',c->>'name','photo_url',null,'photo_urls','[]'::jsonb)) into new_candidates from jsonb_array_elements(e.candidates) c;
  insert into ipnc_private.election_demo_elections(id,room_id,ordinal,name,position,total_present,candidates)
   values(new_id,r.id,e.ordinal+1,e.name,trim(p_payload->>'position'),e.total_present,new_candidates);
  update ipnc_private.election_rooms set active_election_id=new_id where id=r.id;
 elsif p_action='complete' then
  if e.status<>'finished' or not (snapshot->'count'->>'exact')::boolean then raise exception 'Conclua o cargo atual'; end if;
  update ipnc_private.election_rooms set completed=true where id=r.id;
 else raise exception 'Ação inválida'; end if;
 update ipnc_private.election_rooms set revision=revision+1 where id=r.id;
 return public.election_room_snapshot(r.public_token,null)||jsonb_build_object('room_token',r.public_token,'urn_token',r.demo_urn_token);
end;
$$;

-- DBA-only fixture import. Copies only explicitly supplied synthetic counts;
-- it never reads or writes public elections, votes, attendance or profiles.
create or replace function ipnc_private.create_election_demo(p_title text,p_present integer,p_seed_counts jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r ipnc_private.election_rooms; eid uuid:=gen_random_uuid(); candidate_ids uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()]; candidates jsonb; names text[]:=array['Alfa','Beta','Gama']; i integer; n integer; total integer:=0;
begin
 if p_present not between 1 and 2000 or length(trim(p_title))=0 or length(p_title)>200 or jsonb_typeof(p_seed_counts)<>'object' then raise exception 'Ensaio inválido'; end if;
 for i in 1..3 loop
  n:=coalesce((p_seed_counts->>names[i])::integer,0); if n<0 then raise exception 'Contagem inválida'; end if; total:=total+n;
 end loop;
 if total>p_present then raise exception 'Contagem inválida'; end if;
 candidates:=jsonb_build_array(jsonb_build_object('id',candidate_ids[1],'name','Alfa','photo_url',null,'photo_urls','[]'::jsonb),jsonb_build_object('id',candidate_ids[2],'name','Beta','photo_url',null,'photo_urls','[]'::jsonb),jsonb_build_object('id',candidate_ids[3],'name','Gama','photo_url',null,'photo_urls','[]'::jsonb));
 insert into ipnc_private.election_rooms(kind,title,active_election_id,expires_at,demo_admin_token,demo_urn_token) values('demo',trim(p_title),eid,now()+interval '7 days',gen_random_uuid(),gen_random_uuid()) returning * into r;
 insert into ipnc_private.election_demo_elections(id,room_id,name,position,status,total_present,candidates)
  values(eid,r.id,trim(p_title),'Tesoureiro',case when total>0 then 'open' else 'draft' end,p_present,candidates);
 for i in 1..3 loop
  for n in 1..coalesce((p_seed_counts->>names[i])::integer,0) loop
   insert into ipnc_private.election_demo_ballots(ballot_id,election_id,round_number,device_id,choices,blanks) values(gen_random_uuid(),eid,1,null,array[candidate_ids[i]],0);
  end loop;
 end loop;
 return jsonb_build_object('room_id',r.id,'room_token',r.public_token,'admin_token',r.demo_admin_token,'urn_token',r.demo_urn_token,'election_id',eid,'expires_at',r.expires_at,'imported_synthetic_ballots',total);
end;
$$;

-- Capability checking in these narrow DEFINER RPCs is intentional; no raw
-- table grants or generic SQL/JSON mutations are exposed to anonymous callers.
revoke all on function ipnc_private.election_aggregate_rounds(jsonb,jsonb,integer,integer,text),
 ipnc_private.election_room_changed(),ipnc_private.create_election_demo(text,integer,jsonb),ipnc_private.election_demo_cast_internal(uuid,uuid,uuid,integer,uuid,uuid[],integer,boolean) from public,anon,authenticated;
revoke all on function public.election_public_count(uuid),public.election_room_ensure(uuid),public.election_room_attach(uuid,uuid,uuid),
 public.election_room_snapshot(uuid,uuid),public.election_demo_cast(uuid,uuid,uuid,integer,uuid,uuid[],integer),
 public.election_demo_command(uuid,text,bigint,jsonb),public.election_demo_urn_cast(uuid,uuid,integer,uuid,uuid[],integer) from public,anon,authenticated;
grant execute on function public.election_room_ensure(uuid),public.election_room_attach(uuid,uuid,uuid) to authenticated;
grant execute on function public.election_public_count(uuid),public.election_room_snapshot(uuid,uuid),
 public.election_demo_cast(uuid,uuid,uuid,integer,uuid,uuid[],integer),public.election_demo_command(uuid,text,bigint,jsonb),public.election_demo_urn_cast(uuid,uuid,integer,uuid,uuid[],integer) to anon,authenticated;

commit;
