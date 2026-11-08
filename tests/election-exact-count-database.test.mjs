import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Real trigger/RPC SQL with fictitious data. PGlite has one connection, so race
// cases exercise both serialization orders; native lock contention isn't mocked
// or claimed as a multi-connection integration test.
const patch = readFileSync(new URL('../supabase/migrations/20261108132815_election_exact_count_gate.sql', import.meta.url), 'utf8');
const db = new PGlite();
test.before(async () => {
  await db.exec(`create schema ipnc_private; create schema auth;
    create function auth.role() returns text language sql as $$ select 'service_role'::text $$;
    create table elections(id uuid primary key default gen_random_uuid(),status text not null default 'draft',current_round integer not null default 1,total_present integer not null default 0,voting_mode text not null default 'both');
    create table election_attendance(id uuid primary key default gen_random_uuid(),election_id uuid not null references elections on delete cascade,name text not null,present boolean not null default false);
    create table election_candidates(id uuid primary key default gen_random_uuid(),election_id uuid not null references elections on delete cascade);
    create table election_devices(id uuid primary key default gen_random_uuid(),election_id uuid not null references elections on delete cascade,token uuid);
    create table election_votes(id uuid primary key default gen_random_uuid(),election_id uuid not null references elections on delete cascade,candidate_id uuid references election_candidates on delete cascade,device_id text,ballot_id uuid not null,round_number integer not null,is_blank boolean not null);
  `);
  const rpc=readFileSync(new URL('../supabase/migrations/20260905113023_guarded_public_flows.sql',import.meta.url),'utf8');
  await db.exec(rpc.slice(rpc.indexOf('create or replace function'),rpc.indexOf('revoke all on function')));
  await db.exec(patch);
});
test.after(async () => { await db.close(); });
async function fresh(present=16) {
  const id=crypto.randomUUID(); await db.query('insert into elections(id) values($1)',[id]);
  for(let n=0;n<present;n++)await db.query("insert into election_attendance(election_id,name,present) values($1,'Pessoa fictícia',true)",[id]);
  await db.query('update elections set total_present=$2 where id=$1',[id,present]);
  if(present)await db.query("update elections set status='open' where id=$1",[id]);
  return id;
}
async function ballot(id,round=1,choices=1) {
  const ballotId=crypto.randomUUID();
  // Multiple marks, including blank slots, belong to this single ballot UUID.
  for(let n=0;n<choices;n++)await db.query('insert into election_votes(election_id,ballot_id,round_number,is_blank) values($1,$2,$3,true)',[id,ballotId,round]);
}
const finish=id=>db.query("update elections set status='finished' where id=$1",[id]);
const advance=id=>db.query('update elections set current_round=current_round+1 where id=$1',[id]);
const status=async id=>(await db.query('select status,current_round,total_present from elections where id=$1',[id])).rows[0];

test('DB refuses missing and surplus ballots; accepts exact unique ballots with several marks',async()=>{
  for(const amount of [0,15,16,17])for(const choices of [1,3]){
    const id=await fresh();for(let n=0;n<amount;n++)await ballot(id,1,choices);
    if(amount===16){await finish(id);assert.equal((await status(id)).status,'finished');}
    else {await assert.rejects(finish(id),/Contagem divergente/);await assert.rejects(advance(id),/Contagem divergente/);assert.equal((await status(id)).status,'open');}
    const count=(await db.query('select count(*)::integer as marks,count(distinct ballot_id)::integer as ballots from election_votes where election_id=$1',[id])).rows[0];
    assert.deepEqual(count,{marks:amount*choices,ballots:amount});
  }
});

test('a new round must independently collect all ballots; previous rounds remain intact',async()=>{
  const id=await fresh(2);await ballot(id);await ballot(id);await advance(id);
  assert.equal((await status(id)).current_round,2);await assert.rejects(finish(id),/Contagem divergente/);
  await ballot(id,2,3);await assert.rejects(finish(id),/Contagem divergente/);
  await ballot(id,2,3);await finish(id);
  assert.equal((await db.query('select count(distinct ballot_id)::integer as count from election_votes where election_id=$1 and round_number=1',[id])).rows[0].count,2);
});

