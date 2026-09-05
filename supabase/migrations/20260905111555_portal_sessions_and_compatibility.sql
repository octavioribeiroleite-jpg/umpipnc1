begin;

-- PIN-backed Auth claims are written only with the server admin API. Rotating a
-- PIN invalidates old claims on every database request, including refreshed JWTs.
create or replace function ipnc_private.portal_valid(wanted text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := auth.jwt()->'app_metadata'->'ipnc_portal'; secret_value text;
begin
  if auth.uid() is null or c is null or c->>'namespace' <> wanted then return false; end if;
  if wanted = 'ebd' then
    if not coalesce((c->>'issued_at')::bigint between extract(epoch from now())::bigint - 900 and extract(epoch from now())::bigint + 30, false) then return false; end if;
    if c->>'id' = 'admin' then
      select value into secret_value from public.settings where key = 'secretaria_admin_password';
    else
      select p.pin_hash into secret_value from public.ebd_class_passwords p
        join public.ebd_classes t on t.id = p.class_id and t.active
        where p.class_id::text = c->>'id' and p.active;
    end if;
  elsif wanted = 'diretoria' then
    select value into secret_value from public.settings where key = 'diretoria_pin_geral';
  else return false;
  end if;
  return coalesce(secret_value <> '' and c->>'fingerprint' = encode(extensions.digest('IPNC:PIN:v1:' || secret_value, 'sha256'), 'hex'), false)
    and exists(select 1 from public.profiles where user_id = auth.uid() and active);
exception when others then return false;
end;
$$;
revoke all on function ipnc_private.portal_valid(text) from public, anon;
grant execute on function ipnc_private.portal_valid(text) to authenticated, service_role;

create or replace function ipnc_private.actor_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.active)
    and case auth.jwt()->'app_metadata'->'ipnc_portal'->>'namespace'
      when 'ebd' then false
      when 'diretoria' then ipnc_private.portal_valid('diretoria')
      else true end;
$$;
create or replace function ipnc_private.actor_has_role(wanted public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select ipnc_private.actor_active() and exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = wanted);
$$;
create or replace function ipnc_private.actor_society() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.society_id from public.profiles p where p.user_id = auth.uid() and ipnc_private.actor_active() limit 1;
$$;

