begin;

-- Preserve trigger identity, owner, ACL, authorization, audit and locking rules.
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
  -- Dates are the accounting unit: receipts on the same day may cover its
  -- payments, but a later day/year cannot fund an earlier reserve withdrawal.
  -- Keep this check inside the existing ordered fund locks. Changes unrelated
  -- to a confirmed reserve leave any legacy history untouched.
  if (case when tg_op='INSERT' then new.status='confirmed' and new.per_capita_cents>0
    else (new.status='confirmed' and new.per_capita_cents>0 or old.status='confirmed' and old.per_capita_cents>0)
      and (new.fund_id,new.occurred_on,new.kind,new.status,new.per_capita_cents)
        is distinct from (old.fund_id,old.occurred_on,old.kind,old.status,old.per_capita_cents) end) then
    if exists (
      with changes as (
        select fund_id,occurred_on,case when kind='income' then per_capita_cents else -per_capita_cents end as delta
        from public.treasury_entries
        where status='confirmed' and id<>new.id
          and fund_id in(new.fund_id,case when tg_op='UPDATE' then old.fund_id else new.fund_id end)
        union all
        select new.fund_id,new.occurred_on,case when new.kind='income' then new.per_capita_cents else -new.per_capita_cents end
        where new.status='confirmed'
      ), daily as (
        select fund_id,occurred_on,sum(delta) as delta from changes group by fund_id,occurred_on
      ), timeline as (
        select sum(delta) over (partition by fund_id order by occurred_on rows between unbounded preceding and current row) as reserved
        from daily
      )
      select 1 from timeline where timeline.reserved<0
    ) then
      raise exception using errcode='23514',message='A alteração deixaria a per capita reservada negativa em uma data do histórico.';
    end if;
  end if;
  new.person_name:=btrim(new.person_name); new.description:=btrim(new.description);
  new.review_note:=btrim(new.review_note); new.updated_at:=clock_timestamp();
  return new;
end $$;
notify pgrst, 'reload schema';
commit;
