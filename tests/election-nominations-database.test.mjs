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
});
test.after(()=>db.close());
const call=async(name,args=[])=>(await db.query(`select ${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as value`,args)).rows[0].value;
const demo=()=>call('ipnc_private.create_election_demo',['Ensaio vazio fictício',0,{}]);
const snapshot=room=>call('election_room_snapshot',[room.room_token,null]);
const control=(room,action,revision=0,payload={})=>call('election_demo_command',[room.admin_token,action,revision,payload]);
const act=async(room,action,payload={})=>control(room,action,(await control(room,'snapshot')).revision,payload);
const urn=(room,state,id)=>call('election_demo_urn_cast',[room.urn_token,state.activeElection.id,state.activeElection.current_round,crypto.randomUUID(),[id],0]);
async function real(present=2){
 const id=crypto.randomUUID();await db.query("insert into elections(id,name,position) values($1,'Fictícia','Presidente')",[id]);
 for(let i=0;i<present;i++)await db.query("insert into election_attendance(election_id,present,name) values($1,true,'Pessoa fictícia')",[id]);
 await db.query('update elections set total_present=$2 where id=$1',[id,present]);
 const candidates=[];for(const name of ['Alfa','Beta']){const c=crypto.randomUUID();await db.query('insert into election_candidates(id,election_id,name) values($1,$2,$3)',[c,id,name]);candidates.push(c);}
 await db.query("update elections set status='open' where id=$1",[id]);return {id,candidates};
}
const realVote=(id,candidate,round=1)=>call('cast_ipnc_ballot',[id,null,crypto.randomUUID(),round,crypto.randomUUID(),[candidate],0,1]);

test('real next round enters empty nominations, rejects every legacy cast until explicit mesário start, and retains history',async()=>{
 const e=await real();const room=await call('election_room_ensure',[e.id]);
 await realVote(e.id,e.candidates[0]);await assert.rejects(db.query('update elections set current_round=2 where id=$1',[e.id]),/Contagem divergente/);
 await realVote(e.id,e.candidates[1]);await db.query('update elections set current_round=2 where id=$1',[e.id]);
 let state=await snapshot(room);assert.equal(state.phase,'nominations');assert.equal(state.activeElection.nominations_open,true);assert.equal(state.count.ballots,0);assert.deepEqual(state.candidates,[]);assert.deepEqual(state.eligible_candidate_ids,[]);
 await assert.rejects(realVote(e.id,e.candidates[0],2),/indicações/);
 await assert.rejects(call('cast_ipnc_ballot',[e.id,null,crypto.randomUUID(),2,crypto.randomUUID(),[],1,1]),/indicações/);
 await assert.rejects(call('election_start_nominated_round',[e.id,2]),/Indique pelo menos/);
 await assert.rejects(db.query('delete from election_candidates where id=$1',[e.candidates[0]]),/histórica/);
 const newcomer=crypto.randomUUID();await db.query("insert into election_candidates(id,election_id,name,nomination_round) values($1,$2,'Nova indicação',1)",[newcomer,e.id]);
 assert.equal((await db.query('select nomination_round from election_candidates where id=$1',[newcomer])).rows[0].nomination_round,2);
 await assert.rejects(realVote(e.id,newcomer,2),/indicações/);
 await db.exec('set role anon');try{await assert.rejects(call('election_start_nominated_round',[e.id,2]),/permission denied/);}finally{await db.exec('reset role');}
 const started=await call('election_start_nominated_round',[e.id,2]);assert.equal(started.nominations_open,false);
 state=await snapshot(room);assert.equal(state.phase,'voting');assert.deepEqual(state.eligible_candidate_ids,[newcomer]);assert.equal(state.candidates.length,1);
 await assert.rejects(realVote(e.id,e.candidates[0],2),/não indicado/);await assert.rejects(realVote(e.id,newcomer,1),/Votação encerrada/);
 await assert.rejects(db.query('delete from election_votes where election_id=$1 and round_number=1',[e.id]),/preservados/);
 await realVote(e.id,newcomer,2);await assert.rejects(db.query("update elections set status='finished' where id=$1",[e.id]),/Contagem divergente/);
 await realVote(e.id,newcomer,2);await db.query("update elections set status='finished',show_result=true where id=$1",[e.id]);
 assert.equal((await db.query('select count(distinct ballot_id)::integer n from election_votes where election_id=$1',[e.id])).rows[0].n,4);
 const report=await call('election_room_report',[room.room_token]);assert.equal(report.elections.length,1);assert.equal(report.elections[0].rounds.length,2);assert.deepEqual(report.elections[0].electedIds,[newcomer]);assert.equal(report.elections[0].candidates.length,3);
});