create or replace function public.ebd_session_valid() returns boolean
language sql stable security invoker set search_path = '' as $$ select ipnc_private.portal_valid('ebd'); $$;
create or replace function public.ebd_is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select ipnc_private.portal_valid('ebd') and auth.jwt()->'app_metadata'->'ipnc_portal'->>'id' = 'admin';
$$;
create or replace function ipnc_private.ebd_class_allowed(wanted uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select ipnc_private.portal_valid('ebd') and (public.ebd_is_admin() or wanted::text = auth.jwt()->'app_metadata'->'ipnc_portal'->>'id');
$$;
revoke all on function public.ebd_session_valid(), public.ebd_is_admin(), ipnc_private.ebd_class_allowed(uuid) from public, anon;
grant execute on function public.ebd_session_valid(), public.ebd_is_admin(), ipnc_private.ebd_class_allowed(uuid) to authenticated, service_role;

alter table public.ebd_students add column if not exists birth_date date;
alter table public.aniversariantes add column if not exists ano_nascimento integer check (ano_nascimento between 1900 and 2200);
alter table public.member_payment_submissions
  add column if not exists charge_id uuid references public.charges(id),
  add column if not exists receipt_path text,
  add column if not exists payment_date date,
  add column if not exists payment_method text;
alter table public.ebd_classes add column if not exists min_age integer,
  add column if not exists max_age integer, add column if not exists next_class_id uuid references public.ebd_classes(id),
  add column if not exists age_tracking_enabled boolean not null default false;
alter table public.ebd_classes add constraint ipnc_ebd_age_bounds check (
  (min_age is null or min_age between 0 and 130) and (max_age is null or max_age between 0 and 130)
  and (min_age is null or max_age is null or min_age <= max_age) and (next_class_id is null or next_class_id <> id));

do $$ declare t text; begin
  foreach t in array array['ebd_classes','ebd_students','ebd_attendance','ebd_day_closures','ebd_class_visitors','ebd_class_visitor_entries','ebd_class_logins'] loop
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy ipnc_ebd_admin on public.%I for all to authenticated using (public.ebd_is_admin()) with check (public.ebd_is_admin())',t);
  end loop;
end $$;
create policy ipnc_ebd_class_read on public.ebd_classes for select to authenticated using (active and ipnc_private.ebd_class_allowed(id));
create policy ipnc_ebd_student_read on public.ebd_students for select to authenticated using (active and ipnc_private.ebd_class_allowed(class_id));
create policy ipnc_ebd_attendance_read on public.ebd_attendance for select to authenticated using (ipnc_private.ebd_class_allowed(class_id));
create policy ipnc_ebd_attendance_insert on public.ebd_attendance for insert to authenticated with check (ipnc_private.ebd_class_allowed(class_id) and date = (now() at time zone 'America/Sao_Paulo')::date);
create policy ipnc_ebd_attendance_update on public.ebd_attendance for update to authenticated using (ipnc_private.ebd_class_allowed(class_id) and date = (now() at time zone 'America/Sao_Paulo')::date) with check (ipnc_private.ebd_class_allowed(class_id) and date = (now() at time zone 'America/Sao_Paulo')::date);
create policy ipnc_ebd_visitor_read on public.ebd_class_visitor_entries for select to authenticated using (ipnc_private.ebd_class_allowed(class_id));
create policy ipnc_ebd_visitor_insert on public.ebd_class_visitor_entries for insert to authenticated with check (ipnc_private.ebd_class_allowed(class_id) and date = (now() at time zone 'America/Sao_Paulo')::date);
create policy ipnc_ebd_visitor_delete on public.ebd_class_visitor_entries for delete to authenticated using (ipnc_private.ebd_class_allowed(class_id) and date = (now() at time zone 'America/Sao_Paulo')::date);

-- Serialized day mutations prevent an attendance write racing a closure.
create or replace function ipnc_private.guard_ebd_day() returns trigger
language plpgsql security definer set search_path = '' as $$
declare day date := case when tg_op='DELETE' then old.date else new.date end;
begin
  perform pg_advisory_xact_lock(1869639283, (day-date '2000-01-01')::integer);
  if tg_table_name <> 'ebd_day_closures' then
    if exists(select 1 from public.ebd_day_closures where date=day) then raise exception 'Dia fechado. Reabra a chamada antes de alterar.'; end if;
    if tg_op='UPDATE' and (new.date <> old.date or new.class_id <> old.class_id) then raise exception 'Não é permitido mover um registro de chamada.'; end if;
    if tg_table_name='ebd_attendance' and tg_op <> 'DELETE' then
      if not exists(select 1 from public.ebd_students s where s.id=new.student_id and s.class_id=new.class_id and s.active) then raise exception 'Aluno indisponível nesta turma.'; end if;
      if tg_op='UPDATE' and new.student_id <> old.student_id then raise exception 'Aluno não pode ser alterado.'; end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;
revoke all on function ipnc_private.guard_ebd_day() from public,anon,authenticated;
create trigger ipnc_guard_day before insert or update or delete on public.ebd_attendance for each row execute function ipnc_private.guard_ebd_day();
create trigger ipnc_guard_day before insert or update or delete on public.ebd_class_visitor_entries for each row execute function ipnc_private.guard_ebd_day();
create trigger ipnc_guard_day before insert or update or delete on public.ebd_day_closures for each row execute function ipnc_private.guard_ebd_day();

create or replace function public.ebd_closure(p_date date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.ebd_day_closures; c text := auth.jwt()->'app_metadata'->'ipnc_portal'->>'id';
begin
  if not ipnc_private.portal_valid('ebd') then raise exception 'Sessão expirada'; end if;
  select * into r from public.ebd_day_closures where date=p_date;
  if not found then return null; end if;
  if c='admin' then return to_jsonb(r); end if;
  return jsonb_build_object('id',r.id,'date',r.date,'visitor_count',0);
end;
$$;
revoke all on function public.ebd_closure(date) from public,anon;
grant execute on function public.ebd_closure(date) to authenticated,service_role;

-- Birthday names/month/day remain visible as in the church portal. Private
-- fields and inactive entries are restricted to the authorized administration.
create or replace function public.list_birthdays() returns setof public.aniversariantes
language plpgsql stable security definer set search_path = '' as $$
begin
  if ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('diretoria') or public.ebd_is_admin() then
    return query select * from public.aniversariantes order by mes,dia;
  else
    return query select (jsonb_populate_record(null::public.aniversariantes,
      jsonb_build_object('id',b.id,'nome',b.nome,'dia',b.dia,'mes',b.mes,'ativo',true,'pendente_revisao',false))).*
      from public.aniversariantes b where b.ativo order by b.mes,b.dia;
  end if;
end;
$$;
revoke all on function public.list_birthdays() from public;
grant execute on function public.list_birthdays() to anon,authenticated,service_role;
create policy ipnc_ebd_birthday_admin on public.aniversariantes for all to authenticated using (public.ebd_is_admin()) with check (public.ebd_is_admin());

-- Safe role helpers keep the original RPC signatures used throughout the app.
create or replace function public.has_role(_user_id uuid,_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
 select coalesce(case when auth.role()='service_role' then exists(select 1 from public.profiles p join public.user_roles r on p.user_id=r.user_id where p.user_id=_user_id and p.active and r.role=_role)
   when _user_id=auth.uid() then ipnc_private.actor_has_role(_role) else false end,false);
$$;
create or replace function public.has_management_role(_user_id uuid) returns boolean
language sql stable security invoker set search_path = '' as $$ select public.has_role(_user_id,'admin') or public.has_role(_user_id,'diretoria'); $$;
create or replace function public.has_pastor_role(_user_id uuid) returns boolean
language sql stable security invoker set search_path = '' as $$ select public.has_role(_user_id,'pastor'); $$;
create or replace function public.can_manage_elections(_user_id uuid) returns boolean
language sql stable security invoker set search_path = '' as $$ select public.has_management_role(_user_id) or public.has_pastor_role(_user_id); $$;
create or replace function public.get_user_society_id(_user_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$ select p.society_id from public.profiles p where p.user_id=_user_id and p.active and (_user_id=auth.uid() or auth.role()='service_role'); $$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
   and p.proname in ('has_role','has_management_role','has_pastor_role','can_manage_elections','get_user_society_id','create_shirt_campaign','add_shirt_campaign_lot','register_shirt_order_payment','update_shirt_campaign_with_optional_lot','update_task','update_task_status','delete_task') loop
   if f.signature::text ~ '^(create_shirt_campaign|add_shirt_campaign_lot|register_shirt_order_payment|update_shirt_campaign_with_optional_lot|update_task|update_task_status|delete_task)' then execute format('alter function %s security invoker',f.signature); end if;
   execute format('revoke all on function %s from public,anon',f.signature);
   execute format('grant execute on function %s to authenticated,service_role',f.signature);
 end loop;
end $$;

-- Old imported shared credentials are predictable. Dedicated server-managed
-- PIN accounts replace only these legacy identities; individual users are kept.
update public.profiles p set active=false
where p.username like 'diretoria-%' and p.email = p.username || '@ipnc.local'
 and not exists(select 1 from public.members m where m.user_id=p.user_id);

create policy ipnc_task_assignee_update on public.tasks for update to authenticated
using (ipnc_private.actor_active() and assignee_id=auth.uid())
with check (ipnc_private.actor_active() and assignee_id=auth.uid());

create or replace function ipnc_private.guard_task_relations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='UPDATE' and auth.role()='authenticated' and not ipnc_private.can_manage_society(old.society_id)
   and (new.society_id is distinct from old.society_id or new.meeting_id is distinct from old.meeting_id or new.assignee_id is distinct from old.assignee_id or new.created_by is distinct from old.created_by) then raise exception 'Sem permissão para transferir esta tarefa'; end if;
 if new.meeting_id is not null and not exists(select 1 from public.meetings m where m.id=new.meeting_id and m.society_id is not distinct from new.society_id) then raise exception 'Reunião de outra sociedade'; end if;
 if new.assignee_id is not null and not exists(select 1 from public.profiles p where p.user_id=new.assignee_id and p.active and (p.society_id is not distinct from new.society_id or exists(select 1 from public.user_roles r where r.user_id=p.user_id and r.role in ('admin','pastor')))) then raise exception 'Responsável de outra sociedade'; end if;
 return new;
end;
$$;
revoke all on function ipnc_private.guard_task_relations() from public,anon,authenticated;
create trigger ipnc_task_relations before insert or update on public.tasks for each row execute function ipnc_private.guard_task_relations();

-- Immutable scope of legacy objects, captured while the target is isolated.
-- Future edits to application receipt references never manufacture permissions.
create table ipnc_private.legacy_receipt_scopes (
  object_name text not null, society_id uuid not null references public.societies(id),
  primary key(object_name,society_id)
);
alter table ipnc_private.legacy_receipt_scopes enable row level security;
revoke all on ipnc_private.legacy_receipt_scopes from public,anon,authenticated;
insert into ipnc_private.legacy_receipt_scopes
select distinct regexp_replace(reference,'^(storage://receipts/|https://[^/]+/storage/v1/object/(public|sign|authenticated)/receipts/)',''),society_id
from (
 select receipt_url as reference,society_id from public.transactions union all
 select receipt_url,society_id from public.charges union all
 select receipt_url,society_id from public.member_payment_submissions union all
 select url,society_id from public.files
) refs where society_id is not null and reference is not null and reference <> '';
create or replace function ipnc_private.can_manage_receipt(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
 select coalesce(ipnc_private.actor_has_role('admin') or (ipnc_private.actor_has_role('diretoria') and (
   split_part(object_name,'/',1)=ipnc_private.actor_society()::text
   or exists(select 1 from ipnc_private.legacy_receipt_scopes l where l.object_name=can_manage_receipt.object_name and l.society_id=ipnc_private.actor_society())
   or (split_part(object_name,'/',1)='elections' and exists(select 1 from public.elections e where e.id::text=split_part(object_name,'/',2) and ipnc_private.can_manage_election(e.id)))
 )),false);
$$;

commit;
