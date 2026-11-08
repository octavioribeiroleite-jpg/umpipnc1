-- Exact vote/attendance gate. Application is tracked by Supabase migration history.
-- Requires the existing elections schema and ipnc_private schema.
-- No rows are changed. Existing RLS/grants and majority rules are preserved.
begin;

create or replace function ipnc_private.guard_election_count_transition()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare present_count bigint; ballot_count bigint;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.current_round <> 1 or new.total_present <> 0 then
      raise exception 'Uma nova votação deve começar como rascunho, sem chamada confirmada';
    end if;
    return new;
  end if;
  if old.status = 'open' and new.status = 'draft' then
    raise exception 'Uma votação aberta não pode voltar a rascunho';
  end if;
  -- Attendance is already read-only outside drafts in the application.
  if old.status <> 'draft' and new.total_present is distinct from old.total_present then
    raise exception 'A chamada confirmada não pode mudar durante ou após a votação';
  end if;
  if old.status = 'finished' and (new.status is distinct from old.status or new.current_round is distinct from old.current_round) then
    raise exception 'O resultado encerrado deve ser preservado';
  end if;
  if new.current_round is distinct from old.current_round then
    if old.status <> 'open' or new.status <> 'open' or new.current_round <> old.current_round + 1 then
      raise exception 'Transição de escrutínio inválida';
    end if;
  end if;

  if (old.status = 'draft' and new.total_present is distinct from old.total_present)
     or (old.status = 'draft' and new.status = 'open')
     or (new.status = 'finished' and old.status <> 'finished')
     or new.current_round is distinct from old.current_round then
    -- The UPDATE holds the election row lock. All child writes below and the
    -- existing cast_ipnc_ballot RPC take that same lock before changing votes.
    select count(*) into present_count from public.election_attendance
      where election_id = old.id and present is true;
    if new.total_present <> present_count then
      raise exception 'Chamada divergente: % presentes na lista, % confirmados', present_count, new.total_present;
    end if;
    if new.status <> 'draft' and present_count <= 0 then
      raise exception 'Confirme uma chamada com presentes antes de continuar';
    end if;
    if old.status = 'draft' and new.status = 'open' then
      if exists (select 1 from public.election_votes where election_id = old.id) then
        raise exception 'O rascunho já possui votos';
      end if;
    elsif (new.status = 'finished' and old.status <> 'finished') or new.current_round is distinct from old.current_round then
      if old.status <> 'open' then raise exception 'A votação não está aberta'; end if;
      select count(distinct ballot_id) into ballot_count from public.election_votes
        where election_id = old.id and round_number = old.current_round;
      if ballot_count <> present_count then
        raise exception 'Contagem divergente: % cédulas para % presentes no escrutínio %', ballot_count, present_count, old.current_round;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function ipnc_private.lock_election_count_child_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare target uuid; election_row public.elections;
begin
  if tg_op = 'UPDATE' and new.election_id is distinct from old.election_id then
    raise exception 'Não é permitido mover a chamada ou os votos para outra eleição';
  end if;
  target := case when tg_op = 'DELETE' then old.election_id else new.election_id end;
  select * into election_row from public.elections where id = target for update;
  if not found then
    -- A parent DELETE may cascade to its children. Keep the existing delete
    -- behavior and RLS; ordinary inserts still fail their foreign key check.
    if tg_op = 'DELETE' then return old; end if;
    raise exception 'Eleição indisponível';
  end if;
  if tg_table_name = 'election_attendance' then
    if election_row.status <> 'draft' then raise exception 'A chamada está fechada para alterações'; end if;
  else
    if election_row.status <> 'open' then raise exception 'A votação não está aberta'; end if;
    if tg_op <> 'DELETE' and new.round_number <> election_row.current_round then
      raise exception 'O escrutínio foi alterado';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function ipnc_private.guard_election_count_transition() from public;
revoke all on function ipnc_private.lock_election_count_child_write() from public;

drop trigger if exists election_exact_count_transition on public.elections;
create trigger election_exact_count_transition before insert or update on public.elections
  for each row execute function ipnc_private.guard_election_count_transition();
drop trigger if exists election_attendance_count_lock on public.election_attendance;
create trigger election_attendance_count_lock before insert or update or delete on public.election_attendance
  for each row execute function ipnc_private.lock_election_count_child_write();
drop trigger if exists election_votes_count_lock on public.election_votes;
create trigger election_votes_count_lock before insert or update or delete on public.election_votes
  for each row execute function ipnc_private.lock_election_count_child_write();

create index if not exists idx_election_attendance_present_count
  on public.election_attendance (election_id) where present is true;
create index if not exists idx_election_votes_round_ballot_count
  on public.election_votes (election_id, round_number, ballot_id);
commit;
