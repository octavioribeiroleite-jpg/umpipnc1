begin;

create table ipnc_private.treasury_pins (
  fund_id uuid primary key references public.treasury_funds(id) on delete restrict,
  pin_hash text not null,
  version uuid not null default gen_random_uuid(),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);
alter table ipnc_private.treasury_pins enable row level security;
revoke all on ipnc_private.treasury_pins from public, anon, authenticated;

-- PIN sessions belong only to treasury, never to the other application modules.
create or replace function ipnc_private.actor_active() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active)
 and case auth.jwt()->'app_metadata'->'ipnc_portal'->>'namespace'
   when 'ebd' then false
   when 'treasury' then false
   when 'diretoria' then ipnc_private.portal_valid('diretoria')
   else true end;
$$;

create function ipnc_private.treasury_session_fund() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare c jsonb:=auth.jwt()->'app_metadata'->'ipnc_portal'; found uuid;
begin
 if auth.uid() is null or c->>'namespace' is distinct from 'treasury' then return null; end if;
 if not coalesce((c->>'issued_at')::bigint between extract(epoch from now())::bigint-43200 and extract(epoch from now())::bigint+30,false) then return null; end if;
 select p.fund_id into found from ipnc_private.treasury_pins p
 where p.fund_id::text=c->>'id' and p.active
 and c->>'fingerprint'=encode(extensions.digest('IPNC:PIN:v1:'||p.version::text,'sha256'),'hex')
 and exists(select 1 from public.profiles u where u.user_id=auth.uid() and u.active and u.username='portal-treasury-'||p.fund_id::text);
 return found;
exception when others then return null;
end $$;
revoke all on function ipnc_private.treasury_session_fund() from public,anon,authenticated;
grant execute on function ipnc_private.treasury_session_fund() to authenticated;

create or replace function ipnc_private.treasury_manages(wanted uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce((wanted=ipnc_private.treasury_session_fund() or
 (ipnc_private.actor_active() and exists(select 1 from public.treasury_managers where user_id=auth.uid() and fund_id=wanted))),false);
$$;

-- Directory exposes names only; financial tables and aggregates require login.
create function ipnc_private.treasury_directory() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'abbreviation',abbreviation,'color',color) order by abbreviation),'[]'::jsonb) from public.treasury_funds;
$$;
create function public.treasury_directory() returns jsonb
language sql stable security invoker set search_path='' as $$ select ipnc_private.treasury_directory(); $$;
revoke all on function ipnc_private.treasury_directory(),public.treasury_directory() from public,anon,authenticated;
grant execute on function ipnc_private.treasury_directory(),public.treasury_directory() to anon,authenticated;

drop policy treasury_funds_public_read on public.treasury_funds;
create policy treasury_funds_scoped_read on public.treasury_funds for select to authenticated
 using ((select ipnc_private.actor_has_role('admin')) or ipnc_private.treasury_manages(id));
drop policy treasury_entries_public_confirmed on public.treasury_entries;
alter policy treasury_entries_visible on public.treasury_entries to authenticated
 using ((select ipnc_private.actor_has_role('admin')) or ipnc_private.treasury_manages(fund_id));
revoke select on public.treasury_funds,public.treasury_entries from anon;
revoke execute on function public.treasury_dashboard(),public.treasury_statement(uuid,text,text,date,date,integer,integer) from public,anon;

create or replace function public.treasury_access() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('admin',ipnc_private.actor_has_role('admin'),'fund_ids',
 coalesce((select jsonb_agg(id) from public.treasury_funds where ipnc_private.treasury_manages(id)),'[]'::jsonb));
$$;

create function ipnc_private.treasury_pin_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not ipnc_private.actor_has_role('admin') then raise insufficient_privilege using message='Acesso administrativo obrigatório.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('fund_id',f.id,'configured',p.fund_id is not null,'active',coalesce(p.active,false),'updated_at',p.updated_at) order by f.abbreviation),'[]'::jsonb)
 from public.treasury_funds f left join ipnc_private.treasury_pins p on p.fund_id=f.id);
end $$;
create function public.treasury_pin_status() returns jsonb
language sql stable security invoker set search_path='' as $$ select ipnc_private.treasury_pin_status(); $$;

