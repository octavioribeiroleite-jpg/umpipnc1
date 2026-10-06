import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createSocietyReceipt } from '../src/lib/treasury-receipt.ts';
import { reportTotals } from '../src/lib/treasury-report.ts';

const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage; create schema ipnc_private; create schema extensions;
-- PGlite lacks pgcrypto. These isolated stand-ins exercise authorization and
-- rotation, not cryptographic strength. Production pgcrypto is checked separately.
create function extensions.digest(value text,algorithm text) returns bytea language sql as $$ select sha256(convert_to(value,'UTF8')) $$;
create function extensions.gen_salt(algorithm text,cost integer) returns text language sql as $$ select gen_random_uuid()::text $$;
create function extensions.crypt(value text,salt text) returns text language sql as $$ select split_part(salt,':',1)||':'||encode(sha256(convert_to(value||split_part(salt,':',1),'UTF8')),'hex') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function ipnc_private.portal_valid(wanted text) returns boolean language sql as $$ select false $$;
create table auth.users(id uuid primary key);
create table public.profiles(user_id uuid primary key references auth.users,full_name text,username text,active boolean);
create type public.app_role as enum('admin','diretoria','visualizador','pastor');
create table public.user_roles(user_id uuid,role public.app_role);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function ipnc_private.actor_active() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where user_id=auth.uid() and active) $$;
create function ipnc_private.actor_has_role(wanted public.app_role) returns boolean language sql stable security definer set search_path='' as $$ select ipnc_private.actor_active() and exists(select 1 from public.user_roles where user_id=auth.uid() and role=wanted) $$;
revoke all on function ipnc_private.actor_active(), ipnc_private.actor_has_role(public.app_role) from public, anon;
grant execute on function ipnc_private.actor_active(), ipnc_private.actor_has_role(public.app_role) to authenticated;
grant usage on schema public,auth,ipnc_private,storage to anon,authenticated;
revoke usage on schema ipnc_private from anon;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant select,insert on storage.objects to authenticated;
grant select on public.profiles to authenticated;
`);
await db.exec(readFileSync(new URL('../supabase/migrations/20260928151725_public_treasury.sql', import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/20261005140755_treasury_approval_reconciliation.sql', import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/20261005140907_treasury_public_read_policy.sql', import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/20261005142735_treasury_society_pin_access.sql', import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/20261005143113_treasury_directory_binding.sql', import.meta.url),'utf8'));
const guardMetadata = () => db.query("select oid,proowner,proacl::text,prosecdef,proconfig from pg_proc where oid='ipnc_private.treasury_entry_guard()'::regprocedure");
const originalGuardMetadata = (await guardMetadata()).rows;
const timelineMigration = readFileSync(new URL('../supabase/migrations/20261006162227_treasury_reserve_timeline.sql', import.meta.url),'utf8');
await db.exec(timelineMigration);
const ids = Object.fromEntries(['admin','treasurer','outsider','inactive','fund','other','bank','income','expense','pending'].map(k=>[k,crypto.randomUUID()]));
await db.query(`insert into auth.users select unnest($1::uuid[])`,[[ids.admin,ids.treasurer,ids.outsider,ids.inactive]]);
await db.query(`insert into profiles select id,'Test','test',id<>$1 from auth.users`,[ids.inactive]);
await db.query(`insert into user_roles values($1,'admin'),($2,'admin'),($3,'diretoria'),($4,'visualizador')`,[ids.admin,ids.inactive,ids.treasurer,ids.outsider]);
await db.query(`insert into treasury_funds(id,name,abbreviation) values($1,'Test fund','T1'),($2,'Other','T2')`,[ids.fund,ids.other]);
await db.query(`insert into treasury_managers values($1,$2),($3,$2)`,[ids.treasurer,ids.fund,ids.inactive]);
const as = async (who,fn,claims={}) => { await db.exec(`begin; set local role ${who?'authenticated':'anon'};`); await db.query(`select set_config('request.jwt.claim.sub',$1,true)`,[who||'']); await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]); try { const result=await fn(); await db.exec('commit'); return result; } catch(error) {await db.exec('rollback');throw error;} };
const insert = (id,fund,amount=10000,extra={}) => db.query(`insert into treasury_entries(id,fund_id,kind,amount_cents,occurred_on,person_name,description,status,payment_method,shirt_cents,monthly_fee_cents,per_capita_cents,bank_transaction_id,review_note) values($1,$2,$3,$4,'2025-02-10','Fixture only','Fixture only',$5,$6,$7,$8,$9,$10,$11) returning *`,[id,fund,extra.kind||'income',amount,extra.status||'pending',extra.payment_method||'pix',extra.shirt_cents||0,extra.monthly_fee_cents||0,extra.per_capita_cents||0,extra.bank_id||null,extra.note||'']);
const denied = fn => assert.rejects(fn,e=>e.code==='42501');

test('treasurer submits only own pending income; public cannot see pending, forge status or write', async()=>{
 await denied(()=>as(null,()=>db.query("select ipnc_private.actor_has_role('admin')")));
 await as(ids.treasurer,()=>insert(ids.income,ids.fund,10000,{shirt_cents:6000,monthly_fee_cents:3000,per_capita_cents:1000}));
 const forbiddenUpdate = await as(ids.treasurer,()=>db.query("update treasury_entries set status='confirmed',revision=2 where id=$1 returning id",[ids.income]));
 assert.equal(forbiddenUpdate.rows.length,0);
 await denied(()=>as(ids.treasurer,()=>db.query('insert into treasury_managers values($1,$2)',[ids.treasurer,ids.other])));
 await denied(()=>as(ids.treasurer,()=>insert(crypto.randomUUID(),ids.other)));
 await denied(()=>as(ids.treasurer,()=>insert(crypto.randomUUID(),ids.fund,10,{kind:'expense'})));
 await denied(()=>as(ids.treasurer,()=>insert(crypto.randomUUID(),ids.fund,10,{status:'confirmed'})));
 await denied(()=>as(ids.outsider,()=>insert(crypto.randomUUID(),ids.fund)));
 await denied(()=>as(ids.inactive,()=>insert(crypto.randomUUID(),ids.fund)));
 await denied(()=>as(null,()=>insert(crypto.randomUUID(),ids.fund)));
 await denied(()=>as(null,()=>db.query('select * from treasury_entries')));
 await denied(()=>as(null,()=>db.query('select treasury_dashboard()')));
 await denied(()=>as(null,()=>db.query('select treasury_statement()')));
 const directory=(await as(null,()=>db.query('select treasury_directory() data'))).rows[0].data;
 assert.ok(directory.length); assert.deepEqual(Object.keys(directory[0]).sort(),['abbreviation','color','id','name']);
 assert.equal((await as(ids.outsider,()=>db.query('select * from treasury_entries'))).rows.length,0);
 assert.equal((await as(ids.treasurer,()=>db.query('select * from treasury_entries'))).rows.length,1);
 const data=(await as(ids.admin,()=>db.query('select treasury_dashboard() data'))).rows[0].data;
 assert.equal(data.totals.balance_cents,0);
});
test('admin confirms once against a single bank credit and protects split/reserve accounting',async()=>{
 await as(ids.admin,()=>db.query(`insert into treasury_bank_transactions(id,reference,occurred_on,kind,amount_cents) values($1,'PIX-UNIQUE-001','2025-02-10','income',10000)`,[ids.bank]));
 await as(ids.admin,()=>db.query(`update treasury_entries set status='confirmed',bank_transaction_id=$1,revision=2 where id=$2 and revision=1`,[ids.bank,ids.income]));
 await assert.rejects(()=>as(ids.admin,()=>insert(crypto.randomUUID(),ids.fund,10000,{status:'confirmed',bank_id:ids.bank})),e=>e.code==='23514');
 await assert.rejects(()=>as(ids.admin,()=>db.query(`insert into treasury_bank_transactions(reference,occurred_on,kind,amount_cents) values(' pix-unique-001 ','2025-02-10','income',10000)`)),e=>e.code==='23505');
 await assert.rejects(()=>as(ids.admin,()=>insert(crypto.randomUUID(),ids.fund,50,{shirt_cents:40,monthly_fee_cents:40})),e=>e.code==='23514');
 await as(ids.admin,()=>insert(ids.expense,ids.fund,3000,{kind:'expense',status:'confirmed',payment_method:'cash',note:'Conferido no caixa',per_capita_cents:400}));
 await assert.rejects(()=>as(ids.admin,()=>insert(crypto.randomUUID(),ids.fund,1000,{kind:'expense',status:'confirmed',payment_method:'cash',note:'Conferido no caixa',per_capita_cents:700})),e=>e.code==='23514');
 const dashboard=(await as(ids.admin,()=>db.query('select treasury_dashboard() data'))).rows[0].data;
 assert.equal(dashboard.totals.balance_cents,7000); assert.equal(dashboard.totals.reserved_cents,600); assert.equal(dashboard.totals.available_cents,6400);
 const statement=(await as(ids.treasurer,()=>db.query('select treasury_statement($1) data',[ids.fund]))).rows[0].data;
 assert.equal(statement.entries[0].balance_after_cents,7000); assert.equal(statement.income_cents-statement.expense_cents,7000);
 assert.equal((await as(ids.admin,()=>db.query('select * from treasury_entry_audit'))).rows.length,3);
});
test('pending/rejected are separate, other-society reports and private attachments are protected',async()=>{
 await as(ids.treasurer,()=>insert(ids.pending,ids.fund,50));
 await as(ids.admin,()=>db.query(`update treasury_entries set status='rejected',review_note='Recebimento duplicado',revision=2 where id=$1`,[ids.pending]));
 const own=(await as(ids.treasurer,()=>db.query('select treasury_review_queue($1) data',[ids.fund]))).rows[0].data;
 assert.equal(own.entries[0].status,'rejected');
 await denied(()=>as(ids.outsider,()=>db.query('select treasury_report(2025,$1)',[ids.fund])));
 await denied(()=>as(ids.treasurer,()=>db.query('select treasury_report(2025,$1)',[ids.other])));
 await denied(()=>as(ids.treasurer,()=>db.query('select treasury_report(2025)')));
 await denied(()=>as(null,()=>db.query('select treasury_report(2025,$1)',[ids.fund])));
 const ownReport=(await as(ids.treasurer,()=>db.query('select treasury_report(2025,$1) data',[ids.fund]))).rows[0].data;
 assert.equal(ownReport.entries.length,2);
 const path=`${ids.income}/${crypto.randomUUID()}.pdf`;
 await as(ids.admin,()=>db.query(`insert into storage.objects(bucket_id,name) values('treasury-receipts',$1)`,[path]));
 const attachment=(await as(ids.admin,()=>db.query(`insert into treasury_attachments(entry_id,path,filename,mime_type) values($1,$2,'fixture.pdf','application/pdf') returning id`,[ids.income,path]))).rows[0];
 assert.equal((await as(ids.treasurer,()=>db.query('select * from treasury_attachments'))).rows.length,1);
 assert.equal((await as(ids.outsider,()=>db.query('select * from treasury_attachments'))).rows.length,0);
 assert.equal((await as(ids.outsider,()=>db.query('select * from storage.objects'))).rows.length,0);
 await denied(()=>as(ids.treasurer,()=>db.query(`insert into storage.objects(bucket_id,name) values('treasury-receipts','bad.pdf')`)));
 await denied(()=>as(null,()=>db.query('select * from treasury_attachments')));
 const managerArchive=await as(ids.treasurer,()=>db.query('update treasury_attachments set active=false where id=$1 returning id',[attachment.id]));
 assert.equal(managerArchive.rows.length,0);
 await as(ids.admin,()=>db.query('update treasury_attachments set active=false where id=$1',[attachment.id]));
 assert.equal((await as(ids.treasurer,()=>db.query('select * from treasury_attachments'))).rows.length,0);
 assert.equal((await as(ids.treasurer,()=>db.query('select * from storage.objects'))).rows.length,0);
 const archivedReport=(await as(ids.admin,()=>db.query('select treasury_report(2025,$1) data',[ids.fund]))).rows[0].data;
 assert.equal(archivedReport.attachments.length,0);
 assert.equal((await as(ids.admin,()=>db.query('select * from storage.objects'))).rows.length,1);
 await as(ids.admin,()=>db.query('update treasury_attachments set active=true where id=$1',[attachment.id]));
 const restoredReport=(await as(ids.treasurer,()=>db.query('select treasury_report(2025,$1) data',[ids.fund]))).rows[0].data;
 assert.equal(restoredReport.attachments.length,1);
 assert.equal((await as(ids.treasurer,()=>db.query('select * from storage.objects'))).rows.length,1);
 const audit=await as(ids.admin,()=>db.query("select new_record->'attachment'->>'active' active from treasury_entry_audit where new_record ? 'attachment' order by id"));
 assert.deepEqual(audit.rows.map(row=>row.active),['true','false','true']);
});
test('bank corrections keep audit and revision checks and cannot invalidate confirmed allocations',async()=>{
 await assert.rejects(()=>as(ids.admin,()=>db.query('update treasury_bank_transactions set amount_cents=9999,revision=2 where id=$1',[ids.bank])),e=>e.code==='23514');
 await assert.rejects(()=>as(ids.admin,()=>db.query("update treasury_bank_transactions set reference='OTHER-REF',revision=2 where id=$1",[ids.bank])),e=>e.code==='23514');
 await assert.rejects(()=>as(ids.admin,()=>db.query("update treasury_bank_transactions set kind='expense',revision=2 where id=$1",[ids.bank])),e=>e.code==='23514');
 await assert.rejects(()=>as(ids.admin,()=>db.query('update treasury_bank_transactions set amount_cents=12000 where id=$1',[ids.bank])),e=>e.code==='40001');
 assert.equal((await as(ids.treasurer,()=>db.query('update treasury_bank_transactions set amount_cents=12000,revision=2 where id=$1 returning id',[ids.bank]))).rows.length,0);
 await as(ids.admin,()=>db.query('update treasury_bank_transactions set amount_cents=12000,revision=2 where id=$1 and revision=1',[ids.bank]));
 const stale=await as(ids.admin,()=>db.query('update treasury_bank_transactions set amount_cents=13000,revision=2 where id=$1 and revision=1 returning id',[ids.bank]));
 assert.equal(stale.rows.length,0);
 const reconciliation=(await as(ids.admin,()=>db.query('select treasury_bank_reconciliation() data'))).rows[0].data.find(row=>row.id===ids.bank);
 assert.equal(reconciliation.remaining_cents,2000);
 const audit=await as(ids.admin,()=>db.query('select * from treasury_bank_audit where bank_id=$1 order by id',[ids.bank]));
 assert.equal(audit.rows.length,2);assert.equal(audit.rows[1].old_record.amount_cents,10000);assert.equal(audit.rows[1].new_record.amount_cents,12000);
 await denied(()=>as(ids.admin,()=>db.query('delete from treasury_bank_transactions where id=$1',[ids.bank])));
 assert.equal((await as(ids.outsider,()=>db.query('select * from treasury_bank_audit'))).rows.length,0);
 const unlinked=crypto.randomUUID();
 await as(ids.admin,()=>db.query("insert into treasury_bank_transactions(id,reference,occurred_on,kind,amount_cents) values($1,'WRONG-REFERENCE','2025-02-10','income',100)",[unlinked]));
 await as(ids.admin,()=>db.query("update treasury_bank_transactions set reference=' Correct Ref ',kind='expense',amount_cents=200,revision=2 where id=$1",[unlinked]));
 assert.equal((await as(ids.admin,()=>db.query('select reference from treasury_bank_transactions where id=$1',[unlinked]))).rows[0].reference,'CORRECTREF');
});
test('1005 confirmed entries, backdated carry-forward, filters and stale edits remain exact',async()=>{
 await as(ids.admin,()=>db.query(`insert into treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description,status,payment_method,review_note) select $1,'income',1,'2024-01-01','Test','Bulk test','confirmed','cash','Conferido em teste' from generate_series(1,1005)`,[ids.fund]));
 const report=(await as(ids.treasurer,()=>db.query('select treasury_report(2025,$1) data',[ids.fund]))).rows[0].data;
 assert.equal(report.opening_cents,1005); assert.equal(report.entries.at(-1).balance_after_cents,8005);
 const data=(await as(ids.treasurer,()=>db.query(`select treasury_statement($1,'expense',null,'2025-01-01','2025-12-31',0,20) data`,[ids.fund]))).rows[0].data;
 assert.equal(data.entries[0].balance_after_cents,8005);
 const stale=await as(ids.admin,()=>db.query('update treasury_entries set amount_cents=20000,revision=2 where id=$1 and revision=1 returning id',[ids.income]));
 assert.equal(stale.rows.length,0);
 await denied(()=>as(ids.admin,()=>db.query('delete from treasury_entries where id=$1',[ids.income])));
 await as(ids.admin,()=>db.query('delete from treasury_managers where user_id=$1',[ids.treasurer]));
 await denied(()=>as(ids.treasurer,()=>insert(crypto.randomUUID(),ids.fund)));
});
test('one bank credit may be allocated across societies without exceeding the credit; reference spaces cannot duplicate it',async()=>{
 const a=crypto.randomUUID(),b=crypto.randomUUID(),bank=crypto.randomUUID();
 await as(ids.admin,()=>db.query("insert into treasury_funds(id,name,abbreviation) values($1,'Split A','SPLA'),($2,'Split B','SPLB')",[a,b]));
 await as(ids.admin,()=>db.query("insert into treasury_bank_transactions(id,reference,occurred_on,kind,amount_cents) values($1,' PIX SPLIT 002 ','2025-02-10','income',3000)",[bank]));
 await assert.rejects(()=>as(ids.admin,()=>db.query("insert into treasury_bank_transactions(reference,occurred_on,kind,amount_cents) values('PIXSPLIT002','2025-02-10','income',3000)")),e=>e.code==='23505');
 await as(ids.admin,()=>insert(crypto.randomUUID(),a,1000,{status:'confirmed',bank_id:bank,shirt_cents:600,monthly_fee_cents:400}));
 await as(ids.admin,()=>insert(crypto.randomUUID(),b,2000,{status:'confirmed',bank_id:bank,per_capita_cents:300}));
 await assert.rejects(()=>as(ids.admin,()=>insert(crypto.randomUUID(),b,1,{status:'confirmed',bank_id:bank})),e=>e.code==='23514');
 const reconciliation=(await as(ids.admin,()=>db.query('select treasury_bank_reconciliation() data'))).rows[0].data.find(row=>row.id===bank);
 assert.equal(reconciliation.allocated_cents,3000);assert.equal(reconciliation.remaining_cents,0);
});

test('society PIN login is narrow, rotated/revoked server-side, and cannot reach other application roles',async()=>{
 const portal=crypto.randomUUID();
 await db.query('insert into auth.users values($1)',[portal]);
 await db.query("insert into profiles values($1,'Fixture PIN',$2,true)",[portal,`portal-treasury-${ids.fund}`]);
 await db.query("insert into user_roles values($1,'visualizador')",[portal]);
 await denied(()=>as(null,()=>db.query('select treasury_set_pin($1,$2,true)',[ids.fund,'123456'])));
 await denied(()=>as(ids.outsider,()=>db.query('select treasury_set_pin($1,$2,true)',[ids.fund,'123456'])));
 await denied(()=>as(ids.inactive,()=>db.query('select treasury_set_pin($1,$2,true)',[ids.fund,'123456'])));
 await assert.rejects(()=>as(ids.admin,()=>db.query('select treasury_set_pin($1,$2,true)',[ids.fund,'1234'])),e=>e.code==='22023');
 await as(ids.admin,()=>db.query('select treasury_set_pin($1,$2,true)',[ids.fund,'123456']));
 const rows=await as(ids.admin,()=>db.query('select treasury_pin_status() data'));
 const status=rows.rows[0].data.find(p=>p.fund_id===ids.fund);
 assert.equal(status.active,true); assert.equal(status.configured,true); assert.ok(!('pin_hash' in status));
 const verified=(await db.query('select treasury_verify_pin($1,$2) data',[ids.fund,'123456'])).rows[0].data;
 assert.equal((await db.query('select treasury_verify_pin($1,$2) data',[ids.fund,'000000'])).rows[0].data,null);
 await denied(()=>as(ids.admin,()=>db.query('select treasury_verify_pin($1,$2)',[ids.fund,'123456'])));
 const fingerprint=(await db.query("select encode(extensions.digest('IPNC:PIN:v1:'||$1,'sha256'),'hex') value",[verified.version])).rows[0].value;
 const claim={app_metadata:{ipnc_portal:{namespace:'treasury',id:ids.fund,fingerprint,issued_at:Math.floor(Date.now()/1000)}}};
 const pinAs=fn=>as(portal,fn,claim);
 const access=(await pinAs(()=>db.query('select treasury_access() data'))).rows[0].data;
 assert.equal(access.admin,false);assert.deepEqual(access.fund_ids,[ids.fund]);
 assert.equal((await pinAs(()=>db.query('select ipnc_private.actor_active() active'))).rows[0].active,false);
 const dashboard=(await pinAs(()=>db.query('select treasury_dashboard() data'))).rows[0].data;
 assert.deepEqual(dashboard.funds.map(f=>f.id),[ids.fund]);
 assert.equal((await pinAs(()=>db.query('select treasury_statement($1) data',[ids.other]))).rows[0].data.total_count,0);
 for (const payment_method of ['pix', 'cash']) {
  const payload=createSocietyReceipt({fund_id:ids.fund,amount:'0,50',occurred_on:'2025-02-10',person_name:'Fixture only',description:'Simple receipt fixture',payment_method},access.fund_ids);
  const result=await pinAs(()=>db.query(`insert into treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description,status,payment_method,shirt_cents,monthly_fee_cents,per_capita_cents,bank_transaction_id,review_note) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,[payload.fund_id,payload.kind,payload.amount_cents,payload.occurred_on,payload.person_name,payload.description,payload.status,payload.payment_method,payload.shirt_cents,payload.monthly_fee_cents,payload.per_capita_cents,payload.bank_transaction_id,payload.review_note]));
  assert.equal(result.rows[0].status,'pending');assert.equal(result.rows[0].payment_method,payment_method);assert.equal(result.rows[0].bank_transaction_id,null);assert.equal(result.rows[0].review_note,'');
 }
 const afterReceipts=(await pinAs(()=>db.query('select treasury_dashboard() data'))).rows[0].data;
 assert.deepEqual(afterReceipts.totals,dashboard.totals);
 await denied(()=>pinAs(()=>insert(crypto.randomUUID(),ids.other,50)));
 await denied(()=>pinAs(()=>insert(crypto.randomUUID(),ids.fund,50,{status:'confirmed'})));
 await denied(()=>pinAs(()=>insert(crypto.randomUUID(),ids.fund,50,{kind:'expense'})));
 await denied(()=>pinAs(()=>db.query('select treasury_set_pin($1,$2,true)',[ids.fund,'654321'])));
 await denied(()=>pinAs(()=>db.query('select * from ipnc_private.treasury_pins')));
 await denied(()=>pinAs(()=>db.query('select treasury_report(2025,$1)',[ids.other])));
 const altered={app_metadata:{ipnc_portal:{...claim.app_metadata.ipnc_portal,id:ids.other}}};
 assert.deepEqual((await as(portal,()=>db.query('select treasury_access() data'),altered)).rows[0].data.fund_ids,[]);
 const expired={app_metadata:{ipnc_portal:{...claim.app_metadata.ipnc_portal,issued_at:Math.floor(Date.now()/1000)-43201}}};
 assert.deepEqual((await as(portal,()=>db.query('select treasury_access() data'),expired)).rows[0].data.fund_ids,[]);
 await as(ids.admin,()=>db.query('select treasury_set_pin($1,$2,true)',[ids.fund,'654321']));
 assert.deepEqual((await pinAs(()=>db.query('select treasury_access() data'))).rows[0].data.fund_ids,[]);
 assert.equal((await pinAs(()=>db.query('select * from treasury_entries'))).rows.length,0);
 await denied(()=>pinAs(()=>insert(crypto.randomUUID(),ids.fund,50)));
 assert.equal((await db.query('select treasury_verify_pin($1,$2) data',[ids.fund,'123456'])).rows[0].data,null);
 await as(ids.admin,()=>db.query('select treasury_set_pin($1,null,false)',[ids.fund]));
 assert.equal((await db.query('select treasury_verify_pin($1,$2) data',[ids.fund,'654321'])).rows[0].data,null);
});
const reserveFund = async label => {
 const id=crypto.randomUUID();
 await as(ids.admin,()=>db.query('insert into treasury_funds(id,name,abbreviation) values($1,$2,$3)',[id,`Fixture ${label}`,id.slice(0,8)]));
 return id;
};
const reserveEntry = (fund,day,kind,capita,{amount=capita,status='confirmed'}={}) => as(ids.admin,()=>db.query(`insert into treasury_entries(id,fund_id,kind,amount_cents,occurred_on,person_name,description,status,payment_method,per_capita_cents,review_note) values($1,$2,$3,$4,$5,'Fixture only','Reserve timeline fixture',$6,'cash',$7,'Fixture verified') returning *`,[crypto.randomUUID(),fund,kind,amount,day,status,capita])).then(result=>result.rows[0]);
const editReserve = (entry,changes) => {
 const next={...entry,...changes};
 return as(ids.admin,()=>db.query(`update treasury_entries set fund_id=$1,occurred_on=$2,kind=$3,status=$4,per_capita_cents=$5,description=$6,revision=$7 where id=$8 and revision=$9 returning *`,[next.fund_id,next.occurred_on,next.kind,next.status,next.per_capita_cents,next.description,entry.revision+1,entry.id,entry.revision]));
};
const temporalDenial = work => assert.rejects(work,error=>error.code==='23514' && /data do histórico/.test(error.message));

