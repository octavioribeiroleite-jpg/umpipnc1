import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { calculateElectionRounds } from '../src/lib/election-results.ts';

const migration=readFileSync(new URL('../supabase/migrations/20261108155947_persistent_election_rooms_and_isolated_demo.sql',import.meta.url),'utf8');
const db=new PGlite();
const manager='00000000-0000-4000-8000-000000000001';
test.before(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema ipnc_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
 create function ipnc_private.can_manage_election(p_id uuid) returns boolean language sql as $$select auth.uid()='${manager}'::uuid$$;
 create table elections(id uuid primary key default gen_random_uuid(),name text not null,position text not null,status text not null default 'draft',current_round integer not null default 1,total_present integer not null default 0,society_id uuid,created_by uuid,voting_mode text default 'both',seats_count integer default 1,max_choices_per_ballot integer default 1,majority_rule text default 'absolute_50',round2_candidate_ids uuid[],show_result boolean default false,type text default 'cargo');
 create table election_attendance(id uuid primary key default gen_random_uuid(),election_id uuid references elections on delete cascade,present boolean not null,name text);
 create table election_candidates(id uuid primary key default gen_random_uuid(),election_id uuid references elections on delete cascade,name text not null,photo_url text,photo_urls jsonb,birth_date date,display_order integer default 0);
 create table election_votes(id uuid primary key default gen_random_uuid(),election_id uuid references elections on delete cascade,candidate_id uuid references election_candidates,ballot_id uuid not null,round_number integer not null,is_blank boolean not null,device_id text);
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to authenticated;
 select set_config('test.actor','${manager}',false);`);
 await db.exec(migration);
});
test.after(()=>db.close());
const call=async(name,args=[],sqlArgs=args.map((_,i)=>`$${i+1}`).join(','))=>(await db.query(`select ${name}(${sqlArgs}) as value`,args)).rows[0].value;
const seed=(counts={Alfa:60,Beta:55,Gama:34})=>call('ipnc_private.create_election_demo',['Ensaio exclusivamente fictício',150,counts]);
const snap=(room,device=null)=>call('election_room_snapshot',[room.room_token,device]);
const command=(room,action,revision,payload={})=>call('election_demo_command',[room.admin_token,action,revision,payload]);
const cast=(room,election,candidate,device=crypto.randomUUID(),ballot=crypto.randomUUID(),round=1)=>call('election_demo_cast',[room.room_token,device,election,round,ballot,[candidate],0]);

test('isolated import preserves 149/150 and publishes no raw ballots, admin secret or result before release',async()=>{
 const room=await seed();const state=await snap(room);
 assert.equal(room.imported_synthetic_ballots,149);assert.equal(state.kind,'demo');assert.equal(state.activeElection.status,'open');assert.equal(state.phase,'voting');
 assert.deepEqual(state.count,{ballots:149,present:150,confirmed:150,exact:false});assert.equal(state.published_result,null);
 assert.equal(JSON.stringify(state).includes(room.admin_token),false);assert.equal(JSON.stringify(state).includes('device_id'),false);assert.equal(JSON.stringify(state).includes('ballot_id'),false);
 assert.equal((await db.query('select count(*)::int as n from public.elections')).rows[0].n,0);
 await assert.rejects(command(room,'publish',state.revision),/Contagem divergente/);await assert.rejects(command(room,'next_round',state.revision),/não pode avançar/);
});

test('last participant is atomic, duplicate replies are idempotent and a surplus or second browser vote cannot enter',async()=>{
 const room=await seed();let state=await snap(room);const gama=state.candidates.find(c=>c.name==='Gama').id;const device=crypto.randomUUID(),ballot=crypto.randomUUID();
 await cast(room,state.activeElection.id,gama,device,ballot);await cast(room,state.activeElection.id,gama,device,ballot);
 state=await snap(room,device);assert.equal(state.count.ballots,150);assert.equal(state.count.exact,true);assert.equal(state.already_voted,true);assert.equal(state.phase,'voted');
 await assert.rejects(cast(room,state.activeElection.id,gama,device),/já votou/);
 await assert.rejects(cast(room,state.activeElection.id,gama),/Todos os presentes/);
 const published=await command(room,'publish',state.revision);assert.equal(published.phase,'result');assert.equal(published.published_result.rounds[0].totalBallots,150);
 assert.deepEqual(published.published_result.rounds[0].rows.map(r=>r.count),[60,55,35]);assert.deepEqual(published.published_result.rounds[0].electedIds,[]);
 await assert.rejects(command(room,'finish',published.revision),/apuração válida/);
});

test('mesário alone advances, round two resets receipts and retains hidden history; winner uses simple majority',async()=>{
 const room=await seed({Alfa:60,Beta:55,Gama:35});let state=await snap(room);const device=crypto.randomUUID();
 await assert.rejects(call('election_demo_command',[room.room_token,'next_round',state.revision,{}]),/Controle indisponível/);
 state=await command(room,'next_round',state.revision);assert.equal(state.activeElection.current_round,2);assert.equal(state.count.ballots,0);assert.equal(state.published_result,null);assert.equal(state.already_voted,false);
 assert.equal(state.eligible_candidate_ids.length,2);const gama=state.candidates.find(c=>c.name==='Gama').id;
 await assert.rejects(cast(room,state.activeElection.id,gama,device,crypto.randomUUID(),2),/fora deste escrutínio/);
 const alfa=state.candidates.find(c=>c.name==='Alfa').id,beta=state.candidates.find(c=>c.name==='Beta').id;
 for(let i=0;i<150;i++)await cast(room,state.activeElection.id,i<80?alfa:beta,crypto.randomUUID(),crypto.randomUUID(),2);
 state=await snap(room);const pub=await command(room,'publish',state.revision);assert.equal(pub.published_result.rounds.length,2);assert.deepEqual(pub.published_result.rounds[1].electedIds,[alfa]);
 const finished=await command(room,'finish',pub.revision);assert.equal(finished.activeElection.status,'finished');
 await assert.rejects(cast(room,state.activeElection.id,alfa,crypto.randomUUID(),crypto.randomUUID(),2),/A votação mudou/);
 const next=await command(room,'next_election',finished.revision,{position:'Presidente'});assert.equal(next.activeElection.status,'draft');assert.equal(next.activeElection.total_present,150);assert.equal(next.phase,'waiting');assert.deepEqual(next.candidates,[]);
 assert.equal((await db.query('select count(*)::int as n from ipnc_private.election_demo_ballots where election_id=$1',[state.activeElection.id])).rows[0].n,300);
 await assert.rejects(command(room,'start',finished.revision),/A sala mudou/);const started=await command(room,'start',next.revision);assert.equal(started.phase,'voting');assert.equal(started.activeElection.position,'Presidente');
});

test('invalid, expired and mismatched capabilities fail closed; public roles cannot read private demo data',async()=>{
 const room=await seed({});await assert.rejects(snap({room_token:crypto.randomUUID()}),/Sala indisponível/);
 await db.exec('set role anon');
 try {await assert.rejects(db.query('select * from ipnc_private.election_rooms'),/permission denied/);await assert.rejects(call('election_room_ensure',[crypto.randomUUID()]),/permission denied/);const state=await snap(room);assert.equal(state.phase,'waiting');}
 finally {await db.exec('reset role');}
 await db.query("update ipnc_private.election_rooms set expires_at=now()-interval '1 second' where id=$1",[room.room_id]);await assert.rejects(snap(room),/expirada/);await assert.rejects(command(room,'start',1),/Controle indisponível/);
});

test('real room is stable, next draft stays waiting, only its opening switches the persistent public link',async()=>{
 const id=crypto.randomUUID(),candidate=crypto.randomUUID(),next=crypto.randomUUID();
 await db.query("insert into elections(id,name,position,total_present,status) values($1,'Fictícia','Presidente',1,'open'),($2,'Fictícia','Vice',1,'draft')",[id,next]);
 await db.query("insert into election_candidates(id,election_id,name) values($1,$2,'Candidato fictício')",[candidate,id]);await db.query("insert into election_attendance(election_id,present,name) values($1,true,'Fictício'),($2,true,'Fictício')",[id,next]);
 const room=await call('election_room_ensure',[id]);assert.deepEqual(await call('election_room_ensure',[id]),room);
 const device=crypto.randomUUID(),ballot=crypto.randomUUID();await db.query('insert into election_votes(election_id,candidate_id,ballot_id,round_number,is_blank,device_id) values($1,$2,$3,1,false,$4)',[id,candidate,ballot,device]);
 let state=await snap(room,device);assert.equal(state.already_voted,true);assert.equal(state.published_result,null);
 await assert.rejects(call('election_room_attach',[room.room_token,id,next]),/Conclua o cargo/);
 await db.query("update elections set status='finished',show_result=true where id=$1",[id]);await call('election_room_attach',[room.room_token,id,next]);await call('election_room_attach',[room.room_token,id,next]);
 state=await snap(room);assert.equal(state.activeElection.id,id);assert.equal(state.phase,'result');
 await db.query("update elections set status='open' where id=$1",[next]);state=await snap(room,device);assert.equal(state.activeElection.id,next);assert.equal(state.phase,'voting');assert.equal(state.already_voted,false);assert.equal(state.count.ballots,0);
 const count=await call('election_public_count',[id]);assert.equal(count.ballots,1);assert.equal(count.current_round,1);
});

test('public count counts unique current-round ballots, including multiple marks, without leaking IDs',async()=>{
 const id=crypto.randomUUID();await db.query("insert into elections(id,name,position,total_present,status,current_round) values($1,'Fictícia','Teste',2,'open',2)",[id]);
 const old=crypto.randomUUID(),current=crypto.randomUUID();for(const [round,ballot] of [[1,old],[1,old],[2,current],[2,current]])await db.query('insert into election_votes(election_id,ballot_id,round_number,is_blank) values($1,$2,$3,true)',[id,ballot,round]);
 await db.exec('set role anon');try{assert.deepEqual(await call('election_public_count',[id]),{election_id:id,current_round:2,total_present:2,ballots:1});}finally{await db.exec('reset role');}
});

test('SQL aggregate has parity with existing majority, multi-seat cutoff, second-round tie and age rules',async()=>{
 const ids=Array.from({length:4},()=>crypto.randomUUID());
 const candidates=ids.map((id,i)=>({id,name:`Fictício ${i}`,birth_date:i===0?'1980-01-01':i===1?'1970-01-01':null}));
 const cases=[
  {seats:1,rules:'absolute_50',rounds:[[8,7,5,0]]},
  {seats:1,rules:'absolute_50',rounds:[[3,3,2,0]]},
  {seats:2,rules:'simple',rounds:[[6,4,4,1]]},
  {seats:2,rules:'absolute_50',rounds:[[7,4,4,0],[0,4,4,0]]},
  {seats:1,rules:'absolute_50',rounds:[[3,3,2,0],[4,4,0,0],[5,5,0,0]]},
  {seats:1,rules:'simple',rounds:[[1,0,0,0]]},
  {seats:1,rules:'absolute_50',rounds:[[0,0,0,0]]},
 ];
 for(const scenario of cases){
  const votes=[];scenario.rounds.forEach((counts,round)=>counts.forEach((amount,index)=>{for(let i=0;i<amount;i++){const ballot=crypto.randomUUID();votes.push({id:ballot,ballot_id:ballot,round_number:round+1,candidate_id:ids[index],is_blank:false});}}));
  const expected=calculateElectionRounds(votes,candidates,{seats_count:scenario.seats,current_round:scenario.rounds.length,majority_rule:scenario.rules});
  const actual=await call('ipnc_private.election_aggregate_rounds',[votes,candidates,scenario.seats,scenario.rounds.length,scenario.rules]);
  for(let i=0;i<expected.length;i++){
   assert.equal(actual[i].totalBallots,expected[i].totalBallots);assert.equal(actual[i].blankVotes,expected[i].blankVotes);assert.equal(actual[i].hasTie,expected[i].hasTie);
   assert.deepEqual([...actual[i].electedIds].sort(),[...expected[i].electedIds].sort());assert.deepEqual([...actual[i].rows].sort((a,b)=>a.candidate_id.localeCompare(b.candidate_id)),[...expected[i].rows].sort((a,b)=>a.candidate_id.localeCompare(b.candidate_id)));
  }
 }
 // One ballot can carry three selections: three marks never become three voters.
 const b=crypto.randomUUID(),marks=ids.slice(0,3).map(candidate_id=>({id:crypto.randomUUID(),ballot_id:b,round_number:1,candidate_id,is_blank:false}));
 const aggregate=await call('ipnc_private.election_aggregate_rounds',[marks,candidates,3,1,'absolute_50']);assert.equal(aggregate[0].totalBallots,1);assert.equal(aggregate[0].electedIds.length,3);
});

test('malformed candidate input, wrong election and completed-room mutations are refused without new ballots',async()=>{
 const room=await seed({});let state=await snap(room);state=await command(room,'start',state.revision);
 const args=[room.room_token,crypto.randomUUID(),state.activeElection.id,1,crypto.randomUUID(),[null],0];
 await assert.rejects(call('election_demo_cast',args),/Cédula inválida/);
 await assert.rejects(cast(room,crypto.randomUUID(),state.candidates[0].id),/A votação mudou/);
 assert.equal((await snap(room)).count.ballots,0);
 await db.query('update ipnc_private.election_rooms set completed=true where id=$1',[room.room_id]);
 assert.equal((await command(room,'snapshot',0)).phase,'finished');await assert.rejects(command(room,'start',state.revision),/já foi concluído/);
});

test('migration is repeatable, private tables stay inaccessible and function capabilities are narrowly granted',async()=>{
 const before=(await db.query('select count(*)::int n from ipnc_private.election_demo_ballots')).rows[0].n;await db.exec(migration);
 assert.equal((await db.query('select count(*)::int n from ipnc_private.election_demo_ballots')).rows[0].n,before);
 const functions=await db.query("select proname,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where proname like 'election_room_%' or proname in ('election_demo_cast','election_demo_command','election_public_count')");
 for(const fn of functions.rows)assert.deepEqual(fn.proconfig,['search_path=""']);
 assert.equal((await db.query("select has_function_privilege('anon','public.election_room_ensure(uuid)','execute') as allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select has_function_privilege('anon','ipnc_private.create_election_demo(text,integer,jsonb)','execute') as allowed")).rows[0].allowed,false);
});

test('urn capability permits successive synthetic participants but never controls the mesário or exceeds capacity',async()=>{
 const room=await seed({Alfa:59,Beta:55,Gama:34});const state=await snap(room);const alfa=state.candidates.find(c=>c.name==='Alfa').id,gama=state.candidates.find(c=>c.name==='Gama').id;
 assert.equal(JSON.stringify(state).includes(room.urn_token),false);assert.equal((await command(room,'snapshot',0)).urn_token,room.urn_token);
 await assert.rejects(call('election_demo_command',[room.urn_token,'next_round',state.revision,{}]),/Controle indisponível/);
 const ballot=crypto.randomUUID();const args=[room.urn_token,state.activeElection.id,1,ballot,[alfa],0];
 await call('election_demo_urn_cast',args);await call('election_demo_urn_cast',args);assert.equal((await snap(room)).count.ballots,149);
 await cast(room,state.activeElection.id,gama);assert.equal((await snap(room)).count.ballots,150);
 await assert.rejects(call('election_demo_urn_cast',[room.urn_token,state.activeElection.id,1,crypto.randomUUID(),[alfa],0]),/Todos os presentes/);
 await assert.rejects(call('election_demo_urn_cast',[room.room_token,state.activeElection.id,1,crypto.randomUUID(),[alfa],0]),/Urna indisponível/);
});

test('an authenticated but unrelated account cannot create a real room capability',async()=>{
 const id=(await db.query('select id from elections limit 1')).rows[0].id;
 await db.query("select set_config('test.actor',$1,false)",[crypto.randomUUID()]);await db.exec('set role authenticated');
 try{await assert.rejects(call('election_room_ensure',[id]),/Não autorizado/);}finally{await db.exec('reset role');await db.query("select set_config('test.actor',$1,false)",[manager]);}
});
