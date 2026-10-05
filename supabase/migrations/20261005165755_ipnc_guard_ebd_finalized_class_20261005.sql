-- PROPOSTA NÃO APLICADA EM PRODUÇÃO. Revisar/homologar e autorizar separadamente.
-- Base: 20260927121700_ebd_historical_attendance.sql. Esta substituição preserva
-- o lock por dia, a proteção de dia fechado e a correção histórica de matrícula.
-- Exige reabrir explicitamente uma turma finalizada antes de editar presenças
-- ou visitantes, inclusive por administrador. Não altera RLS ou autorização.
create or replace function ipnc_private.guard_ebd_day() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  day date := case when tg_op='DELETE' then old.date else new.date end;
  affected_class uuid;
begin
  perform pg_advisory_xact_lock(1869639283, (day-date '2000-01-01')::integer);
  if tg_table_name <> 'ebd_day_closures' then
    if exists(select 1 from public.ebd_day_closures where date=day) then raise exception 'Dia fechado. Reabra a chamada antes de alterar.'; end if;
    if tg_op='UPDATE' and (new.date <> old.date or new.class_id <> old.class_id) then raise exception 'Não é permitido mover um registro de chamada.'; end if;
    if tg_table_name in ('ebd_attendance','ebd_class_visitor_entries') then
      affected_class := case when tg_op='DELETE' then old.class_id else new.class_id end;
      if exists(select 1 from public.ebd_call_status where date=day and class_id=affected_class and status='finalizada') then
        raise exception 'Chamada finalizada. Reabra a turma antes de alterar.';
      end if;
    end if;
    if tg_table_name='ebd_attendance' and tg_op <> 'DELETE' then
      if tg_op='UPDATE' and new.student_id <> old.student_id then raise exception 'Aluno não pode ser alterado.'; end if;
      if not (tg_op='UPDATE' and coalesce(public.ebd_is_admin(), false)) then
        if not exists(select 1 from public.ebd_students s where s.id=new.student_id and s.class_id=new.class_id and s.active) then raise exception 'Aluno indisponível nesta turma.'; end if;
      end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;
