import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Actual migration, synthetic data, no network. PGlite has one connection: the
// stale competing-attempt tests cover serialization guards, not lock contention.
const db = new PGlite();
after(() => db.close());
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema ipnc_private;
create table auth.users(id uuid primary key);
create table societies(id uuid primary key);
create table profiles(user_id uuid primary key references auth.users,active boolean,role text,society_id uuid);
create table members(id uuid primary key,name text not null,society_id uuid references societies);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function ipnc_private.actor_active() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where user_id=auth.uid() and active) $$;
create function ipnc_private.can_manage_society(wanted uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where user_id=auth.uid() and active and (role='admin' or (role='diretoria' and wanted=society_id))) $$;
create function ipnc_private.can_read_society(wanted uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where user_id=auth.uid() and active and (role in ('admin','pastor') or wanted=society_id)) $$;
revoke all on function ipnc_private.actor_active(),ipnc_private.can_manage_society(uuid),ipnc_private.can_read_society(uuid) from public,anon;
grant execute on function ipnc_private.actor_active(),ipnc_private.can_manage_society(uuid),ipnc_private.can_read_society(uuid) to authenticated;
grant usage on schema auth,public,ipnc_private to authenticated;
grant usage on schema auth,public to anon;
create table transactions(
 id uuid primary key default gen_random_uuid(),category_id uuid,
 type text not null check(type in ('entrada','saida')),amount numeric(12,2) not null,
 description text not null,date date not null default current_date,receipt_url text,
 created_by uuid not null references auth.users,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 origin text default 'manual' check(origin in ('manual','automatic')),
 reference_type text check(reference_type in ('charge','shirt_purchase','shirt_sale','shirt_campaign_purchase','shirt_order_payment')),
 reference_id uuid,member_id uuid references members,society_id uuid references societies);
create table charges(
 id uuid primary key default gen_random_uuid(),member_id uuid not null references members on delete cascade,
 competence text not null,type text not null check(type in ('mensalidade','percapita','annual_contribution')),
 amount numeric not null,due_date date not null,status text not null default 'pendente' check(status in ('pendente','pago','isento','cancelado')),
 paid_at timestamptz,payment_method text,receipt_url text,notes text,transaction_id uuid references transactions on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),paid_amount numeric,society_id uuid references societies,
 unique(member_id,competence,type));
create function update_updated_at_column() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
create trigger update_charges_updated_at before update on charges for each row execute function update_updated_at_column();
alter table charges enable row level security;alter table transactions enable row level security;alter table members enable row level security;
create policy ipnc_manage on charges for all to authenticated using(ipnc_private.can_manage_society(society_id)) with check(ipnc_private.can_manage_society(society_id));
create policy ipnc_read on charges for select to authenticated using(ipnc_private.can_read_society(society_id));
create policy ipnc_manage on transactions for all to authenticated using(ipnc_private.can_manage_society(society_id)) with check(ipnc_private.can_manage_society(society_id));
create policy ipnc_read on transactions for select to authenticated using(ipnc_private.can_read_society(society_id));
create policy ipnc_read on members for select to authenticated using(ipnc_private.can_read_society(society_id));
grant select,insert,update,delete on charges,transactions to authenticated;grant select on members to authenticated;
`);
const originalPolicies = (await db.query("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where tablename in ('charges','transactions','members') order by tablename,policyname")).rows;
const migrations = new URL('../supabase/migrations/', import.meta.url);
const filename = readdirSync(migrations).find(name => name.endsWith('_financial_charge_atomic_operations.sql'));
assert.ok(filename, 'migration must exist');
await db.exec(readFileSync(new URL(filename, migrations), 'utf8'));
const ids = Object.fromEntries(['admin','directory','outsider','viewer','inactive','society','other'].map(key => [key,crypto.randomUUID()]));
await db.query('insert into societies values($1),($2)', [ids.society,ids.other]);
await db.query('insert into auth.users select unnest($1::uuid[])', [[ids.admin,ids.directory,ids.outsider,ids.viewer,ids.inactive]]);
await db.query(`insert into profiles values($1,true,'admin',$6),($2,true,'diretoria',$6),($3,true,'diretoria',$7),($4,true,'pastor',null),($5,false,'admin',$6)`, [ids.admin,ids.directory,ids.outsider,ids.viewer,ids.inactive,ids.society,ids.other]);
const as = async (actor, fn) => {
  await db.exec(`begin;set local role ${actor ? 'authenticated' : 'anon'};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [actor || '']);
  try { const result=await fn();await db.exec('commit');return result; }
  catch (error) { await db.exec('rollback');throw error; }
};
const fixture = async (extra={}) => {
  const member=crypto.randomUUID(),charge=crypto.randomUUID();
  const scope=Object.hasOwn(extra,'society_id') ? extra.society_id : ids.society;
  await db.query("insert into members values($1,'Synthetic member',$2)", [member,extra.member_society || scope || ids.society]);
  await db.query(`insert into charges(id,member_id,competence,type,amount,due_date,status,paid_amount,receipt_url,notes,society_id)
    values($1,$2,'2026',$3,$4,'2026-12-31',$5,$6,$7,$8,$9)`,
    [charge,member,extra.type || 'annual_contribution',extra.amount ?? 100,extra.status || 'pendente',extra.paid_amount ?? null,extra.receipt_url ?? null,extra.notes ?? null,scope]);
  return charge;
};
const snapshot = async charge => (await db.query(`select jsonb_build_object('paid_amount',coalesce(paid_amount,0),'transaction_id',transaction_id,
  'status',status,'amount',amount,'member_id',member_id,'society_id',society_id,'updated_at',updated_at) data from charges where id=$1`, [charge])).rows[0]?.data;
