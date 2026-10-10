begin;

-- Durable request tombstones survive legacy charge/payment deletion. They contain
-- only identifiers and a request digest, never member names, notes or receipts.
create table ipnc_private.financial_charge_requests (
  request_id uuid primary key,
  actor_id uuid not null,
  charge_id uuid not null,
  society_id uuid,
  operation text not null check (operation in ('payment','revert','delete')),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  expected_hash text not null check (expected_hash ~ '^[0-9a-f]{64}$'),
  result_hash text not null check (result_hash ~ '^[0-9a-f]{64}$'),
  context_txid bigint,
  completed_at timestamptz,
  check ((completed_at is null and context_txid is not null) or (completed_at is not null and context_txid is null))
);
create unique index financial_charge_one_pending on ipnc_private.financial_charge_requests(charge_id) where completed_at is null;
alter table ipnc_private.financial_charge_requests enable row level security;
revoke all on ipnc_private.financial_charge_requests from public,anon,authenticated;

-- This helper only handles request metadata. Business writes remain in the
-- SECURITY INVOKER RPC, under the existing charges/transactions RLS and grants.
create function ipnc_private.financial_charge_request(
  p_request_id uuid,p_charge_id uuid,p_operation text,p_expected jsonb,
  p_payload jsonb default '{}'::jsonb,p_start boolean default false
) returns boolean language plpgsql security definer set search_path='' as $$
declare
  prior ipnc_private.financial_charge_requests; charge public.charges; member public.members;
  snapshot jsonb; expected jsonb; desired jsonb; request_hash text; expected_hash text; result_hash text;
  v_amount numeric; v_paid_at timestamptz; v_receipt text; v_notes text;