test('fresh demo begins with no attendance, confirmation, candidates or ballots and only the mesário can prepare it',async()=>{
 const room=await demo();let state=await control(room,'snapshot');
 assert.equal(state.activeElection.status,'draft');assert.equal(state.activeElection.total_present,0);assert.deepEqual(state.attendance,[]);assert.equal(state.attendance_confirmed,false);assert.deepEqual(state.current_candidates,[]);assert.equal(state.count.ballots,0);
 await assert.rejects(act(room,'start'),/Confirme a chamada/);await assert.rejects(act(room,'candidate_add',{name:'Alfa'}),/Confirme a chamada/);
 await assert.rejects(control({...room,admin_token:room.room_token},'attendance_add',state.revision,{name:'Fake'}),/Controle indisponível/);
 state=await act(room,'configure',{name:'Ensaio novo fictício',position:'Tesoureiro'});assert.equal(state.activeElection.position,'Tesoureiro');
 state=await act(room,'attendance_bulk_add',{names:['Fictício 1','Fictício 2'],present:true});assert.equal(state.attendance.length,2);assert.equal(state.attendance_confirmed,false);assert.equal(state.activeElection.total_present,0);
 state=await act(room,'confirm_attendance');assert.equal(state.activeElection.total_present,2);assert.equal(state.attendance_confirmed,true);
 state=await act(room,'candidate_add',{name:'Alfa'});state=await act(room,'candidate_add',{name:'Beta'});assert.equal(state.current_candidates.length,2);
 state=await act(room,'start');assert.equal(state.phase,'voting');assert.equal(state.candidates.length,2);
 await assert.rejects(act(room,'attendance_toggle',{id:state.attendance[0].id,present:false}),/chamada está fechada/);await assert.rejects(act(room,'candidate_add',{name:'Gama'}),/indicações/);
 await urn(room,state,state.candidates[0].id);await assert.rejects(act(room,'next_round'),/não pode avançar/);await urn(room,state,state.candidates[1].id);
 state=await act(room,'publish');assert.equal(state.published_result.rounds[0].totalBallots,2);
 const oldIds=state.candidates.map(c=>c.id);state=await act(room,'next_round');assert.equal(state.phase,'nominations');assert.deepEqual(state.current_candidates,[]);assert.deepEqual(state.candidates,[]);assert.equal(state.all_candidates.length,2);
 await assert.rejects(urn(room,state,oldIds[0]),/A votação mudou/);await assert.rejects(act(room,'start'),/Indique pelo menos/);await assert.rejects(act(room,'candidate_remove',{id:oldIds[0]}),/histórica/);
 state=await act(room,'candidate_add',{name:'Alfa indicado novamente'});const nominee=state.current_candidates[0];assert.equal(nominee.nomination_round,2);assert.ok(!oldIds.includes(nominee.id));
 await assert.rejects(urn(room,state,nominee.id),/A votação mudou/);state=await act(room,'start');await urn(room,state,nominee.id);await assert.rejects(act(room,'finish'),/apuração válida/);await urn(room,state,nominee.id);
 state=await act(room,'publish');state=await act(room,'finish');assert.equal(state.activeElection.status,'finished');
 const report=await call('election_room_report',[room.room_token]);assert.equal(report.elections[0].rounds.length,2);assert.deepEqual(report.elections[0].electedIds,[nominee.id]);assert.equal(report.elections[0].candidates.length,3);
 state=await act(room,'next_election',{position:'Presidente'});assert.deepEqual(state.current_candidates,[]);assert.equal(state.attendance.length,2);assert.equal(state.attendance_confirmed,true);assert.equal(state.activeElection.status,'draft');await assert.rejects(act(room,'start'),/Indique pelo menos/);
});

test('bulk attendance is atomic, revision checked, capped, and never implicitly confirms the call',async()=>{
 const room=await demo();const before=await control(room,'snapshot');
 for(const payload of [{names:['OK',null]},{names:['OK',{}]},{names:['OK'],present:'yes'},{names:Array(2001).fill('Fictício')},{names:['']}])await assert.rejects(control(room,'attendance_bulk_add',before.revision,payload));
 assert.deepEqual((await control(room,'snapshot')).attendance,[]);
 const state=await control(room,'attendance_bulk_add',before.revision,{names:Array.from({length:150},(_,i)=>`Pessoa fictícia ${i+1}`),present:true});assert.equal(state.attendance.length,150);assert.equal(state.count.present,150);assert.equal(state.count.confirmed,0);assert.equal(state.count.exact,false);
 await assert.rejects(control(room,'attendance_add',before.revision,{name:'Resposta perdida'}),/A sala mudou/);
 const confirmed=await act(room,'confirm_attendance');assert.equal(confirmed.activeElection.total_present,150);assert.equal(confirmed.count.ballots,0);
});