const payload = (amount=25,extra={}) => ({amount,paid_at:'2026-10-10T12:00:00.000Z',payment_method:'pix',receipt_url:null,notes:'Synthetic payment',...extra});
const operate = (actor,charge,operation,expected,data={},request=crypto.randomUUID()) => as(actor,()=>db.query('select financial_charge_operation($1,$2,$3,$4::jsonb,$5::jsonb) data', [request,charge,operation,JSON.stringify(expected),JSON.stringify(data)])).then(r=>r.rows[0].data);
const state = async charge => (await db.query(`select (select to_jsonb(c) from charges c where id=$1) charge,
  (select count(*)::int from transactions where reference_type='charge' and reference_id=$1) transactions,
  (select count(*)::int from ipnc_private.financial_charge_requests where charge_id=$1) requests`,[charge])).rows[0];
const rejected = (work,code) => assert.rejects(work,error=>error.code===code);

test('migration keeps legacy RLS, RPC is invoker, and private table/trigger execution is denied', async () => {
  assert.deepEqual((await db.query("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where tablename in ('charges','transactions','members') order by tablename,policyname")).rows,originalPolicies);
  const catalog=(await db.query(`select prosecdef,proconfig,has_function_privilege('anon',oid,'execute') anon,
    has_function_privilege('authenticated',oid,'execute') authenticated from pg_proc where oid='public.financial_charge_operation(uuid,uuid,text,jsonb,jsonb)'::regprocedure`)).rows[0];
  assert.deepEqual(catalog,{prosecdef:false,proconfig:['search_path=""'],anon:false,authenticated:true});
  await rejected(()=>as(null,()=>db.query("select financial_charge_operation(gen_random_uuid(),gen_random_uuid(),'delete','{}','{}')")),'42501');
  for (const sql of ['select * from ipnc_private.financial_charge_requests',"select ipnc_private.financial_charge_finish()","select ipnc_private.financial_charge_request_complete()"])
    await rejected(()=>as(ids.admin,()=>db.query(sql)),'42501');
});

test('partial/full payment saves one linked entry per attempt and preserves the legacy receipt', async () => {
  const charge=await fixture({receipt_url:'https://legacy.example/receipt.pdf'}),first=crypto.randomUUID();
  const expected=await snapshot(charge),data=payload();
  const partial=await operate(ids.directory,charge,'payment',expected,data,first);
  assert.equal(partial.replayed,false);assert.equal(partial.charge.paid_amount,25);assert.equal(partial.charge.status,'pago');
  assert.equal(partial.charge.receipt_url,'https://legacy.example/receipt.pdf');assert.equal(partial.charge.transaction_id,first);
  const row=(await db.query('select * from transactions where id=$1',[first])).rows[0];
  assert.equal(row.amount,'25.00');assert.equal(row.origin,'automatic');assert.equal(row.created_by,ids.directory);assert.equal(row.society_id,ids.society);
  assert.equal(row.description,'Contribuição anual - Synthetic member - 2026');
  const replay=await operate(ids.directory,charge,'payment',expected,data,first);
  assert.equal(replay.replayed,true);assert.equal((await state(charge)).transactions,1);
  const full=await operate(ids.directory,charge,'payment',await snapshot(charge),payload(75));
  assert.equal(full.charge.paid_amount,100);assert.equal((await state(charge)).transactions,2);
  await rejected(async()=>operate(ids.directory,charge,'payment',await snapshot(charge),payload(0.01)),'22023');
});