create function ipnc_private.treasury_set_pin(p_fund_id uuid,p_pin text,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not ipnc_private.actor_has_role('admin') then raise insufficient_privilege using message='Acesso administrativo obrigatório.'; end if;
 if p_enabled is null or (p_enabled and (p_pin is null or p_pin !~ '^[0-9]{6}$')) then raise invalid_parameter_value using message='Informe um PIN de 6 números.'; end if;
 if not exists(select 1 from public.treasury_funds where id=p_fund_id) then raise invalid_parameter_value using message='Sociedade inválida.'; end if;
 if p_enabled then
   insert into ipnc_private.treasury_pins(fund_id,pin_hash,updated_by) values(p_fund_id,extensions.crypt(p_pin,extensions.gen_salt('bf',10)),auth.uid())
   on conflict(fund_id) do update set pin_hash=excluded.pin_hash,version=gen_random_uuid(),active=true,updated_at=now(),updated_by=auth.uid();
 else
   update ipnc_private.treasury_pins set active=false,version=gen_random_uuid(),updated_at=now(),updated_by=auth.uid() where fund_id=p_fund_id;
 end if;
end $$;
create function public.treasury_set_pin(p_fund_id uuid,p_pin text default null,p_enabled boolean default true) returns void
language sql security invoker set search_path='' as $$ select ipnc_private.treasury_set_pin(p_fund_id,p_pin,p_enabled); $$;
revoke all on function ipnc_private.treasury_pin_status(),public.treasury_pin_status(),ipnc_private.treasury_set_pin(uuid,text,boolean),public.treasury_set_pin(uuid,text,boolean) from public,anon,authenticated;
grant execute on function ipnc_private.treasury_pin_status(),public.treasury_pin_status(),ipnc_private.treasury_set_pin(uuid,text,boolean),public.treasury_set_pin(uuid,text,boolean) to authenticated;

-- Only the rate-limited Edge Function may verify a PIN and mint a session.
create function ipnc_private.treasury_verify_pin(p_fund_id uuid,p_pin text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare row ipnc_private.treasury_pins; fund_name text;
begin
 if p_pin is null or p_pin !~ '^[0-9]{6}$' then return null; end if;
 select * into row from ipnc_private.treasury_pins where fund_id=p_fund_id and active;
 if row.fund_id is null or extensions.crypt(p_pin,row.pin_hash)<>row.pin_hash then return null; end if;
 select name into fund_name from public.treasury_funds where id=p_fund_id;
 return jsonb_build_object('version',row.version,'name',fund_name);
end $$;
create function public.treasury_verify_pin(p_fund_id uuid,p_pin text) returns jsonb
language sql stable security invoker set search_path='' as $$ select ipnc_private.treasury_verify_pin(p_fund_id,p_pin); $$;
revoke all on function ipnc_private.treasury_verify_pin(uuid,text),public.treasury_verify_pin(uuid,text) from public,anon,authenticated;
grant execute on function ipnc_private.treasury_verify_pin(uuid,text),public.treasury_verify_pin(uuid,text) to service_role;

-- The guarded entry trigger is replaced below to accept a valid scoped PIN session.
create or replace function ipnc_private.treasury_entry_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare is_admin boolean:=ipnc_private.actor_has_role('admin'); bank public.treasury_bank_transactions; used bigint; reserved bigint;
begin
  if auth.uid() is null or not (ipnc_private.actor_active() or ipnc_private.treasury_session_fund() is not null) then
    raise exception using errcode='42501',message='Sessão ativa obrigatória.';
  end if;
  if not is_admin and (tg_op<>'INSERT' or not ipnc_private.treasury_manages(new.fund_id)
    or new.kind<>'income' or new.status<>'pending' or new.bank_transaction_id is not null
    or new.review_note<>'' or new.payment_method='opening') then
    raise exception using errcode='42501',message='Tesoureiro pode enviar somente recebimentos pendentes da própria sociedade.';
  end if;
  if new.occurred_on>(current_timestamp at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode='23514',message='Data futura não permitida.';
  end if;
  if tg_op='INSERT' then
    if new.revision<>1 then raise exception using errcode='23514',message='Revisão inicial inválida.'; end if;
    new.created_at:=clock_timestamp();
  else
    if new.id<>old.id or new.created_at<>old.created_at then raise exception using errcode='23514',message='Identificação imutável.'; end if;
    if new.revision<>old.revision+1 then raise exception using errcode='40001',message='Lançamento alterado; atualize o extrato.'; end if;
  end if;
  -- Serialise changes per fund and bank item. This protects reserve and allocation
  -- checks against two administrators confirming the same credit concurrently.
  perform id from public.treasury_funds where id in(new.fund_id,case when tg_op='UPDATE' then old.fund_id else new.fund_id end) order by id for update;
  if new.bank_transaction_id is not null then
    select * into bank from public.treasury_bank_transactions where id=new.bank_transaction_id for update;
    if bank.id is null or bank.kind<>new.kind or new.payment_method not in ('pix','transfer') then
      raise exception using errcode='23514',message='Movimento bancário incompatível.';
    end if;
  end if;
  if new.status='confirmed' then
    if new.payment_method in ('pix','transfer') then
      if bank.id is null then raise exception using errcode='23514',message='Vincule o movimento bancário antes de confirmar.'; end if;
      select coalesce(sum(amount_cents),0) into used from public.treasury_entries
        where bank_transaction_id=bank.id and status='confirmed' and id<>new.id;
      if used+new.amount_cents>bank.amount_cents then
        raise exception using errcode='23514',message='Valor bancário já utilizado. Confira a divisão do Pix.';
      end if;
    elsif length(btrim(new.review_note))<5 then
      raise exception using errcode='23514',message='Justifique a conferência de dinheiro ou saldo inicial.';
    end if;
  end if;
  if new.status='rejected' and length(btrim(new.review_note))<5 then
    raise exception using errcode='23514',message='Informe o motivo da devolução.';
  end if;
  if new.payment_method='opening' and new.kind<>'income' then
    raise exception using errcode='23514',message='Saldo inicial deve ser uma entrada.';
  end if;
  select coalesce(sum(case when kind='income' then per_capita_cents else -per_capita_cents end),0)
    into reserved from public.treasury_entries where fund_id=new.fund_id and status='confirmed' and id<>new.id;
  if new.status='confirmed' then reserved:=reserved+case when new.kind='income' then new.per_capita_cents else -new.per_capita_cents end; end if;
  if reserved<0 then raise exception using errcode='23514',message='A saída supera a per capita reservada.'; end if;
  if tg_op='UPDATE' and old.fund_id<>new.fund_id then
    select coalesce(sum(case when kind='income' then per_capita_cents else -per_capita_cents end),0) into reserved
      from public.treasury_entries where fund_id=old.fund_id and status='confirmed' and id<>new.id;
    if reserved<0 then raise exception using errcode='23514',message='A alteração deixaria a reserva anterior negativa.'; end if;
  end if;
  new.person_name:=btrim(new.person_name); new.description:=btrim(new.description);
  new.review_note:=btrim(new.review_note); new.updated_at:=clock_timestamp();
  return new;
end $$;
notify pgrst, 'reload schema';
commit;