test('public reports omit unfinished, hidden or divergent cargos and never include control secrets or attendance',async()=>{
 const room=await call('ipnc_private.create_election_demo',['Relatório fictício',2,{Alfa:2}]);let state=await control(room,'snapshot');
 assert.deepEqual((await call('election_room_report',[room.room_token])).elections,[]);
 state=await act(room,'publish');assert.deepEqual((await call('election_room_report',[room.room_token])).elections,[]);
 state=await act(room,'finish');const report=await call('election_room_report',[room.room_token]);assert.equal(report.elections.length,1);
 for(const forbidden of ['admin_token','urn_token','device_id','ballot_id','attendance','birth_date'])assert.equal(JSON.stringify(report).includes(forbidden),false);
 await act(room,'hide_result');assert.deepEqual((await call('election_room_report',[room.room_token])).elections,[]);
});

test('reapplying nominations migration never rewrites historical candidate scopes or consumes old synthetic ballots',async()=>{
 const candidatesBefore=(await db.query('select id,nomination_round from election_candidates order by id')).rows;
 const realBefore=(await db.query('select id,round_number from election_votes order by id')).rows;
 const demoBefore=(await db.query('select ballot_id,round_number from ipnc_private.election_demo_ballots order by ballot_id')).rows;
 await db.exec(migration);
 assert.deepEqual((await db.query('select id,nomination_round from election_candidates order by id')).rows,candidatesBefore);
 assert.deepEqual((await db.query('select id,round_number from election_votes order by id')).rows,realBefore);
 assert.deepEqual((await db.query('select ballot_id,round_number from ipnc_private.election_demo_ballots order by ballot_id')).rows,demoBefore);
});

test('upgrading the old 149 rehearsal leaves its reserved last ballot unconsumed and only backfills synthetic call metadata',async()=>{
 const state=await control(legacyDemo,'snapshot');assert.equal(state.count.ballots,149);assert.equal(state.count.present,150);assert.equal(state.activeElection.total_present,150);assert.equal(state.attendance_confirmed,true);assert.equal(state.attendance.length,150);assert.equal(state.activeElection.nominations_open,false);assert.equal(state.current_candidates.length,3);
 assert.equal((await db.query('select count(*)::integer n from ipnc_private.election_demo_ballots where election_id=$1',[state.activeElection.id])).rows[0].n,149);
});

test('third round also starts with no nominees and reports retain all three independent ballots',async()=>{
 const e=await real();await realVote(e.id,e.candidates[0]);await realVote(e.id,e.candidates[1]);await db.query('update elections set current_round=2 where id=$1',[e.id]);
 const second=[crypto.randomUUID(),crypto.randomUUID()];for(let i=0;i<2;i++)await db.query('insert into election_candidates(id,election_id,name) values($1,$2,$3)',[second[i],e.id,`Indicado segundo ${i}`]);
 await call('election_start_nominated_round',[e.id,2]);await realVote(e.id,second[0],2);await realVote(e.id,second[1],2);await db.query('update elections set current_round=3 where id=$1',[e.id]);
 assert.equal((await db.query('select count(*)::integer n from election_candidates where election_id=$1 and nomination_round=3',[e.id])).rows[0].n,0);
 await assert.rejects(realVote(e.id,second[0],3),/indicações/);
 const third=crypto.randomUUID();await db.query("insert into election_candidates(id,election_id,name) values($1,$2,'Indicado terceiro')",[third,e.id]);await call('election_start_nominated_round',[e.id,3]);
 await realVote(e.id,third,3);await assert.rejects(db.query("update elections set status='finished' where id=$1",[e.id]),/Contagem divergente/);await realVote(e.id,third,3);await db.query("update elections set status='finished',show_result=true where id=$1",[e.id]);
 const room=await call('election_room_ensure',[e.id]);const report=await call('election_room_report',[room.room_token]);assert.equal(report.elections[0].rounds.length,3);assert.deepEqual(report.elections[0].rounds.map(r=>r.totalBallots),[2,2,2]);assert.deepEqual(report.elections[0].electedIds,[third]);
});

test('reports follow room cargo order and never disclose a pending next cargo',async()=>{
 const room=await call('ipnc_private.create_election_demo',['Roteiro fictício',1,{Alfa:1}]);await act(room,'publish');await act(room,'finish');let state=await act(room,'next_election',{position:'Vice-presidente'});
 assert.equal((await call('election_room_report',[room.room_token])).elections.length,1);
 state=await act(room,'candidate_add',{name:'Vice fictício'});state=await act(room,'start');await urn(room,state,state.candidates[0].id);await act(room,'publish');await act(room,'finish');
 await db.exec('set role anon');try{const report=await call('election_room_report',[room.room_token]);assert.equal(report.elections.length,2);assert.deepEqual(report.elections.map(e=>e.election.position),['Tesoureiro','Vice-presidente']);}finally{await db.exec('reset role');}
});