test('failed second write rolls back payment, request and charge; same UUID retries exactly once', async () => {
  const charge=await fixture(),request=crypto.randomUUID(),expected=await snapshot(charge),data=payload();
  await db.exec(`create function fixture_fail_update() returns trigger language plpgsql as $$ begin raise exception using errcode='42501',message='Synthetic denied update';end $$;
    create trigger fixture_fail_update before update on charges for each row execute function fixture_fail_update();`);
  try { await rejected(async()=>operate(ids.admin,charge,'payment',expected,data,request),'42501');assert.deepEqual(await state(charge),{charge:(await state(charge)).charge,transactions:0,requests:0});assert.equal((await state(charge)).charge.status,'pendente'); }
  finally {await db.exec('drop trigger fixture_fail_update on charges;drop function fixture_fail_update()');}
  await operate(ids.admin,charge,'payment',expected,data,request);
  await operate(ids.admin,charge,'payment',expected,data,request);
  assert.equal((await state(charge)).transactions,1);assert.equal((await state(charge)).requests,1);
});

test('request UUID cannot change payload/charge/operation/actor and stale updated_at cannot pay again', async () => {
  const charge=await fixture(),request=crypto.randomUUID(),expected=await snapshot(charge),data=payload();
  await operate(ids.admin,charge,'payment',expected,data,request);
  await rejected(async()=>operate(ids.admin,charge,'payment',expected,payload(26),request),'40001');
  await rejected(async()=>operate(ids.admin,charge,'delete',expected,{},request),'40001');
  await rejected(async()=>operate(ids.admin,await fixture(),'payment',expected,data,request),'40001');
  await rejected(async()=>operate(ids.directory,charge,'payment',expected,data,request),'42501');
  await rejected(async()=>operate(ids.admin,charge,'payment',expected,data),'40001');
  const current=await snapshot(charge);
  await db.query("update charges set notes='Synthetic competing edit' where id=$1",[charge]);
  await rejected(async()=>operate(ids.admin,charge,'payment',current,data),'40001');
  assert.equal((await state(charge)).transactions,1);
});

test('revert deletes every linked partial entry; old payment replay never repays it', async () => {
  const charge=await fixture(),request=crypto.randomUUID(),expected=await snapshot(charge),data=payload();
  await operate(ids.directory,charge,'payment',expected,data,request);
  await operate(ids.directory,charge,'payment',await snapshot(charge),payload(10));
  const revertId=crypto.randomUUID(),revertSnapshot=await snapshot(charge),revertPayload={notes:'Synthetic restored note'};
  const result=await operate(ids.directory,charge,'revert',revertSnapshot,revertPayload,revertId);
  assert.equal(result.charge.status,'pendente');assert.equal(result.charge.paid_amount,null);assert.equal(result.charge.transaction_id,null);
  assert.equal(result.charge.notes,revertPayload.notes);assert.equal((await state(charge)).transactions,0);
  assert.equal((await operate(ids.directory,charge,'revert',revertSnapshot,revertPayload,revertId)).replayed,true);
  const replay=await operate(ids.directory,charge,'payment',expected,data,request);
  assert.equal(replay.replayed,true);assert.equal(replay.charge.status,'pendente');assert.equal((await state(charge)).transactions,0);
});

test('delete and payment tombstones survive charge deletion; new requests cannot resurrect it', async () => {
  const charge=await fixture(),payId=crypto.randomUUID(),expected=await snapshot(charge),data=payload();
  await operate(ids.admin,charge,'payment',expected,data,payId);
  const deleteId=crypto.randomUUID(),current=await snapshot(charge);
  assert.equal((await operate(ids.admin,charge,'delete',current,{},deleteId)).charge,null);
  assert.equal((await state(charge)).transactions,0);assert.equal((await state(charge)).requests,2);
  assert.equal((await operate(ids.admin,charge,'delete',current,{},deleteId)).replayed,true);
  assert.equal((await operate(ids.admin,charge,'payment',expected,data,payId)).charge,null);
  await rejected(async()=>operate(ids.admin,charge,'payment',expected,data),'42501');
});