test('temporal reserve migration preserves function identity, owner, ACL and security settings',async()=>{
 assert.deepEqual((await guardMetadata()).rows,originalGuardMetadata);
});

test('later-year reserve income cannot cover a backdated withdrawal or pending confirmation',async()=>{
 const fund=await reserveFund('year boundary');
 await reserveEntry(fund,'2025-01-01','income',0,{amount:10000});
 await reserveEntry(fund,'2026-01-01','income',1000);
 await temporalDenial(()=>reserveEntry(fund,'2025-06-01','expense',1000));
 const pending=await reserveEntry(fund,'2025-06-01','expense',1000,{status:'pending'});
 await temporalDenial(()=>editReserve(pending,{status:'confirmed'}));
 const report=(await as(ids.admin,()=>db.query('select treasury_report(2025,$1) data',[fund]))).rows[0].data;
 assert.equal(report.reserved_cents,0);
 assert.deepEqual(reportTotals(report),{income:10000,expense:0,closing:10000,available:10000});
 assert.equal(report.pending_count,1);
 assert.equal(report.entries.length,1);
});

test('credit date, amount, rejection and society changes cannot borrow from later reserve income',async()=>{
 const fund=await reserveFund('credit edits'),other=await reserveFund('credit destination');
 const credit=await reserveEntry(fund,'2025-04-01','income',1000);
 const withdrawal=await reserveEntry(fund,'2025-05-01','expense',1000);
 await reserveEntry(fund,'2025-06-01','income',1000);
 for(const change of [{occurred_on:'2025-07-01'},{per_capita_cents:500},{status:'rejected'},{status:'pending'},{fund_id:other}]) {
  await temporalDenial(()=>editReserve(credit,change));
 }
 await temporalDenial(()=>editReserve(withdrawal,{occurred_on:'2025-03-01'}));
 const persisted=(await as(ids.admin,()=>db.query('select revision,occurred_on::text,status,per_capita_cents,fund_id from treasury_entries where id=$1',[credit.id]))).rows[0];
 assert.deepEqual(persisted,{revision:1,occurred_on:'2025-04-01',status:'confirmed',per_capita_cents:1000,fund_id:fund});
 assert.equal((await as(ids.admin,()=>db.query('select count(*)::int count from treasury_entry_audit where entry_id=$1',[credit.id]))).rows[0].count,1);
});

