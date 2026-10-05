begin;

-- Explicit, revocable society assignments. Client-supplied titles never grant access.
create table public.treasury_managers (
  user_id uuid not null references auth.users(id) on delete cascade,
  fund_id uuid not null references public.treasury_funds(id) on delete restrict,
  primary key(user_id, fund_id)
);
alter table public.treasury_managers enable row level security;
revoke all on public.treasury_managers from public, anon, authenticated;
grant select, insert, delete on public.treasury_managers to authenticated;
create policy treasury_managers_read on public.treasury_managers for select to authenticated
using (user_id=(select auth.uid()) or (select ipnc_private.actor_has_role('admin')));
create policy treasury_managers_assign on public.treasury_managers for insert to authenticated
with check ((select ipnc_private.actor_has_role('admin')));
create policy treasury_managers_revoke on public.treasury_managers for delete to authenticated
using ((select ipnc_private.actor_has_role('admin')));

create function ipnc_private.treasury_manages(wanted uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and ipnc_private.actor_active() and exists(
    select 1 from public.treasury_managers where user_id=auth.uid() and fund_id=wanted);
$$;
revoke all on function ipnc_private.treasury_manages(uuid) from public, anon, authenticated;
grant execute on function ipnc_private.treasury_manages(uuid) to anon, authenticated;

create table public.treasury_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  revision integer not null default 1 check(revision>0),
  reference text not null check (length(btrim(reference)) between 6 and 150),
  occurred_on date not null check (occurred_on >= '1900-01-01'),
  kind text not null check(kind in ('income','expense')),
  amount_cents bigint not null check(amount_cents between 1 and 999999999999),
  created_at timestamptz not null default now()
);
create unique index treasury_bank_reference_unique on public.treasury_bank_transactions (regexp_replace(upper(btrim(reference)), '\s+', '', 'g'));
create function ipnc_private.treasury_bank_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare used bigint;
begin
 if tg_op='UPDATE' then
   if new.revision<>old.revision+1 then raise exception using errcode='40001',message='Movimento bancário alterado. Atualize a conferência.'; end if;
   select coalesce(sum(amount_cents),0) into used from public.treasury_entries where bank_transaction_id=old.id and status='confirmed';
   if new.amount_cents<used then raise exception using errcode='23514',message='Valor menor que os lançamentos já confirmados.'; end if;
   if used>0 and (new.kind<>old.kind or regexp_replace(upper(btrim(new.reference)), '\s+', '', 'g')<>old.reference) then raise exception using errcode='23514',message='Desvincule os lançamentos antes de trocar a referência ou direção.'; end if;
 elsif new.revision<>1 then raise exception using errcode='23514',message='Revisão inicial inválida.';
 end if;
 new.reference:=regexp_replace(upper(btrim(new.reference)), '\s+', '', 'g');
 if new.occurred_on>(current_timestamp at time zone 'America/Sao_Paulo')::date then raise exception using errcode='23514',message='Data bancária futura não permitida.'; end if;
 return new;
end $$;
revoke all on function ipnc_private.treasury_bank_guard() from public,anon,authenticated;
create trigger treasury_bank_guard before insert or update on public.treasury_bank_transactions for each row execute function ipnc_private.treasury_bank_guard();
alter table public.treasury_bank_transactions enable row level security;
revoke all on public.treasury_bank_transactions from public, anon, authenticated;
grant select, insert on public.treasury_bank_transactions to authenticated;
grant update(reference,occurred_on,kind,amount_cents,revision) on public.treasury_bank_transactions to authenticated;
create policy treasury_bank_admin_read on public.treasury_bank_transactions for select to authenticated using ((select ipnc_private.actor_has_role('admin')));
create policy treasury_bank_admin_insert on public.treasury_bank_transactions for insert to authenticated with check ((select ipnc_private.actor_has_role('admin')));