test('denied final revert/delete rolls back linked deletions and tombstones', async () => {
  for (const operation of ['revert','delete']) {
    const charge=await fixture();await operate(ids.admin,charge,'payment',await snapshot(charge),payload());
    const expected=await snapshot(charge),before=await state(charge);
    await db.exec(`create function fixture_fail_final() returns trigger language plpgsql as $$ begin raise exception using errcode='42501',message='Synthetic denied final write';end $$;
      create trigger fixture_fail_final before ${operation==='delete'?'delete':'update'} on charges for each row execute function fixture_fail_final();`);
    try { await rejected(async()=>operate(ids.admin,charge,operation,expected,operation==='delete'?{}:{notes:null}),'42501');assert.deepEqual(await state(charge),before); }
    finally {await db.exec('drop trigger fixture_fail_final on charges;drop function fixture_fail_final()');}
  }
});

test('RLS silently denied transaction deletion fails the RPC and preserves the charge', async () => {
  const charge=await fixture();await operate(ids.admin,charge,'payment',await snapshot(charge),payload());
  const expected=await snapshot(charge),before=await state(charge);
  await db.exec('create policy fixture_no_delete on transactions as restrictive for delete to authenticated using(false)');
  try {await rejected(async()=>operate(ids.admin,charge,'revert',expected,{notes:null}),'42501');assert.deepEqual(await state(charge),before);}
  finally {await db.exec('drop policy fixture_no_delete on transactions');}
});

test('invisible or foreign linked entries and member/society mismatch cannot be removed', async () => {
  const charge=await fixture();await operate(ids.admin,charge,'payment',await snapshot(charge),payload());
  await db.query(`insert into transactions(description,type,amount,created_by,reference_type,reference_id,society_id) values('Synthetic foreign link','entrada',5,$1,'charge',$2,$3)`,[ids.admin,charge,ids.other]);
  const before=await state(charge);
  await rejected(async()=>operate(ids.directory,charge,'delete',await snapshot(charge),{}),'42501');assert.deepEqual(await state(charge),before);
  const mismatch=await fixture({member_society:ids.other});
  await rejected(async()=>operate(ids.admin,mismatch,'payment',await snapshot(mismatch),payload()),'42501');assert.equal((await state(mismatch)).transactions,0);
  const hidden=await fixture();await operate(ids.admin,hidden,'payment',await snapshot(hidden),payload());
  await db.exec('create policy fixture_hidden on transactions as restrictive for select to authenticated using(false)');
  try {await rejected(async()=>operate(ids.directory,hidden,'revert',await snapshot(hidden),{notes:null}),'42501');assert.equal((await state(hidden)).transactions,1);}
  finally {await db.exec('drop policy fixture_hidden on transactions');}
});

test('permission loss, inactive actors and foreign society deny new operations and exact replays', async () => {
  const charge=await fixture(),request=crypto.randomUUID(),expected=await snapshot(charge),data=payload();
  for (const actor of [ids.outsider,ids.viewer,ids.inactive]) await rejected(async()=>operate(actor,charge,'payment',expected,data),'42501');
  await operate(ids.directory,charge,'payment',expected,data,request);
  await db.query('update profiles set active=false where user_id=$1',[ids.directory]);
  try {await rejected(async()=>operate(ids.directory,charge,'payment',expected,data,request),'42501');}
  finally {await db.query('update profiles set active=true where user_id=$1',[ids.directory]);}
  await db.query('update charges set society_id=$1 where id=$2',[ids.other,charge]);
  await rejected(async()=>operate(ids.directory,charge,'payment',expected,data,request),'42501');
});

