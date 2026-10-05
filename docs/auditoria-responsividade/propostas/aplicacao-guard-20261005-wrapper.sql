-- Authorized publication request on 2026-10-05. Only application-object DDL: guard_ebd_day replacement.
-- Single atomic DO block; no COMMIT can terminate the migration service's transaction.
DO $ipnc_deployment$
BEGIN
  PERFORM set_config('lock_timeout','5s',true);
  PERFORM set_config('statement_timeout','30s',true);
  PERFORM set_config('idle_in_transaction_session_timeout','5s',true);
  PERFORM set_config('transaction_timeout','5s',true);
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'PostgreSQL 17 transaction timeout required.';
  END IF;
  LOCK TABLE public.ebd_attendance, public.ebd_call_status,
    public.ebd_class_visitor_entries, public.ebd_day_closures
    IN SHARE ROW EXCLUSIVE MODE NOWAIT;
  IF EXISTS (SELECT 1 FROM pg_locks WHERE locktype='advisory'
      AND classid=1869639283 AND pid <> pg_backend_pid()) THEN
    RAISE EXCEPTION 'EBD operation is in progress; deployment aborted without waiting.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('ipnc_private.guard_ebd_day()')
      AND oid=25624 AND md5(prosrc)='13c4f019011f3d0e3f6c0f8b0b0eac8a')
    OR (SELECT md5((jsonb_build_object(
 'guard_catalog',(select to_jsonb(p)-'prosrc' from pg_proc p where p.oid=to_regprocedure('ipnc_private.guard_ebd_day()')),
 'triggers',(select coalesce(jsonb_agg(to_jsonb(x) order by x.table_schema,x.table_name,x.trigger_name),'[]'::jsonb) from (select n.nspname as table_schema,c.relname as table_name,t.tgname as trigger_name,t.tgenabled as enabled,pg_get_triggerdef(t.oid,true) as trigger_definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and t.tgfoid=to_regprocedure('ipnc_private.guard_ebd_day()'))x),
 'tables',(select jsonb_agg(to_jsonb(x) order by x.table_name) from (select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('ebd_attendance','ebd_call_status','ebd_class_visitor_entries','ebd_day_closures'))x),
 'policies',(select jsonb_agg(to_jsonb(x) order by x.tablename,x.policyname) from (select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('ebd_attendance','ebd_call_status','ebd_class_visitor_entries','ebd_day_closures'))x),
 'close_and_reopen',(select jsonb_agg(to_jsonb(x) order by x.signature) from (select p.oid::regprocedure::text as signature,md5(p.prosrc) as body_md5,pg_get_functiondef(p.oid) as definition from pg_proc p where p.oid in (to_regprocedure('public.ebd_close_day(date)'),to_regprocedure('public.ebd_reopen_day(date,uuid)')))x)))::text)) IS DISTINCT FROM '70a3c96635467d78d1b8e48a4470c8e0' THEN
    RAISE EXCEPTION 'Guard or related metadata diverged from reviewed baseline; reconcile before deployment.';
  END IF;
  EXECUTE $approved_patch$-- PROPOSTA NÃO APLICADA EM PRODUÇÃO. Revisar/homologar e autorizar separadamente.
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
$approved_patch$;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('ipnc_private.guard_ebd_day()')
      AND oid=25624 AND md5(prosrc)='617d4fa54312e7ee5305a2c44faa836f')
    OR (SELECT md5((jsonb_build_object(
 'guard_catalog',(select to_jsonb(p)-'prosrc' from pg_proc p where p.oid=to_regprocedure('ipnc_private.guard_ebd_day()')),
 'triggers',(select coalesce(jsonb_agg(to_jsonb(x) order by x.table_schema,x.table_name,x.trigger_name),'[]'::jsonb) from (select n.nspname as table_schema,c.relname as table_name,t.tgname as trigger_name,t.tgenabled as enabled,pg_get_triggerdef(t.oid,true) as trigger_definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and t.tgfoid=to_regprocedure('ipnc_private.guard_ebd_day()'))x),
 'tables',(select jsonb_agg(to_jsonb(x) order by x.table_name) from (select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('ebd_attendance','ebd_call_status','ebd_class_visitor_entries','ebd_day_closures'))x),
 'policies',(select jsonb_agg(to_jsonb(x) order by x.tablename,x.policyname) from (select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('ebd_attendance','ebd_call_status','ebd_class_visitor_entries','ebd_day_closures'))x),
 'close_and_reopen',(select jsonb_agg(to_jsonb(x) order by x.signature) from (select p.oid::regprocedure::text as signature,md5(p.prosrc) as body_md5,pg_get_functiondef(p.oid) as definition from pg_proc p where p.oid in (to_regprocedure('public.ebd_close_day(date)'),to_regprocedure('public.ebd_reopen_day(date,uuid)')))x)))::text)) IS DISTINCT FROM '70a3c96635467d78d1b8e48a4470c8e0' THEN
    RAISE EXCEPTION 'Post-deployment invariant failed; atomic block rolls back.';
  END IF;
END;
$ipnc_deployment$;
