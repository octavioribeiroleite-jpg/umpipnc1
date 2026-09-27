-- Preserve immutable historical identity while allowing administrators to correct
-- existing attendance after a pupil has left or transferred to another class.
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

-- The same day lock is held from the first read through closure insertion.
-- SECURITY INVOKER preserves table RLS in addition to the explicit admin check.
create or replace function public.ebd_close_day(p_date date) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare summary jsonb; result public.ebd_day_closures;
begin
  if not coalesce(public.ebd_is_admin(), false) then raise exception 'Acesso exclusivo do administrador.' using errcode='42501'; end if;
  if p_date is null or p_date > (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data inválida para fechamento.'; end if;
  perform pg_advisory_xact_lock(1869639283, (p_date-date '2000-01-01')::integer);
  -- Keep current enrollment stable while producing the summary.
  lock table public.ebd_students, public.ebd_classes in share mode;
  select * into result from public.ebd_day_closures where date=p_date;
  if found then return to_jsonb(result); end if;
  with roster as (
    select s.id, coalesce(a.class_id,s.class_id) class_id, coalesce(a.present,false) present
    from public.ebd_students s left join public.ebd_attendance a on a.student_id=s.id and a.date=p_date
    where a.id is not null or (s.active and (s.created_at at time zone 'America/Sao_Paulo')::date <= p_date)
  ), counts as (
    select class_id, count(*)::integer total, count(*) filter(where present)::integer present from roster group by class_id
  ), visitors as (
    select class_id, count(*)::integer total, jsonb_agg(jsonb_build_object('name',name) order by id) names
    from public.ebd_class_visitor_entries where date=p_date group by class_id
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'classId',c.id,'className',c.name,'total',coalesce(r.total,0),'present',coalesce(r.present,0),
    'percentage',case when coalesce(r.total,0)=0 then 0 else round(r.present*100.0/r.total)::integer end,
    'visitor_count',coalesce(v.total,0),'visitors',coalesce(v.names,'[]'::jsonb)
  ) order by c.order_index,c.name),'[]'::jsonb) into summary
  from public.ebd_classes c left join counts r on r.class_id=c.id left join visitors v on v.class_id=c.id
  where c.active or r.class_id is not null or v.class_id is not null
    or exists(select 1 from public.ebd_call_status cs where cs.class_id=c.id and cs.date=p_date);

  insert into public.ebd_day_closures(date,closed_by,total_students,present_students,class_summary,visitor_count)
  select p_date,'Administrador',coalesce(sum((x->>'total')::integer),0),coalesce(sum((x->>'present')::integer),0),summary,coalesce(sum((x->>'visitor_count')::integer),0)
  from jsonb_array_elements(summary) x returning * into result;
  return to_jsonb(result);
end;
$$;
revoke all on function public.ebd_close_day(date) from public,anon;
grant execute on function public.ebd_close_day(date) to authenticated;

create or replace function public.ebd_reopen_day(p_date date, p_closure_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare previous public.ebd_day_closures;
begin
  if not coalesce(public.ebd_is_admin(), false) then raise exception 'Acesso exclusivo do administrador.' using errcode='42501'; end if;
  if p_date is null or p_closure_id is null then raise exception 'Selecione o encontro novamente.'; end if;
  perform pg_advisory_xact_lock(1869639283, (p_date-date '2000-01-01')::integer);
  delete from public.ebd_day_closures where id=p_closure_id and date=p_date returning * into previous;
  if not found then raise exception 'O fechamento mudou. Atualize o encontro antes de reabrir.'; end if;
  -- Keep even a zero-attendance encounter discoverable after reopening.
  insert into public.ebd_call_status(class_id,date,status,changed_by)
  select c.id,p_date,'finalizada','Administrador' from public.ebd_classes c
  where c.active or exists(select 1 from jsonb_array_elements(previous.class_summary) x where x->>'classId'=c.id::text)
  on conflict(class_id,date) do nothing;
  return true;
end;
$$;
revoke all on function public.ebd_reopen_day(date,uuid) from public,anon;
grant execute on function public.ebd_reopen_day(date,uuid) to authenticated;