test('amount, payment types, dates, exempt charge and receipt scope reject without writes', async () => {
  const charge=await fixture(),expected=await snapshot(charge);
  for (const invalid of [payload(0),payload(-1),payload(0.001),payload(101),payload(1,{payment_method:null}),payload(1,{payment_method:{}}),
    payload(1,{notes:{}}),payload(1,{receipt_url:{}}),payload(1,{paid_at:'infinity'}),payload(1,{receipt_url:`storage://receipts/${ids.other}/2026/a.pdf`}),
    payload(1,{receipt_url:`storage://receipts/${ids.society}/../a.pdf`}),payload(1,{receipt_url:`storage://receipts/${ids.society}/a?download=1`})])
    await rejected(async()=>operate(ids.admin,charge,'payment',expected,invalid),'22023');
  assert.equal((await state(charge)).transactions,0);assert.equal((await state(charge)).requests,0);
  for (const status of ['isento','cancelado']) {
    const blocked=await fixture({status});await rejected(async()=>operate(ids.admin,blocked,'payment',await snapshot(blocked),payload()),'22023');
  }
  const monthly=await fixture({type:'mensalidade'});await rejected(async()=>operate(ids.admin,monthly,'payment',await snapshot(monthly),payload()),'22023');
  await rejected(async()=>operate(ids.admin,charge,'revert',expected,{notes:{}}),'22023');
});

test('legacy null-society charges remain admin only and new scoped receipts remain canonical', async () => {
  const charge=await fixture({society_id:null}),expected=await snapshot(charge);
  await rejected(async()=>operate(ids.directory,charge,'payment',expected,payload()),'42501');
  assert.equal((await operate(ids.admin,charge,'payment',expected,payload())).charge.society_id,null);
  const scoped=await fixture(),receipt=`storage://receipts/${ids.society}/2026/cobrancas/${crypto.randomUUID()}.pdf`;
  const result=await operate(ids.directory,scoped,'payment',await snapshot(scoped),payload(10,{receipt_url:receipt}));
  assert.equal(result.charge.receipt_url,receipt);
});

test('direct metadata helper cannot forge completed payment/revert/delete or commit unfinished intent', async () => {
  for (const operation of ['payment','revert','delete']) {
    const charge=await fixture(),expected=await snapshot(charge),data=operation==='payment'?payload():operation==='revert'?{notes:null}:{};
    await rejected(()=>as(ids.admin,()=>db.query('select ipnc_private.financial_charge_request($1,$2,$3,$4::jsonb,$5::jsonb,true)',
      [crypto.randomUUID(),charge,operation,JSON.stringify(expected),JSON.stringify(data)])),'23514');
    assert.equal((await state(charge)).requests,0);assert.equal((await state(charge)).transactions,0);
    await rejected(()=>as(ids.directory,()=>db.query('select ipnc_private.financial_charge_request($1,$2,$3,$4::jsonb,$5::jsonb,true)',
      [crypto.randomUUID(),charge,operation,JSON.stringify({...expected,paid_amount:1}),JSON.stringify(data)])),'40001');
  }
  const columns=(await db.query("select column_name from information_schema.columns where table_schema='ipnc_private' and table_name='financial_charge_requests' order by column_name")).rows.map(r=>r.column_name);
  assert.deepEqual(columns,['actor_id','charge_id','completed_at','context_txid','expected_hash','operation','request_hash','request_id','result_hash','society_id']);
  assert.equal((await db.query('select count(*)::int count from ipnc_private.financial_charge_requests where completed_at is null or context_txid is not null')).rows[0].count,0);
});

test('request payload and actual financial result must agree before confirmation is persisted', async () => {
  const charge=await fixture(),request=crypto.randomUUID(),expected=await snapshot(charge),data=payload(25);
  await rejected(()=>as(ids.admin,async()=>{
    await db.query('select ipnc_private.financial_charge_request($1,$2,$3,$4::jsonb,$5::jsonb,true)',[request,charge,'payment',JSON.stringify(expected),JSON.stringify(data)]);
    await db.query(`insert into transactions(id,description,type,amount,date,created_by,origin,reference_type,reference_id,member_id,society_id)
      values($1,'Synthetic mismatched financial result','entrada',5,'2026-10-10',$2,'automatic','charge',$3,$4,$5)`,[request,ids.admin,charge,expected.member_id,ids.society]);
    await db.query("update charges set paid_amount=5,status='pago',paid_at=$1,payment_method='pix',transaction_id=$2,notes=$3 where id=$4",[data.paid_at,request,data.notes,charge]);
  }),'23514');
  assert.equal((await state(charge)).requests,0);assert.equal((await state(charge)).transactions,0);assert.equal((await state(charge)).charge.status,'pendente');
  await rejected(()=>as(ids.admin,async()=>{
    await db.query('select ipnc_private.financial_charge_request($1,$2,$3,$4::jsonb,$5::jsonb,true)',[request,charge,'payment',JSON.stringify(expected),JSON.stringify(data)]);
    await db.query('update charges set notes=notes where id=$1',[charge]);
  }),'23514');
  const result=await operate(ids.admin,charge,'payment',expected,data,request);
  assert.equal(result.replayed,false);assert.equal(result.charge.paid_amount,25);
});