begin
  if auth.uid() is null or not ipnc_private.actor_active() then
    raise exception using errcode='42501',message='Sessão ativa obrigatória.';
  end if;
  if p_request_id is null or p_charge_id is null or p_operation is null or p_operation not in ('payment','revert','delete')
    or p_start is null or jsonb_typeof(p_expected) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object'
    or not (p_expected ?& array['paid_amount','transaction_id','status','amount','member_id','society_id','updated_at'])
    or (select count(*) from jsonb_object_keys(p_expected))<>7
    or jsonb_typeof(p_expected->'paid_amount') is distinct from 'number'
    or jsonb_typeof(p_expected->'amount') is distinct from 'number'
    or jsonb_typeof(p_expected->'status') is distinct from 'string'
    or jsonb_typeof(p_expected->'member_id') is distinct from 'string'
    or jsonb_typeof(p_expected->'transaction_id') not in ('string','null')
    or jsonb_typeof(p_expected->'society_id') not in ('string','null')
    or jsonb_typeof(p_expected->'updated_at') is distinct from 'string' then
    raise exception using errcode='22023',message='Operação inválida.';
  end if;
  expected:=jsonb_build_object('paid_amount',trim_scale((p_expected->>'paid_amount')::numeric),
    'transaction_id',(p_expected->>'transaction_id')::uuid,'status',p_expected->>'status',
    'amount',trim_scale((p_expected->>'amount')::numeric),'member_id',(p_expected->>'member_id')::uuid,
    'society_id',(p_expected->>'society_id')::uuid,'updated_at',(p_expected->>'updated_at')::timestamptz);
  request_hash:=encode(sha256(convert_to(jsonb_build_object('expected',expected,'payload',p_payload)::text,'UTF8')),'hex');
  -- The request namespace is global, including collisions across users/charges.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('IPNC:CHARGE:'||p_request_id::text,0));
  select * into prior from ipnc_private.financial_charge_requests where request_id=p_request_id;
  if found then
    if prior.actor_id<>auth.uid() then
      raise exception using errcode='42501',message='Operação indisponível para este acesso.';
    end if;
    if prior.charge_id<>p_charge_id or prior.operation<>p_operation or prior.request_hash<>request_hash then
      raise exception using errcode='40001',message='Esta tentativa já foi utilizada com outros dados.';
    end if;
    if not ipnc_private.can_manage_society(prior.society_id) then
      raise exception using errcode='42501',message='Acesso à sociedade não confirmado.';
    end if;
    select * into charge from public.charges where id=p_charge_id;
    if found and not ipnc_private.can_manage_society(charge.society_id) then
      raise exception using errcode='42501',message='Acesso atual à cobrança não confirmado.';
    end if;
    if prior.completed_at is null and prior.context_txid<>txid_current() then
      raise exception using errcode='40001',message='Tentativa financeira incompleta.';
    end if;
    return prior.completed_at is not null;
  end if;
  if p_start then
    select * into charge from public.charges where id=p_charge_id for update;
    if not found or not ipnc_private.can_manage_society(charge.society_id) then
      raise exception using errcode='42501',message='Acesso à sociedade não confirmado.';
    end if;
    snapshot:=jsonb_build_object('paid_amount',trim_scale(coalesce(charge.paid_amount,0)),'transaction_id',charge.transaction_id,
      'status',charge.status,'amount',trim_scale(charge.amount),'member_id',charge.member_id,
      'society_id',charge.society_id,'updated_at',charge.updated_at);
    if snapshot is distinct from expected then
      raise exception using errcode='40001',message='A cobrança foi alterada. Atualize os dados antes de continuar.';
    end if;
    if charge.type<>'annual_contribution' then
      raise exception using errcode='22023',message='Esta operação exige uma cobrança anual.';
    end if;
    select * into member from public.members where id=charge.member_id;
    if not found or (charge.society_id is not null and member.society_id is distinct from charge.society_id) then
      raise exception using errcode='42501',message='Membro e sociedade da cobrança incompatíveis.';
    end if;
    perform ipnc_private.financial_charge_link_count(charge.id);
    -- Both hashes are server-derived from the same validated request. Accepting
    -- separately supplied hashes would allow a false replay of another payload.
    if p_operation='payment' then
      if (select count(*) from jsonb_object_keys(p_payload))<>5
        or not (p_payload ?& array['amount','paid_at','payment_method','receipt_url','notes'])
        or jsonb_typeof(p_payload->'amount') is distinct from 'number'
        or jsonb_typeof(p_payload->'paid_at') is distinct from 'string'
        or jsonb_typeof(p_payload->'payment_method') is distinct from 'string'
        or jsonb_typeof(p_payload->'receipt_url') not in ('string','null')
        or jsonb_typeof(p_payload->'notes') not in ('string','null')
        or p_payload->>'payment_method' not in ('pix','dinheiro','transferencia','outro') then
        raise exception using errcode='22023',message='Dados do pagamento inválidos.';
      end if;
      v_amount:=(p_payload->>'amount')::numeric;v_paid_at:=(p_payload->>'paid_at')::timestamptz;
      v_receipt:=p_payload->>'receipt_url';v_notes:=p_payload->>'notes';
      if v_amount<=0 or v_amount>9999999999.99 or v_amount<>round(v_amount,2)
        or v_amount>charge.amount-coalesce(charge.paid_amount,0) or not isfinite(v_paid_at)
        or charge.status in ('isento','cancelado') or length(coalesce(v_notes,''))>5000 or length(coalesce(v_receipt,''))>2048 then
        raise exception using errcode='22023',message='Valor, data ou estado do pagamento inválido.';
      end if;
      if v_receipt is not null and (charge.society_id is null
        or v_receipt not like 'storage://receipts/'||charge.society_id::text||'/%'
        or v_receipt ~ '(^|/)[.][.](/|$)' or v_receipt ~ '[\\?#]') then
        raise exception using errcode='22023',message='Comprovante da sociedade inválido.';
      end if;
      desired:=jsonb_build_object('status','pago','paid_at',v_paid_at,'payment_method',p_payload->>'payment_method',
        'receipt_url',coalesce(v_receipt,charge.receipt_url),'notes',v_notes,'transaction_id',p_request_id,
        'paid_amount',trim_scale(coalesce(charge.paid_amount,0)+v_amount));
    else
      if (p_operation='revert' and ((select count(*) from jsonb_object_keys(p_payload))<>1 or not (p_payload ? 'notes')
        or jsonb_typeof(p_payload->'notes') not in ('string','null') or length(coalesce(p_payload->>'notes',''))>5000))
        or (p_operation='delete' and p_payload<>'{}'::jsonb) then
        raise exception using errcode='22023',message='Dados da operação inválidos.';
      end if;
      desired:=case when p_operation='delete' then 'null'::jsonb else
        jsonb_build_object('status','pendente','paid_at',null,'payment_method',null,'receipt_url',null,
          'notes',p_payload->>'notes','transaction_id',null,'paid_amount',null) end;
    end if;
    expected_hash:=encode(sha256(convert_to(expected::text,'UTF8')),'hex');
    result_hash:=encode(sha256(convert_to(desired::text,'UTF8')),'hex');
    insert into ipnc_private.financial_charge_requests(request_id,actor_id,charge_id,society_id,operation,request_hash,expected_hash,result_hash,context_txid)
      values(p_request_id,auth.uid(),p_charge_id,charge.society_id,p_operation,request_hash,expected_hash,result_hash,txid_current());
  end if;
  return false;
