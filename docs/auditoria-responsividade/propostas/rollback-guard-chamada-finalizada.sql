-- ROLLBACK DO BASELINE LOCAL. Usar somente após comparar com o backup real.
-- Não reabre dias/turmas nem altera registros. Reintroduz a lacuna de finalização.
create or replace function ipnc_private.guard_ebd_day() returns trigger
language plpgsql security definer set search_path = '' as $$
declare day date := case when tg_op='DELETE' then old.date else new.date end;
begin
  perform pg_advisory_xact_lock(1869639283, (day-date '2000-01-01')::integer);
  if tg_table_name <> 'ebd_day_closures' then
    if exists(select 1 from public.ebd_day_closures where date=day) then raise exception 'Dia fechado. Reabra a chamada antes de alterar.'; end if;
    if tg_op='UPDATE' and (new.date <> old.date or new.class_id <> old.class_id) then raise exception 'Não é permitido mover um registro de chamada.'; end if;
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