create policy treasury_bank_admin_update on public.treasury_bank_transactions for update to authenticated
using ((select ipnc_private.actor_has_role('admin'))) with check ((select ipnc_private.actor_has_role('admin')));
create table public.treasury_bank_audit(id bigint generated always as identity primary key,bank_id uuid not null references public.treasury_bank_transactions(id),actor_id uuid,changed_at timestamptz not null default clock_timestamp(),old_record jsonb,new_record jsonb not null);
alter table public.treasury_bank_audit enable row level security;
revoke all on public.treasury_bank_audit from public,anon,authenticated;
grant select on public.treasury_bank_audit to authenticated;
create policy treasury_bank_audit_read on public.treasury_bank_audit for select to authenticated using ((select ipnc_private.actor_has_role('admin')));
create function ipnc_private.treasury_bank_audit() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.treasury_bank_audit(bank_id,actor_id,old_record,new_record) values(new.id,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new));return new;
end $$;
revoke all on function ipnc_private.treasury_bank_audit() from public,anon,authenticated;
create trigger treasury_bank_audit after insert or update on public.treasury_bank_transactions for each row execute function ipnc_private.treasury_bank_audit();

-- Preserve previously posted entries. New records start pending by default.
alter table public.treasury_entries
  add column status text not null default 'confirmed' check(status in ('pending','confirmed','rejected')),
  add column payment_method text not null default 'cash' check(payment_method in ('pix','transfer','cash','opening')),
  add column shirt_cents bigint not null default 0 check(shirt_cents>=0),
  add column monthly_fee_cents bigint not null default 0 check(monthly_fee_cents>=0),
  add column per_capita_cents bigint not null default 0 check(per_capita_cents>=0),
  add column bank_transaction_id uuid references public.treasury_bank_transactions(id),
  add column review_note text not null default '' check(length(review_note)<=500),
  add constraint treasury_split_amount check(shirt_cents+monthly_fee_cents+per_capita_cents<=amount_cents);
alter table public.treasury_entries alter column status set default 'pending';
alter table public.treasury_entries alter column payment_method set default 'pix';
create index treasury_entries_pending on public.treasury_entries(fund_id,created_at) where status='pending';
create index treasury_entries_bank on public.treasury_entries(bank_transaction_id);

create table public.treasury_entry_audit (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.treasury_entries(id),
  actor_id uuid,
  changed_at timestamptz not null default clock_timestamp(),
  old_record jsonb,
  new_record jsonb not null
);
alter table public.treasury_entry_audit enable row level security;
revoke all on public.treasury_entry_audit from public, anon, authenticated;
grant select on public.treasury_entry_audit to authenticated;
create policy treasury_audit_admin_read on public.treasury_entry_audit for select to authenticated using ((select ipnc_private.actor_has_role('admin')));
create index treasury_audit_entry on public.treasury_entry_audit(entry_id);

create or replace function ipnc_private.treasury_entry_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare is_admin boolean:=ipnc_private.actor_has_role('admin'); bank public.treasury_bank_transactions; used bigint; reserved bigint;
begin
  if auth.uid() is null or not ipnc_private.actor_active() then
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

create function ipnc_private.treasury_audit() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  insert into public.treasury_entry_audit(entry_id,actor_id,old_record,new_record)
    values(new.id,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new));
  return new;
end $$;
revoke all on function ipnc_private.treasury_audit() from public,anon,authenticated;
create trigger treasury_entry_audit after insert or update on public.treasury_entries for each row execute function ipnc_private.treasury_audit();

drop policy treasury_entries_public_read on public.treasury_entries;
create policy treasury_entries_visible on public.treasury_entries for select to anon,authenticated
using (status='confirmed' or (select ipnc_private.actor_has_role('admin')) or ipnc_private.treasury_manages(fund_id));
drop policy treasury_entries_admin_insert on public.treasury_entries;
create policy treasury_entries_submit on public.treasury_entries for insert to authenticated
with check ((select ipnc_private.actor_has_role('admin')) or (ipnc_private.treasury_manages(fund_id) and kind='income' and status='pending'));
grant insert(status,payment_method,shirt_cents,monthly_fee_cents,per_capita_cents,bank_transaction_id,review_note),
 update(status,payment_method,shirt_cents,monthly_fee_cents,per_capita_cents,bank_transaction_id,review_note)
 on public.treasury_entries to authenticated;