end $$;
revoke all on function ipnc_private.financial_charge_request(uuid,uuid,text,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function ipnc_private.financial_charge_request(uuid,uuid,text,jsonb,jsonb,boolean) to authenticated;

-- Only an actual charge write can finish an intent. A client cannot manufacture
-- a completed tombstone by invoking the metadata helper, nor by setting a GUC.
create function ipnc_private.financial_charge_finish() returns trigger
language plpgsql security definer set search_path='' as $$
declare request ipnc_private.financial_charge_requests; result jsonb; snapshot jsonb; payment public.transactions;
begin
  select * into request from ipnc_private.financial_charge_requests
    where charge_id=old.id and actor_id=auth.uid() and context_txid=txid_current() and completed_at is null;
  if not found then return null; end if;
  if not ipnc_private.actor_active() or not ipnc_private.can_manage_society(request.society_id)
    or old.society_id is distinct from request.society_id or old.type<>'annual_contribution' then
    raise exception using errcode='42501',message='Acesso à cobrança não confirmado.';
  end if;
  snapshot:=jsonb_build_object('paid_amount',trim_scale(coalesce(old.paid_amount,0)),'transaction_id',old.transaction_id,
    'status',old.status,'amount',trim_scale(old.amount),'member_id',old.member_id,
    'society_id',old.society_id,'updated_at',old.updated_at);
  if encode(sha256(convert_to(snapshot::text,'UTF8')),'hex')<>request.expected_hash then
    raise exception using errcode='40001',message='O saldo da cobrança foi alterado durante a operação.';
  end if;
  -- Deleting the last linked transaction causes the existing FK SET NULL to
  -- update this row before the final revert/delete. Accept only that exact
  -- change and advance the expected snapshot; never complete the intent here.
  if tg_op='UPDATE' and request.operation in ('revert','delete')
    and old.transaction_id is not null and new.transaction_id is null
    and (to_jsonb(new)-array['transaction_id','updated_at']) is not distinct from (to_jsonb(old)-array['transaction_id','updated_at'])
    and not exists(select 1 from public.transactions where id=old.transaction_id) then
    snapshot:=jsonb_build_object('paid_amount',trim_scale(coalesce(new.paid_amount,0)),'transaction_id',new.transaction_id,
      'status',new.status,'amount',trim_scale(new.amount),'member_id',new.member_id,
      'society_id',new.society_id,'updated_at',new.updated_at);
    update ipnc_private.financial_charge_requests set expected_hash=encode(sha256(convert_to(snapshot::text,'UTF8')),'hex')
      where request_id=request.request_id;
    return null;
  end if;
  if request.operation='delete' then
    if tg_op<>'DELETE' then raise exception using errcode='23514',message='Etapa de exclusão inválida.';end if;
    result:='null'::jsonb;
  else
    if tg_op<>'UPDATE' then raise exception using errcode='23514',message='Etapa financeira inválida.';end if;
    if row(new.id,new.member_id,new.society_id,new.type,new.competence,new.amount,new.due_date)
      is distinct from row(old.id,old.member_id,old.society_id,old.type,old.competence,old.amount,old.due_date) then
      raise exception using errcode='23514',message='A operação financeira alterou dados da cobrança.';
    end if;
    result:=jsonb_build_object('status',new.status,'paid_at',new.paid_at,'payment_method',new.payment_method,
      'receipt_url',new.receipt_url,'notes',new.notes,'transaction_id',new.transaction_id,'paid_amount',trim_scale(new.paid_amount));
  end if;
  if encode(sha256(convert_to(result::text,'UTF8')),'hex')<>request.result_hash then
    raise exception using errcode='23514',message='O resultado financeiro diverge da tentativa.';
  end if;
  if request.operation='payment' then
    select * into payment from public.transactions where id=request.request_id;
    if not found or new.transaction_id is distinct from request.request_id or new.status<>'pago'
      or new.paid_amount is null or new.paid_at is null or not isfinite(new.paid_at)
      or old.status in ('isento','cancelado') or payment.type<>'entrada' or payment.origin is distinct from 'automatic'
      or payment.created_by<>request.actor_id or payment.member_id is distinct from new.member_id
      or payment.society_id is distinct from new.society_id or payment.reference_type is distinct from 'charge'
      or payment.reference_id is distinct from new.id or payment.amount<=0 or payment.amount<>round(payment.amount,2)
      or payment.amount<>new.paid_amount-coalesce(old.paid_amount,0) or new.paid_amount>new.amount
      or payment.date is distinct from (new.paid_at at time zone 'UTC')::date then
      raise exception using errcode='23514',message='Pagamento e cobrança incompatíveis.';
    end if;
  else
    if exists(select 1 from public.transactions where (reference_type='charge' and reference_id=old.id) or id=old.transaction_id) then
      raise exception using errcode='42501',message='Existem movimentações vinculadas à cobrança.';
    end if;
    if request.operation='revert' and (new.status<>'pendente' or new.paid_amount is not null
      or new.paid_at is not null or new.payment_method is not null or new.receipt_url is not null or new.transaction_id is not null) then
      raise exception using errcode='23514',message='Estorno da cobrança incompleto.';
    end if;
  end if;
  update ipnc_private.financial_charge_requests set completed_at=clock_timestamp(),context_txid=null where request_id=request.request_id;
  return null;
end $$;
revoke all on function ipnc_private.financial_charge_finish() from public,anon,authenticated;
create trigger financial_charge_finish after update or delete on public.charges
  for each row execute function ipnc_private.financial_charge_finish();

create function ipnc_private.financial_charge_request_complete() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from ipnc_private.financial_charge_requests where request_id=new.request_id and completed_at is null) then
    raise exception using errcode='23514',message='A tentativa financeira não foi concluída.';
  end if;
  return null;
