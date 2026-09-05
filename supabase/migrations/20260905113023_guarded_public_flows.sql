begin;
create or replace function public.cast_ipnc_ballot(p_election uuid,p_token uuid,p_device text,p_round integer,p_ballot uuid,p_choices uuid[],p_blanks integer,p_limit integer) returns void
language plpgsql security invoker set search_path='' as $$
declare e public.elections; d uuid; k uuid;
begin
 if auth.role()<>'service_role' then raise exception 'Não autorizado'; end if;
 select * into e from public.elections where id=p_election for update;
 if not found or e.status<>'open' or e.current_round<>p_round then raise exception 'Votação encerrada'; end if;
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
revoke all on function public.cast_ipnc_ballot(uuid,uuid,text,integer,uuid,uuid[],integer,integer) from public,anon,authenticated;
grant execute on function public.cast_ipnc_ballot(uuid,uuid,text,integer,uuid,uuid[],integer,integer) to service_role;

-- Narrow visitor registration preserves the welcome flow without table access.
create or replace function public.register_portal_visit(p_name text,p_society uuid,p_visitor boolean,p_device text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_name is null or length(trim(p_name)) not between 2 and 100 or p_device is null or p_device !~* '^[0-9a-f-]{36}$' then raise exception 'Dados inválidos'; end if;
 if p_society is not null and not exists(select 1 from public.societies where id=p_society and active) then raise exception 'Sociedade inválida'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_device,789));
 if exists(select 1 from public.portal_visitors where device_id=p_device and created_at>now()-interval '1 minute') then return; end if;
 insert into public.portal_visitors(full_name,society_id,is_visitor,device_id) values(trim(p_name),p_society,coalesce(p_visitor,false),p_device);
end;
$$;
revoke all on function public.register_portal_visit(text,uuid,boolean,text) from public;
grant execute on function public.register_portal_visit(text,uuid,boolean,text) to anon,authenticated,service_role;
commit;