create table public.treasury_attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.treasury_entries(id),
  path text not null unique,
  active boolean not null default true,
  filename text not null check(length(filename) between 1 and 150),
  mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),
  created_at timestamptz not null default now(),
  check(path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg)$' and split_part(path,'/',1)=entry_id::text)
);
create index treasury_attachments_entry on public.treasury_attachments(entry_id);
alter table public.treasury_attachments enable row level security;
revoke all on public.treasury_attachments from public,anon,authenticated;
grant select,insert on public.treasury_attachments to authenticated;
grant update(active) on public.treasury_attachments to authenticated;
create policy treasury_attachment_read on public.treasury_attachments for select to authenticated
using ((select ipnc_private.actor_has_role('admin')) or (active and exists(select 1 from public.treasury_entries e where e.id=entry_id and e.status='confirmed' and ipnc_private.treasury_manages(e.fund_id))));
-- Server-side object existence lookup avoids recursive Storage/attachment RLS.
create function ipnc_private.treasury_uploaded(wanted text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and ipnc_private.actor_has_role('admin') and exists(select 1 from storage.objects where bucket_id='treasury-receipts' and name=wanted);
$$;
revoke all on function ipnc_private.treasury_uploaded(text) from public,anon,authenticated;
grant execute on function ipnc_private.treasury_uploaded(text) to authenticated;
create policy treasury_attachment_archive on public.treasury_attachments for update to authenticated
using ((select ipnc_private.actor_has_role('admin'))) with check ((select ipnc_private.actor_has_role('admin')));
create function ipnc_private.treasury_attachment_audit() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.treasury_entry_audit(entry_id,actor_id,old_record,new_record) values(new.entry_id,auth.uid(),case when tg_op='UPDATE' then jsonb_build_object('attachment',to_jsonb(old)) end,jsonb_build_object('attachment',to_jsonb(new)));return new;
end $$;
revoke all on function ipnc_private.treasury_attachment_audit() from public,anon,authenticated;
create trigger treasury_attachment_audit after insert or update on public.treasury_attachments for each row execute function ipnc_private.treasury_attachment_audit();
create policy treasury_attachment_insert on public.treasury_attachments for insert to authenticated
with check (ipnc_private.treasury_uploaded(path));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('treasury-receipts','treasury-receipts',false,10485760,array['application/pdf','image/png','image/jpeg']);
create policy treasury_receipt_upload on storage.objects for insert to authenticated
with check(bucket_id='treasury-receipts' and (select ipnc_private.actor_has_role('admin')));
create policy treasury_receipt_read on storage.objects for select to authenticated
using(bucket_id='treasury-receipts' and ((select ipnc_private.actor_has_role('admin')) or exists(select 1 from public.treasury_attachments a where a.path=name)));

create function public.treasury_access() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('admin',ipnc_private.actor_has_role('admin'),'fund_ids',coalesce((select jsonb_agg(fund_id) from public.treasury_managers where user_id=auth.uid() and ipnc_private.treasury_manages(fund_id)),'[]'::jsonb));
$$;
create function public.treasury_admin_accounts() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'name',full_name,'username',username) order by full_name),'[]'::jsonb)
 from public.profiles where active and ipnc_private.actor_has_role('admin');
$$;
create function public.treasury_bank_reconciliation() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(b) order by b.occurred_on desc,b.id),'[]'::jsonb) from (
   select t.*,coalesce(sum(e.amount_cents),0) as allocated_cents,t.amount_cents-coalesce(sum(e.amount_cents),0) as remaining_cents
   from public.treasury_bank_transactions t left join public.treasury_entries e on e.bank_transaction_id=t.id and e.status='confirmed'
   group by t.id) b;
