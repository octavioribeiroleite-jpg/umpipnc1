-- SOMENTE LEITURA. Executar apenas no alvo expressamente autorizado.
begin transaction read only;

select current_database() as database_name, current_user as executor,
       current_setting('server_version') as server_version,
       to_regprocedure('ipnc_private.guard_ebd_day()') as guard_function;

select p.oid, n.nspname as schema_name, p.proname,
       pg_get_userbyid(p.proowner) as owner_name,
       l.lanname as language_name, p.prosecdef as security_definer,
       p.provolatile as volatility, p.proconfig as function_settings,
       p.proacl as function_acl, md5(p.prosrc) as body_md5,
       pg_get_function_result(p.oid) as result_type,
       pg_get_functiondef(p.oid) as backup_definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
join pg_language l on l.oid=p.prolang
where p.oid=to_regprocedure('ipnc_private.guard_ebd_day()');

select n.nspname as table_schema, c.relname as table_name,
       t.tgname as trigger_name, t.tgenabled as enabled,
       pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal
  and t.tgfoid=to_regprocedure('ipnc_private.guard_ebd_day()')
order by n.nspname,c.relname,t.tgname;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('ebd_attendance','ebd_class_visitor_entries','ebd_day_closures','ebd_call_status')
order by c.relname;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and tablename in ('ebd_attendance','ebd_class_visitor_entries','ebd_day_closures','ebd_call_status')
order by tablename,policyname;

select p.oid::regprocedure as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.oid in (to_regprocedure('public.ebd_close_day(date)'),
                to_regprocedure('public.ebd_reopen_day(date,uuid)'))
order by signature::text;

commit;