test('an intermediate balance edit or an entry different from the requested delta rolls back', async () => {
  const charge=await fixture(),request=crypto.randomUUID(),expected=await snapshot(charge),data=payload(25);
  for (const stage of ['intermediate','wrong_delta']) {
    await rejected(()=>as(ids.admin,async()=>{
      await db.query('select ipnc_private.financial_charge_request($1,$2,$3,$4::jsonb,$5::jsonb,true)',[request,charge,'payment',JSON.stringify(expected),JSON.stringify(data)]);
      await db.query(`insert into transactions(id,description,type,amount,date,created_by,origin,reference_type,reference_id,member_id,society_id)
        values($1,'Synthetic inconsistent staging','entrada',5,'2026-10-10',$2,'automatic','charge',$3,$4,$5)`,[request,ids.admin,charge,expected.member_id,ids.society]);
      if (stage==='intermediate') await db.query('update charges set paid_amount=20 where id=$1',[charge]);
      await db.query("update charges set paid_amount=25,status='pago',paid_at=$1,payment_method='pix',transaction_id=$2,notes=$3 where id=$4",[data.paid_at,request,data.notes,charge]);
    }),'23514');
    assert.equal((await state(charge)).transactions,0);assert.equal((await state(charge)).requests,0);assert.equal((await state(charge)).charge.paid_amount,null);
  }
});

test('numeric scales in legacy amount/paid_amount normalize before snapshot/result hashing and FK revert', async () => {
  const charge=await fixture({amount:'100.00',paid_amount:'25.00',status:'pago'}),request=crypto.randomUUID(),expected=await snapshot(charge),data=payload(25);
  const result=await operate(ids.admin,charge,'payment',expected,data,request);
  assert.equal(result.charge.paid_amount,50);
  assert.equal((await operate(ids.admin,charge,'payment',expected,data,request)).replayed,true);
  const reverted=await operate(ids.admin,charge,'revert',await snapshot(charge),{notes:null});
  assert.equal(reverted.charge.status,'pendente');assert.equal(reverted.charge.paid_amount,null);assert.equal((await state(charge)).transactions,0);
});

test('decimal installments reaching an integer and literal JSONB scaled amounts normalize the complete sum', async () => {
  const charge=await fixture();
  assert.equal((await operate(ids.admin,charge,'payment',await snapshot(charge),payload(50.25))).charge.paid_amount,50.25);
  const request=crypto.randomUUID(),expected=await snapshot(charge),data=payload(49.75);
  const full=await operate(ids.admin,charge,'payment',expected,data,request);
  assert.equal(full.charge.paid_amount,100);assert.equal((await state(charge)).transactions,2);
  assert.equal((await operate(ids.admin,charge,'payment',expected,data,request)).replayed,true);
  const reverted=await operate(ids.admin,charge,'revert',await snapshot(charge),{notes:null});
  assert.equal(reverted.charge.paid_amount,null);assert.equal((await state(charge)).transactions,0);

  const scaled=await fixture(),scaledId=crypto.randomUUID(),scaledSnapshot=await snapshot(scaled);
  const literal=JSON.stringify(payload(25)).replace('"amount":25,','"amount":25.00,');
  assert.match(literal,/"amount":25\.00,/);
  const callLiteral=()=>as(ids.admin,()=>db.query('select financial_charge_operation($1,$2,$3,$4::jsonb,$5::jsonb) data',
    [scaledId,scaled,'payment',JSON.stringify(scaledSnapshot),literal])).then(result=>result.rows[0].data);
  assert.equal((await callLiteral()).charge.paid_amount,25);
  assert.equal((await callLiteral()).replayed,true);
  assert.equal((await state(scaled)).transactions,1);
  assert.equal((await operate(ids.admin,scaled,'revert',await snapshot(scaled),{notes:null})).charge.paid_amount,null);
  assert.equal((await state(scaled)).transactions,0);
});