$$;
create function public.treasury_review_queue(p_fund_id uuid default null,p_offset integer default 0,p_limit integer default 20) returns jsonb
language plpgsql stable security invoker set search_path='' as $$ begin
 if p_offset is null or p_limit is null or p_offset<0 or p_limit<1 or p_limit>100 then raise exception using errcode='22023',message='Paginação inválida.'; end if;
 return (with items as materialized(select * from public.treasury_entries where status<>'confirmed' and (p_fund_id is null or fund_id=p_fund_id)), page as(select * from items order by created_at desc,id offset p_offset limit p_limit)
 select jsonb_build_object('entries',coalesce((select jsonb_agg(to_jsonb(p)) from page p),'[]'::jsonb),'total_count',(select count(*) from items)));
end $$;

-- All report rows are fetched in one database snapshot, without PostgREST's row
-- cap. Only confirmed records enter totals; carry-forward precedes the period.
create function public.treasury_report(p_year integer,p_fund_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare start_date date; end_date date;
begin
 if auth.uid() is null or not (ipnc_private.actor_has_role('admin') or (p_fund_id is not null and ipnc_private.treasury_manages(p_fund_id))) then
   raise exception using errcode='42501',message='Relatório restrito ao responsável da sociedade.';
 end if;
 if p_year is null or p_year<1900 or p_year>extract(year from current_date) then raise exception using errcode='22023',message='Ano inválido.'; end if;
 start_date:=make_date(p_year,1,1); end_date:=make_date(p_year,12,31);
 return(with ledger as materialized(select e.*,sum(case when kind='income' then amount_cents else -amount_cents end) over(partition by fund_id order by occurred_on,created_at,id) as balance_after_cents
 from public.treasury_entries e where status='confirmed' and (p_fund_id is null or fund_id=p_fund_id)), period as materialized(select * from ledger where occurred_on between start_date and end_date)
 select jsonb_build_object('year',p_year,'funds',(select jsonb_agg(to_jsonb(f)) from public.treasury_funds f where p_fund_id is null or f.id=p_fund_id),
 'opening_cents',(select coalesce(sum(case when kind='income' then amount_cents else -amount_cents end),0) from ledger where occurred_on<start_date),
 'reserved_cents',(select coalesce(sum(case when kind='income' then per_capita_cents else -per_capita_cents end),0) from ledger where occurred_on<=end_date),
 'entries',coalesce((select jsonb_agg(to_jsonb(p) order by occurred_on,created_at,id) from period p),'[]'::jsonb),
 'pending_count',(select count(*) from public.treasury_entries where status='pending' and occurred_on between start_date and end_date and (p_fund_id is null or fund_id=p_fund_id)),
 'attachments',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at,a.id) from public.treasury_attachments a join period p on p.id=a.entry_id where a.active),'[]'::jsonb)));
end $$;

revoke all on function public.treasury_access(),public.treasury_admin_accounts(),public.treasury_bank_reconciliation(),public.treasury_review_queue(uuid,integer,integer),public.treasury_report(integer,uuid) from public,anon,authenticated;
grant execute on function public.treasury_access(),public.treasury_admin_accounts(),public.treasury_bank_reconciliation(),public.treasury_review_queue(uuid,integer,integer),public.treasury_report(integer,uuid) to authenticated;

