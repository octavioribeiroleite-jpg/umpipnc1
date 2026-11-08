import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { reconcileElectionCount, readElectionCount, requireElectionCount } from '../src/lib/election-completion.ts';

const election = { id: 'fixture', status: 'open', current_round: 1, total_present: 16, society_id: 'fixture-society' };
const attendance = count => Array.from({length: count}, (_, index) => ({ id: `a${index}`, name: `Pessoa fictícia ${index}`, present: true }));
const ballots = (count, choices = 1, round = 1) => Array.from({length:count}, (_, ballot) => Array.from({length:choices}, (_, choice) => ({ id:`r${round}b${ballot}c${choice}`, ballot_id:`r${round}b${ballot}`, round_number:round, candidate_id:`c${choice}`, is_blank:false }))).flat();
const snapshot = (count, present = 16, confirmed = 16, choices = 1) => reconcileElectionCount({ ...election, total_present:confirmed }, attendance(present), ballots(count, choices));
function handler(file, name, context) {
  const source = ts.createSourceFile(file, readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) declaration = node; ts.forEachChild(node, visit); };
  visit(source); assert.ok(declaration?.initializer);
  const sandbox = { ...context };
  vm.runInNewContext(ts.transpileModule(`globalThis.handler = ${declaration.initializer.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  return sandbox.handler;
}

test('exact count accepts 100% only, preserving negative differences for surplus and counting ballot UUIDs once', () => {
  for (const choices of [1,3]) for (const count of [0,15,16,17]) {
    const current = snapshot(count,16,16,choices);
    assert.equal(current.ballots,count); assert.equal(current.votes.length,count*choices);
    assert.equal(current.exact,count===16); assert.equal(current.difference,16-count);
    if(count<16) assert.match(current.issue,/Faltam/);
    if(count>16) assert.match(current.issue,/excedente/);
    if(count===16) assert.doesNotThrow(()=>requireElectionCount(current,{status:'open',round:1}));
    else assert.throws(()=>requireElectionCount(current,{status:'open',round:1}));
  }
});

test('attendance mismatch, zero quorum, corrupt identifiers and stale round/status fail closed', () => {
  for (const current of [snapshot(15,15,16),snapshot(16,16,15),snapshot(0,0,0)]) assert.equal(current.exact,false);
  const corrupt=ballots(16); delete corrupt[0].ballot_id;
  assert.equal(reconcileElectionCount(election,attendance(16),corrupt).exact,false);
  const twoRounds=reconcileElectionCount({...election,current_round:2},attendance(16),[...ballots(16,3,1),...ballots(15,3,2)]);
  assert.equal(twoRounds.ballots,15); assert.equal(twoRounds.exact,false);
  assert.throws(()=>requireElectionCount(snapshot(16),{status:'finished',round:1}));
  assert.throws(()=>requireElectionCount(snapshot(16),{status:'open',round:2}));
  const draft={...snapshot(0),election:{...election,status:'draft'}};
  assert.doesNotThrow(()=>requireElectionCount(draft,{status:'draft',round:1,action:'start'}));
  assert.throws(()=>requireElectionCount({...snapshot(1),election:{...election,status:'draft'}},{status:'draft',round:1,action:'start'}));
});

test('fresh reads paginate every candidate row and attendance row; a second-page failure or changing round blocks', async () => {
  for (const scenario of ['success','page-error','changed']) {
    let electionReads=0, maxPage=0;
    const client={from(table){let from=0,to=999;const query={select(){return query;},eq(){return query;},order(){return query;},single(){return query;},range(start,end){from=start;to=end;return query;},then(resolve){
      if(table==='elections'){electionReads++; return Promise.resolve({data:{...election,total_present:1200,current_round:scenario==='changed'&&electionReads>1?2:1},error:null}).then(resolve);}
      maxPage=Math.max(maxPage,from);
      if(scenario==='page-error'&&from>=1000)return Promise.resolve({data:null,error:new Error('isolated read failure')}).then(resolve);
      return Promise.resolve({data:(table==='election_attendance'?attendance(1200):ballots(1200,3)).slice(from,to+1),error:null}).then(resolve);
    }};return query;}};
    if(scenario==='success'){const result=await readElectionCount(client,'fixture');assert.equal(result.exact,true);assert.equal(result.ballots,1200);assert.equal(result.votes.length,3600);assert.equal(maxPage,3000);}
    else await assert.rejects(readElectionCount(client,'fixture'));
  }
});

test('actual apuration, finish and runoff handlers recheck counts at click time and write nothing for missing/excess/error', async () => {
  for (const action of ['handleCountedPhase','handleFinish','handleNextRound']) for (const result of ['missing','extra','attendance','error','exact']) {
    let writes=0, changedPhase=false, refreshed=false; const messages=[];
    const fresh=result==='extra'?snapshot(17):result==='missing'?snapshot(15):result==='attendance'?snapshot(15,15,16):snapshot(16);
    const checkCurrentCount=async()=>{if(result==='error')throw new Error('isolated read failure');return requireElectionCount(fresh,{status:'open',round:1});};
    const query={update(){writes++;return query;},eq(){return query;},select(){return query;},single:async()=>({data:{id:'fixture'},error:null})};
    await handler('src/components/eleicoes/VotingPanel.tsx',action,{
      checkCurrentCount,actionRef:{current:false},loading:false,status:'open',currentRound:1,electionId:'fixture',seatsCount:1,majorityRule:'absolute_50',candidates:[{id:'c0'}],
      setLoading(){},setPhase(){changedPhase=true;},setConfirmAction(){},supabase:{from:()=>query},onRefresh(){refreshed=true;},toast:message=>messages.push(message),
    })('apurando');
    if(result==='exact'){assert.equal(action==='handleCountedPhase'?changedPhase:refreshed,true);assert.equal(writes,action==='handleCountedPhase'?0:1);}
    else {assert.equal(writes,0);assert.equal(changedPhase,false);assert.equal(refreshed,false);assert.equal(messages[0].variant,'destructive');}
  }
});

test('next cargo rechecks a finished source and creates no draft on missing, surplus or failed reads', async () => {
  for(const result of ['missing','extra','error']){
    let planned=false,saved=false,error='';
    await handler('src/components/eleicoes/NextElectionDialog.tsx','create',{
      readRevision:{current:0},setChecking(){},inFlight:{current:false},user:{id:'organizer'},setBusy(){},setError:value=>{error=value;},setCount(){},setCountError(){},
      readElectionCount:async()=>{if(result==='error')throw new Error('isolated read failure');const fresh=snapshot(result==='missing'?15:17);fresh.election.status='finished';return fresh;},
      requireElectionCount,election:{...election,status:'finished'},plan:{current:null},sourceIds:{current:[]},planNextElection(){planned=true;},saveNextElection(){saved=true;},supabase:{},
    })();
    assert.equal(planned,false);assert.equal(saved,false);assert.ok(error);
  }
});

test('historical result badges retain a verified snapshot during refresh and reject divergence or failed reads', () => {
  const resultFile='src/components/eleicoes/ResultPanel.tsx';
  for(const [count,readError,loading] of [[15,false,false],[17,false,false],[16,true,false],[16,false,true],[16,false,false]]){
    const countVerified=handler(resultFile,'countVerified',{countSnapshot:snapshot(count),readError,loading,current_round:1,totalPresent:16});
    assert.equal(countVerified,count===16&&!readError);
    const roundResults=[{electedIds:['candidate-fictional']}];
    const elected=handler(resultFile,'allElected',{countVerified,roundResults});
    assert.equal(elected.length,countVerified?1:0);assert.deepEqual(roundResults,[{electedIds:['candidate-fictional']}]);
  }
});