test('zero quorum, inconsistent confirmation and direct finished inserts are rejected',async()=>{
  const zero=await fresh(0);await assert.rejects(db.query("update elections set status='open' where id=$1",[zero]),/Confirme uma chamada/);
  const draft=crypto.randomUUID();await db.query('insert into elections(id) values($1)',[draft]);
  await assert.rejects(db.query('update elections set total_present=1 where id=$1',[draft]),/Chamada divergente/);
  await assert.rejects(db.query("insert into elections(id,status) values($1,'finished')",[crypto.randomUUID()]),/rascunho/);
  const legacy=await fresh(2);await ballot(legacy);await ballot(legacy);
  await db.exec('alter table elections disable trigger election_exact_count_transition');
  await db.query('update elections set total_present=3 where id=$1',[legacy]);
  await db.exec('alter table elections enable trigger election_exact_count_transition');
  await assert.rejects(finish(legacy),/Chamada divergente/);
});

test('attendance/confirmed total freeze on start; finished results cannot accept late votes or edits',async()=>{
  const id=await fresh(1);
  await assert.rejects(db.query('update election_attendance set present=false where election_id=$1',[id]),/chamada está fechada/);
  await assert.rejects(db.query('delete from election_attendance where election_id=$1',[id]),/chamada está fechada/);
  await assert.rejects(db.query('update elections set total_present=2 where id=$1',[id]),/chamada confirmada/);
  await assert.rejects(db.query("update elections set status='draft' where id=$1",[id]),/não pode voltar/);
  await ballot(id);await finish(id);
  await assert.rejects(ballot(id),/votação não está aberta/);
  await assert.rejects(db.query('delete from election_votes where election_id=$1',[id]),/votação não está aberta/);
  await assert.rejects(db.query("update elections set status='open' where id=$1",[id]),/resultado encerrado/);
  // Parent deletion's existing cascade semantics remain available.
  await db.query('delete from elections where id=$1',[id]);
  assert.equal((await db.query('select count(*)::integer as n from election_votes where election_id=$1',[id])).rows[0].n,0);
});

test('serialized race outcomes never commit an incomplete/surplus finished election',async()=>{
  const extraFirst=await fresh(1);await ballot(extraFirst);await ballot(extraFirst);await assert.rejects(finish(extraFirst),/Contagem divergente/);
  const finishFirst=await fresh(1);await ballot(finishFirst);await finish(finishFirst);await assert.rejects(ballot(finishFirst),/não está aberta/);
  const finalVote=await fresh(1);await assert.rejects(finish(finalVote),/Contagem divergente/);await ballot(finalVote);await finish(finalVote);
  const roundFirst=await fresh(1);await ballot(roundFirst);await advance(roundFirst);await assert.rejects(ballot(roundFirst,1),/escrutínio foi alterado/);
  const rpcId=await fresh(1),token=crypto.randomUUID();
  await db.query('insert into election_devices(election_id,token) values($1,$2)',[rpcId,token]);
  const rpc=()=>db.query('select cast_ipnc_ballot($1,$2,null,1,$3,$4,1,1)',[rpcId,token,crypto.randomUUID(),[]]);
  await rpc();await finish(rpcId);await assert.rejects(rpc(),/Votação encerrada/);
});

test('patch reapplication preserves data and permissions; guards are security invoker with locked-down search path',async()=>{
  const before=(await db.query('select count(*)::integer as n from election_votes')).rows[0].n;
  await db.exec(patch);
  assert.equal((await db.query('select count(*)::integer as n from election_votes')).rows[0].n,before);
  const functions=await db.query("select prosecdef,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ipnc_private'");
  assert.equal(functions.rows.length,2);for(const fn of functions.rows){assert.equal(fn.prosecdef,false);assert.deepEqual(fn.proconfig,['search_path=""']);}
  const triggers=await db.query("select tgname,tgenabled from pg_trigger where tgname in ('election_exact_count_transition','election_attendance_count_lock','election_votes_count_lock')");
  assert.equal(triggers.rows.length,3);assert.ok(triggers.rows.every(trigger=>trigger.tgenabled==='O'));
});

test('ordinary table-authorized callers execute the invoker triggers without new function grants',async()=>{
  await db.exec('create role fixture_manager; grant usage on schema public to fixture_manager; grant select,insert,update,delete on elections,election_attendance,election_votes to fixture_manager;');
  await db.exec('set role fixture_manager');
  try { const id=await fresh(1);await assert.rejects(finish(id),/Contagem divergente/);await ballot(id);await finish(id); }
  finally { await db.exec('reset role'); }
});