end $$;
revoke all on function ipnc_private.financial_charge_request_complete() from public,anon,authenticated;
create constraint trigger financial_charge_request_complete after insert or update on ipnc_private.financial_charge_requests
  deferrable initially deferred for each row execute function ipnc_private.financial_charge_request_complete();

-- Count/validate all associated rows without revealing invisible transactions.
-- The invoker later locks/deletes visible rows and must match this count, so RLS
-- cannot turn a partial deletion into a falsely successful charge operation.
create function ipnc_private.financial_charge_link_count(p_charge_id uuid) returns bigint
language plpgsql security definer set search_path='' as $$
declare charge public.charges; total bigint;
begin
  select * into charge from public.charges where id=p_charge_id;
  if auth.uid() is null or not ipnc_private.actor_active() or charge.id is null
    or not ipnc_private.can_manage_society(charge.society_id) then
    raise exception using errcode='42501',message='Acesso à cobrança não confirmado.';
  end if;
  if exists(select 1 from public.transactions t
    where ((t.reference_type='charge' and t.reference_id=charge.id) or t.id=charge.transaction_id)
      and (t.society_id is distinct from charge.society_id
        or (t.member_id is not null and t.member_id<>charge.member_id)
        or t.type<>'entrada'
        or (t.id=charge.transaction_id and
          ((t.reference_type is not null and t.reference_type<>'charge')
            or (t.reference_id is not null and t.reference_id<>charge.id))))) then
    raise exception using errcode='42501',message='Vínculo financeiro incompatível. Confira a cobrança.';
  end if;
  if charge.transaction_id is not null and not exists(select 1 from public.transactions where id=charge.transaction_id) then
    raise exception using errcode='40001',message='Movimentação vinculada não encontrada. Atualize os dados.';
  end if;
  select count(*) into total from public.transactions t
    where (t.reference_type='charge' and t.reference_id=charge.id) or t.id=charge.transaction_id;
  return total;
end $$;
revoke all on function ipnc_private.financial_charge_link_count(uuid) from public,anon,authenticated;
grant execute on function ipnc_private.financial_charge_link_count(uuid) to authenticated;