test('moving a withdrawal validates the destination timeline as well as the old society',async()=>{
 const origin=await reserveFund('withdrawal origin'),destination=await reserveFund('withdrawal destination');
 await reserveEntry(origin,'2025-04-01','income',1000);
 const withdrawal=await reserveEntry(origin,'2025-05-01','expense',1000);
 await reserveEntry(destination,'2025-06-01','income',1000);
 await temporalDenial(()=>editReserve(withdrawal,{fund_id:destination}));
 const row=(await as(ids.admin,()=>db.query('select fund_id,revision from treasury_entries where id=$1',[withdrawal.id]))).rows[0];
 assert.deepEqual(row,{fund_id:origin,revision:1});
});

test('same-day reserve receipts and payments use accounting date without artificial creation order',async()=>{
 const fund=await reserveFund('same day');
 const withdrawal=await reserveEntry(fund,'2025-03-15','expense',1000,{status:'pending'});
 await reserveEntry(fund,'2025-03-15','income',1000);
 const confirmation=await editReserve(withdrawal,{status:'confirmed'});
 assert.equal(confirmation.rows[0].revision,2);
 const report=(await as(ids.admin,()=>db.query('select treasury_report(2025,$1) data',[fund]))).rows[0].data;
 assert.equal(report.reserved_cents,0);
 assert.deepEqual(reportTotals(report),{income:1000,expense:1000,closing:0,available:0});
});

