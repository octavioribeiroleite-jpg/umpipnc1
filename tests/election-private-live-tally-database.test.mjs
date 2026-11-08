import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration=readFileSync(new URL('../supabase/migrations/20261108163118_election_round_nominations.sql',import.meta.url),'utf8');
const previous=readFileSync(new URL('../supabase/migrations/20261108155947_persistent_election_rooms_and_isolated_demo.sql',import.meta.url),'utf8');
const countGate=readFileSync(new URL('../supabase/migrations/20261108132815_election_exact_count_gate.sql',import.meta.url),'utf8');
const ballotSource=readFileSync(new URL('../supabase/migrations/20260905113023_guarded_public_flows.sql',import.meta.url),'utf8');
const db=new PGlite();const manager='00000000-0000-4000-8000-000000000001';let legacyDemo;
test.before(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema ipnc_private;
 create function auth.role() returns text language sql as $$select 'service_role'::text$$;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
 create function ipnc_private.can_manage_election(p_id uuid) returns boolean language sql as $$select auth.uid()='${manager}'::uuid$$;
 create table elections(id uuid primary key default gen_random_uuid(),name text not null,position text not null,status text not null default 'draft',current_round integer not null default 1,total_present integer not null default 0,society_id uuid,created_by uuid,voting_mode text default 'both',seats_count integer default 1,max_choices_per_ballot integer default 1,majority_rule text default 'absolute_50',round2_candidate_ids uuid[],show_result boolean default false,type text default 'cargo');
 create table election_attendance(id uuid primary key default gen_random_uuid(),election_id uuid references elections on delete cascade,present boolean not null,name text);
 create table election_candidates(id uuid primary key default gen_random_uuid(),election_id uuid references elections on delete cascade,name text not null,photo_url text,photo_urls jsonb,birth_date date,display_order integer default 0);
 create table election_devices(id uuid primary key default gen_random_uuid(),election_id uuid references elections on delete cascade,token uuid);
 create table election_votes(id uuid primary key default gen_random_uuid(),election_id uuid references elections on delete cascade,candidate_id uuid references election_candidates,ballot_id uuid not null,round_number integer not null,is_blank boolean not null,device_id text);
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to authenticated;
 select set_config('test.actor','${manager}',false);`);
 await db.exec(countGate);await db.exec(previous);
 await db.exec(ballotSource.slice(ballotSource.indexOf('create or replace function'),ballotSource.indexOf('revoke all on function')));
 legacyDemo=(await db.query("select ipnc_private.create_election_demo('Ensaio legado fictício',150,'{\"Alfa\":60,\"Beta\":55,\"Gama\":34}'::jsonb) value")).rows[0].value;
 await db.exec(migration);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108195243_election_private_live_tally.sql',import.meta.url),'utf8'));
});
test.after(()=>db.close());
const call=async(name,args=[])=>(await db.query(`select ${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as value`,args)).rows[0].value;
const demo=()=>call('ipnc_private.create_election_demo',['Ensaio vazio fictício',0,{}]);
const snapshot=room=>call('election_room_snapshot',[room.room_token,null]);
const control=(room,action,revision=0,payload={})=>call('election_demo_command',[room.admin_token,action,revision,payload]);
const act=async(room,action,payload={})=>control(room,action,(await control(room,'snapshot')).revision,payload);
const urn=(room,state,id)=>call('election_demo_urn_cast',[room.urn_token,state.activeElection.id,state.activeElection.current_round,crypto.randomUUID(),[id],0]);
test('only the mesário capability sees live candidate aggregates, without publishing or casting',async()=>{
 const room=await call('ipnc_private.create_election_demo',['Prévia privada fictícia',4,{Alfa:1,Beta:1}]);
 const before=(await db.query('select ballot_id,device_id,choices,round_number from ipnc_private.election_demo_ballots where election_id=$1 order by ballot_id',[room.election_id])).rows;
 await db.exec('set role anon');
 try {
  const visible=await snapshot(room);assert.equal(visible.count.ballots,2);assert.equal(visible.published_result,null);assert.equal('admin_live_result' in visible,false);
  const state=await control(room,'snapshot');assert.equal(state.count.exact,false);assert.equal(state.published_result,null);
  const live=state.admin_live_result;assert.equal(live.rounds[0].totalBallots,2);assert.deepEqual(live.rounds[0].rows.map(x=>x.count).sort(),[1,1]);
  for(const key of ['ballot_id','device_id','birth_date','admin_token','urn_token','attendance']) assert.equal(JSON.stringify(live).includes(key),false);
  for(const token of [room.room_token,room.urn_token,crypto.randomUUID()])await assert.rejects(control({...room,admin_token:token},'snapshot'),/Controle indisponível/);
  await assert.rejects(call('ipnc_private.election_demo_control_snapshot',[room.room_token]),/permission denied/);
  const after=await control(room,'snapshot');assert.equal(after.revision,state.revision);assert.deepEqual(after.admin_live_result,live);
  await assert.rejects(control(room,'hide_result',state.revision-1),/A sala mudou/);
  assert.equal((await control(room,'snapshot')).revision,state.revision);
  assert.deepEqual((await call('election_room_report',[room.room_token])).elections,[]);
 }finally{await db.exec('reset role');}
 assert.deepEqual((await db.query('select ballot_id,device_id,choices,round_number from ipnc_private.election_demo_ballots where election_id=$1 order by ballot_id',[room.election_id])).rows,before);
});

test('live aggregates retain the previous round while the current partial remains private',async()=>{
 const room=await call('ipnc_private.create_election_demo',['Rodadas privadas fictícias',2,{Alfa:1,Beta:1}]);
 await act(room,'publish');let state=await act(room,'next_round');
 state=await act(room,'candidate_add',{name:'Nova indicação Alfa'});state=await act(room,'start');
 await urn(room,state,state.current_candidates[0].id);
 state=await control(room,'snapshot');assert.equal(state.activeElection.current_round,2);assert.equal(state.count.exact,false);
 assert.deepEqual(state.admin_live_result.rounds.map(r=>r.totalBallots),[2,1]);
 assert.equal(state.admin_live_result.candidates.length,4);
 const publicState=await snapshot(room);assert.equal(publicState.published_result,null);assert.equal('admin_live_result' in publicState,false);
 await assert.rejects(act(room,'publish'),/Contagem|contagem/);
 await assert.rejects(act(room,'finish'),/apuração válida/);
});

test('reapplication changes no ballots, revision, publication or public endpoint definitions',async()=>{
 const definitions=await db.query("select proname,prosrc,proacl::text from pg_proc where proname in ('election_room_snapshot','election_demo_command','election_demo_cast','election_demo_urn_cast','election_room_report') order by proname");
 const rooms=await db.query('select id,revision from ipnc_private.election_rooms order by id');
 const ballots=await db.query('select ballot_id,choices from ipnc_private.election_demo_ballots order by ballot_id');
 await db.exec(readFileSync(new URL('../supabase/migrations/20261108195243_election_private_live_tally.sql',import.meta.url),'utf8'));
 assert.deepEqual((await db.query("select proname,prosrc,proacl::text from pg_proc where proname in ('election_room_snapshot','election_demo_command','election_demo_cast','election_demo_urn_cast','election_room_report') order by proname")).rows,definitions.rows);
 assert.deepEqual((await db.query('select id,revision from ipnc_private.election_rooms order by id')).rows,rooms.rows);
 assert.deepEqual((await db.query('select ballot_id,choices from ipnc_private.election_demo_ballots order by ballot_id')).rows,ballots.rows);
 const privileges=(await db.query("select has_function_privilege('anon','ipnc_private.election_demo_control_snapshot(uuid)','execute') a,has_function_privilege('authenticated','ipnc_private.election_demo_control_snapshot(uuid)','execute') b")).rows[0];
 assert.deepEqual(privileges,{a:false,b:false});
});