create function public.financial_charge_operation(
  p_request_id uuid,p_charge_id uuid,p_operation text,p_expected jsonb,p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  charge public.charges; member public.members; saved public.charges;
  actual jsonb; expected jsonb; replayed boolean;
  v_amount numeric; v_paid_at timestamptz; v_receipt text; v_notes text;
  expected_links bigint; visible_links bigint; deleted_links bigint;
begin
  if auth.uid() is null or not ipnc_private.actor_active() then
    raise exception using errcode='42501',message='Sessão ativa obrigatória.';
  end if;
  if p_request_id is null or p_charge_id is null or p_operation is null or p_operation not in ('payment','revert','delete')
    or jsonb_typeof(p_expected) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object'
    or not (p_expected ?& array['paid_amount','transaction_id','status','amount','member_id','society_id','updated_at'])
    or (select count(*) from jsonb_object_keys(p_expected))<>7
    or jsonb_typeof(p_expected->'paid_amount') is distinct from 'number'
    or jsonb_typeof(p_expected->'amount') is distinct from 'number'
    or jsonb_typeof(p_expected->'status') is distinct from 'string'
    or jsonb_typeof(p_expected->'member_id') is distinct from 'string'
    or jsonb_typeof(p_expected->'transaction_id') not in ('string','null')
    or jsonb_typeof(p_expected->'society_id') not in ('string','null')
    or jsonb_typeof(p_expected->'updated_at') is distinct from 'string' then
    raise exception using errcode='22023',message='Dados da cobrança inválidos. Atualize a tela.';
  end if;
  expected:=jsonb_build_object('paid_amount',trim_scale((p_expected->>'paid_amount')::numeric),
    'transaction_id',(p_expected->>'transaction_id')::uuid,'status',p_expected->>'status',
    'amount',trim_scale((p_expected->>'amount')::numeric),'member_id',(p_expected->>'member_id')::uuid,
    'society_id',(p_expected->>'society_id')::uuid,'updated_at',(p_expected->>'updated_at')::timestamptz);
  replayed:=ipnc_private.financial_charge_request(p_request_id,p_charge_id,p_operation,expected,p_payload);
  if replayed then
    select * into saved from public.charges where id=p_charge_id;
    return jsonb_build_object('request_id',p_request_id,'operation',p_operation,'replayed',true,
      'charge',case when saved.id is null then null else to_jsonb(saved) end);
  end if;
  select * into charge from public.charges where id=p_charge_id for update;
  if not found or not ipnc_private.can_manage_society(charge.society_id) then
    raise exception using errcode='42501',message='Acesso à cobrança não confirmado.';
  end if;
  if charge.type<>'annual_contribution' then
    raise exception using errcode='22023',message='Esta operação exige uma cobrança anual.';
  end if;
  actual:=jsonb_build_object('paid_amount',trim_scale(coalesce(charge.paid_amount,0)),'transaction_id',charge.transaction_id,
    'status',charge.status,'amount',trim_scale(charge.amount),'member_id',charge.member_id,
    'society_id',charge.society_id,'updated_at',charge.updated_at);
  if expected is distinct from actual then
    raise exception using errcode='40001',message='A cobrança foi alterada. Atualize os dados antes de continuar.';
  end if;
  select * into member from public.members where id=charge.member_id;
  if not found or (charge.society_id is not null and member.society_id is distinct from charge.society_id) then
    raise exception using errcode='42501',message='Membro e sociedade da cobrança incompatíveis.';
  end if;
  expected_links:=ipnc_private.financial_charge_link_count(charge.id);
  select count(*) into visible_links from public.transactions t
    where (t.reference_type='charge' and t.reference_id=charge.id) or t.id=charge.transaction_id;
  if visible_links<>expected_links then
    raise exception using errcode='42501',message='Não foi possível confirmar todas as movimentações vinculadas.';
  end if;
  if p_operation='payment' then
    if (select count(*) from jsonb_object_keys(p_payload))<>5
      or not (p_payload ?& array['amount','paid_at','payment_method','receipt_url','notes'])
      or jsonb_typeof(p_payload->'amount') is distinct from 'number'
      or jsonb_typeof(p_payload->'paid_at') is distinct from 'string'
      or jsonb_typeof(p_payload->'payment_method') is distinct from 'string'
      or jsonb_typeof(p_payload->'receipt_url') not in ('string','null')
      or jsonb_typeof(p_payload->'notes') not in ('string','null')
      or p_payload->>'payment_method' not in ('pix','dinheiro','transferencia','outro') then
      raise exception using errcode='22023',message='Dados do pagamento inválidos.';
    end if;
    v_amount:=(p_payload->>'amount')::numeric; v_paid_at:=(p_payload->>'paid_at')::timestamptz;
    v_receipt:=p_payload->>'receipt_url'; v_notes:=p_payload->>'notes';
    if v_amount<=0 or v_amount>9999999999.99 or v_amount<>round(v_amount,2)
      or v_amount>charge.amount-coalesce(charge.paid_amount,0) or not isfinite(v_paid_at)
      or charge.status in ('isento','cancelado') or length(coalesce(v_notes,''))>5000
      or length(coalesce(v_receipt,''))>2048 then
      raise exception using errcode='22023',message='Valor, data ou estado do pagamento inválido.';
    end if;
    if v_receipt is not null and (charge.society_id is null
      or v_receipt not like 'storage://receipts/'||charge.society_id::text||'/%'
      or v_receipt ~ '(^|/)[.][.](/|$)' or v_receipt ~ '[\\?#]') then
      raise exception using errcode='22023',message='Comprovante da sociedade inválido.';
    end if;
    perform ipnc_private.financial_charge_request(p_request_id,p_charge_id,p_operation,expected,p_payload,true);
    insert into public.transactions(id,description,amount,type,date,created_by,origin,reference_type,reference_id,member_id,receipt_url,society_id)
      values(p_request_id,'Contribuição anual - '||member.name||' - '||charge.competence,v_amount,'entrada',
        (v_paid_at at time zone 'UTC')::date,auth.uid(),'automatic','charge',charge.id,charge.member_id,v_receipt,charge.society_id);
    update public.charges set status='pago',paid_at=v_paid_at,payment_method=p_payload->>'payment_method',
      receipt_url=coalesce(v_receipt,charge.receipt_url),notes=v_notes,transaction_id=p_request_id,
      paid_amount=coalesce(charge.paid_amount,0)+v_amount where id=charge.id returning * into saved;
    if not found then raise exception using errcode='42501',message='A baixa não foi confirmada.'; end if;
  else
    if (p_operation='revert' and ((select count(*) from jsonb_object_keys(p_payload))<>1 or not (p_payload ? 'notes')
      or jsonb_typeof(p_payload->'notes') not in ('string','null')
      or length(coalesce(p_payload->>'notes',''))>5000))
      or (p_operation='delete' and p_payload<>'{}'::jsonb) then
      raise exception using errcode='22023',message='Dados da operação inválidos.';
    end if;
    perform ipnc_private.financial_charge_request(p_request_id,p_charge_id,p_operation,expected,p_payload,true);
    perform t.id from public.transactions t
      where (t.reference_type='charge' and t.reference_id=charge.id) or t.id=charge.transaction_id order by t.id for update;
    delete from public.transactions t
      where (t.reference_type='charge' and t.reference_id=charge.id) or t.id=charge.transaction_id;
    get diagnostics deleted_links=row_count;
    if deleted_links<>expected_links then
      raise exception using errcode='42501',message='As movimentações vinculadas não foram removidas por completo.';
    end if;
    if p_operation='revert' then
      update public.charges set status='pendente',paid_at=null,payment_method=null,receipt_url=null,
        notes=p_payload->>'notes',transaction_id=null,paid_amount=null where id=charge.id returning * into saved;
      if not found then raise exception using errcode='42501',message='O estorno não foi confirmado.'; end if;
    else
      delete from public.charges where id=charge.id returning * into saved;
      if not found then raise exception using errcode='42501',message='A exclusão não foi confirmada.'; end if;
      saved:=null;
    end if;
  end if;
  if not ipnc_private.financial_charge_request(p_request_id,p_charge_id,p_operation,expected,p_payload) then
    raise exception using errcode='23514',message='A tentativa financeira não foi concluída.';
  end if;
  return jsonb_build_object('request_id',p_request_id,'operation',p_operation,'replayed',false,
    'charge',case when saved.id is null then null else to_jsonb(saved) end);
end $$;
revoke all on function public.financial_charge_operation(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.financial_charge_operation(uuid,uuid,text,jsonb,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