test('prior-year reserve carries forward and valid credit corrections do not rewrite historical reports',async()=>{
 const fund=await reserveFund('carry forward');
 const credit=await reserveEntry(fund,'2024-12-31','income',2000,{amount:10000});
 await reserveEntry(fund,'2025-03-15','expense',600);
 await reserveEntry(fund,'2026-01-01','income',1000);
 const correction=await editReserve(credit,{per_capita_cents:1500});
 assert.equal(correction.rows[0].revision,2);
 const report=(await as(ids.admin,()=>db.query('select treasury_report(2025,$1) data',[fund]))).rows[0].data;
 assert.equal(report.opening_cents,10000);
 assert.equal(report.reserved_cents,900);
 assert.deepEqual(reportTotals(report),{income:0,expense:600,closing:9400,available:8500});
});

test('legacy history stays intact and unrelated edits or unreserved receipts remain available',async()=>{
 const baseline=readFileSync(new URL('../supabase/migrations/20261005142735_treasury_society_pin_access.sql',import.meta.url),'utf8');
 const oldGuard=baseline.slice(baseline.indexOf('create or replace function ipnc_private.treasury_entry_guard()'),baseline.indexOf('notify pgrst'));
 await db.exec(oldGuard);
 const fund=await reserveFund('legacy preservation');
 await reserveEntry(fund,'2026-01-01','income',1000);
 const withdrawal=await reserveEntry(fund,'2025-06-01','expense',1000);
 const before=(await as(ids.admin,()=>db.query('select treasury_report(2025,$1) data',[fund]))).rows[0].data;
 await db.exec(timelineMigration);
 const after=(await as(ids.admin,()=>db.query('select treasury_report(2025,$1) data',[fund]))).rows[0].data;
 assert.deepEqual(after,before);
 assert.equal(after.reserved_cents,-1000);
 const correction=await editReserve(withdrawal,{description:'Corrected fixture description'});
 assert.equal(correction.rows[0].revision,2);
 const receipt=await reserveEntry(fund,'2025-07-01','income',0,{amount:100,status:'pending'});
 assert.equal(receipt.status,'pending');
 const unreserved=await reserveEntry(fund,'2025-07-01','income',0,{amount:100});
 assert.equal(unreserved.status,'confirmed');
 assert.deepEqual((await guardMetadata()).rows,originalGuardMetadata);
});

test.after(async()=>{await db.close();});