create or replace function public.treasury_dashboard() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with fund_totals as (
    select f.id, f.name, f.abbreviation, f.color,
      coalesce(sum(e.amount_cents) filter (where e.kind = 'income'), 0) as income_cents,
      coalesce(sum(e.amount_cents) filter (where e.kind = 'expense'), 0) as expense_cents,
      count(e.id) as entry_count, coalesce(sum(case when e.kind='income' then e.per_capita_cents else -e.per_capita_cents end),0) as reserved_cents
    from public.treasury_funds f left join public.treasury_entries e on e.fund_id = f.id and e.status='confirmed'
    group by f.id
  ), funds as (
    select *, income_cents - expense_cents as balance_cents, income_cents - expense_cents - reserved_cents as available_cents from fund_totals
  ), months as (
    select generate_series(
      date_trunc('month', current_timestamp at time zone 'America/Sao_Paulo') - interval '5 months',
      date_trunc('month', current_timestamp at time zone 'America/Sao_Paulo'), interval '1 month'
    )::date as month
  ), monthly as (
    select to_char(m.month, 'YYYY-MM') as month,
      coalesce(sum(e.amount_cents) filter (where e.kind = 'income'), 0) as income_cents,
      coalesce(sum(e.amount_cents) filter (where e.kind = 'expense'), 0) as expense_cents
    from months m left join public.treasury_entries e
      on e.status='confirmed' and e.occurred_on >= m.month and e.occurred_on < m.month + interval '1 month'
    group by m.month
  )
  select jsonb_build_object(
    'funds', coalesce((select jsonb_agg(to_jsonb(f) order by f.abbreviation) from funds f), '[]'::jsonb),
    'totals', (select jsonb_build_object(
      'income_cents', coalesce(sum(income_cents), 0),
      'expense_cents', coalesce(sum(expense_cents), 0),
      'balance_cents', coalesce(sum(balance_cents), 0),
      'entry_count', coalesce(sum(entry_count), 0), 'reserved_cents', coalesce(sum(reserved_cents),0), 'available_cents',coalesce(sum(available_cents),0)) from funds),
    'months', (select jsonb_agg(to_jsonb(m) order by m.month) from monthly m)
  );
$$;

create or replace function public.treasury_statement(
  p_fund_id uuid default null,
  p_kind text default null,
  p_search text default null,
  p_start date default null,
  p_end date default null,
  p_offset integer default 0,
  p_limit integer default 20
) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_kind is not null and p_kind not in ('income', 'expense') then
    raise exception using errcode = '22023', message = 'Tipo de lançamento inválido.';
  end if;
  if p_offset is null or p_offset < 0 or p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Paginação inválida.';
  end if;
  if char_length(p_search) > 120 or p_start > p_end then
    raise exception using errcode = '22023', message = 'Filtros inválidos.';
  end if;
  return (
    -- Running balances must be calculated BEFORE filters or pagination. The
    -- same deterministic ordering is used in both directions for date ties.
    with ledger as materialized (
      select e.*, sum(case when e.kind = 'income' then e.amount_cents else -e.amount_cents end)
        over (partition by e.fund_id order by e.occurred_on, e.created_at, e.id
          rows between unbounded preceding and current row) as balance_after_cents
      from public.treasury_entries e
      where e.status='confirmed' and (p_fund_id is null or e.fund_id = p_fund_id)
    ), filtered as materialized (
      select * from ledger l where
        (p_kind is null or l.kind = p_kind)
        and (p_start is null or l.occurred_on >= p_start)
        and (p_end is null or l.occurred_on <= p_end)
        and (coalesce(btrim(p_search), '') = '' or
          strpos(lower(l.person_name || ' ' || l.description), lower(btrim(p_search))) > 0)
    ), page as (
      select * from filtered order by occurred_on desc, created_at desc, id desc
      offset p_offset limit p_limit
    )
    select jsonb_build_object(
      'entries', coalesce((select jsonb_agg(to_jsonb(p) order by p.occurred_on desc, p.created_at desc, p.id desc) from page p), '[]'::jsonb),
      'total_count', (select count(*) from filtered),
      'income_cents', (select coalesce(sum(amount_cents) filter (where kind = 'income'), 0) from filtered),
      'expense_cents', (select coalesce(sum(amount_cents) filter (where kind = 'expense'), 0) from filtered)
    )
  );
end;
$$;

notify pgrst, 'reload schema';
commit;
