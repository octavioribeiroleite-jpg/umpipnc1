import test from 'node:test';
import assert from 'node:assert/strict';
import { React,TestRenderer,act,flush,deferred,button,textOf,mountedEnvironment } from './fixtures/election-mount.mjs';
import { reconcileElectionCount,requireElectionCount } from '../src/lib/election-completion.ts';
function count(status='finished') {return reconcileElectionCount({id:'fixture',name:'Eleição fictícia',society_id:'society',status,current_round:1,total_present:1,voting_mode:'individual',type:'cargo'},[{id:'person',name:'Pessoa fictícia',present:true}],[{id:'vote',ballot_id:'ballot',round_number:1,candidate_id:'candidate',is_blank:false}]);}
const candidates=[{id:'candidate',name:'Candidato fictício',photo_url:null}];

test('mounted next-election dialog retains its trigger, editable draft and action through multiple slow polling cycles',async()=>{
 let request=()=>Promise.resolve(count()),calls=0;
 const env=mountedEnvironment({modules:{'@/lib/election-completion':{readElectionCount:()=>{calls++;return request();},requireElectionCount}}});
 const Component=env.load('src/components/eleicoes/NextElectionDialog.tsx').NextElectionDialog;let tree;
 await act(async()=>{tree=TestRenderer.create(React.createElement(Component,{election:count().election,attendance:count().attendance}));await flush();});
 const trigger=button(tree,'Nova votação com esta chamada');assert.ok(trigger);assert.equal(trigger.props.disabled,false);
 const pending=deferred();request=()=>pending.promise;
 await act(async()=>{await env.advance(12000);});
 assert.equal(calls,2,'slow polls must coalesce instead of overlapping');
 assert.equal(button(tree,'Nova votação com esta chamada'),trigger,'background refresh must not replace the trigger');
 assert.equal(trigger.props.disabled,false);
 await act(async()=>{trigger.props.onClick();await flush();});
 const input=tree.root.findByProps({id:'next-election-position'});
 await act(async()=>{input.props.onChange({target:{value:'Cargo fictício digitado'}});});
 const submit=button(tree,'Criar e reaproveitar chamada');assert.equal(submit.props.disabled,false);
 await act(async()=>{pending.resolve(count());await flush();});
 assert.equal(tree.root.findByProps({id:'next-election-position'}),input);
 assert.equal(input.props.value,'Cargo fictício digitado');assert.equal(env.mounts.dialog,1);
 const failure=deferred();request=()=>failure.promise;
 await act(async()=>{await env.advance(3000);failure.reject(new Error('offline fixture'));await flush();});
 assert.equal(button(tree,'Criar e reaproveitar chamada').props.disabled,true);
 assert.equal(input.props.value,'Cargo fictício digitado');assert.equal(env.mounts.dialog,1);
 request=()=>Promise.resolve(count());await act(async()=>{await env.advance(3000);});
 assert.equal(button(tree,'Criar e reaproveitar chamada').props.disabled,false);
 await act(async()=>tree.unmount());assert.equal(env.timerCount(),0);
});

test('mounted voting panel keeps Concluir and its confirmation mounted during slow polls; actual errors disable action',async()=>{
 let request=()=>Promise.resolve(count('open'));
 const env=mountedEnvironment({modules:{'@/lib/election-completion':{readElectionCount:()=>request(),requireElectionCount}}});
 const Component=env.load('src/components/eleicoes/VotingPanel.tsx').VotingPanel;let tree;
 await act(async()=>{tree=TestRenderer.create(React.createElement(Component,{electionId:'fixture',status:'open',totalPresent:1,votingMode:'individual',devices:[],candidates,election:{current_round:1,seats_count:1,majority_rule:'simple'},onRefresh(){}}));await flush();});
 await act(async()=>{button(tree,'Apurar resultado').props.onClick();await flush();});
 await act(async()=>{button(tree,'Confirmar resultado e avançar').props.onClick();await flush();});
 const finish=button(tree,'Concluir');assert.ok(finish);assert.equal(finish.props.disabled,false);
 await act(async()=>{finish.props.onClick();});
 const confirmation=button(tree,'Confirmar');assert.equal(confirmation.props.disabled,false);
 const pending=deferred();request=()=>pending.promise;
 await act(async()=>{await env.advance(12000);});
 assert.equal(button(tree,'Concluir'),finish);assert.equal(finish.props.disabled,false);
 assert.equal(button(tree,'Confirmar'),confirmation);assert.equal(confirmation.props.disabled,false);assert.equal(env.mounts.dialog,1);
 await act(async()=>{pending.reject(new Error('offline fixture'));await flush();});
 assert.equal(button(tree,'Concluir'),finish);assert.equal(finish.props.disabled,true);assert.equal(button(tree,'Confirmar').props.disabled,true);
 request=()=>Promise.resolve(count('open'));await act(async()=>{await env.advance(3000);});assert.equal(finish.props.disabled,false);
 await act(async()=>tree.unmount());assert.equal(env.timerCount(),0);
});

test('mounted result cards keep their verified winner while a realtime refresh is pending, and suppress validity on failure',async()=>{
 let request=()=>Promise.resolve(count());
 const env=mountedEnvironment({modules:{'@/lib/election-completion':{readElectionCount:()=>request()}}});
 const Component=env.load('src/components/eleicoes/ResultPanel.tsx').ResultPanel;let tree;
 await act(async()=>{tree=TestRenderer.create(React.createElement(Component,{electionId:'fixture',totalPresent:1,candidates,election:{current_round:1,seats_count:1,majority_rule:'simple'}}));await flush();});
 const winner=tree.root.findAllByProps({'aria-label':'Eleito: Candidato fictício'})[0];assert.ok(winner);
 const pending=deferred();request=()=>pending.promise;
 await act(async()=>{env.channels[0].handlers[0].callback();await flush();});
 assert.equal(tree.root.findAllByProps({'aria-label':'Eleito: Candidato fictício'})[0],winner);
 await act(async()=>{pending.reject(new Error('offline fixture'));await flush();});
 assert.equal(tree.root.findAllByProps({'aria-label':'Eleito: Candidato fictício'}).length > 0,false);
 assert.match(textOf(tree.root),/Contagem não conferida/);
 await act(async()=>tree.unmount());
});

test('mounted public ballot keeps its candidate confirmation across focus refresh and resets it only for a new round',async()=>{
 let gate=null;let round=1;
 const query=table=>{const chain={select(){return chain;},eq(){return chain;},order(){return chain;},single(){return chain;},async then(resolve){if(gate)await gate.promise;return resolve({data:table==='elections'?{...count('open').election,current_round:round,max_choices_per_ballot:1,seats_count:1}:candidates,error:null});}};return chain;};
 const env=mountedEnvironment({client:{from:query,functions:{invoke:async(_,options)=>({data:options.body.action==='history'?{votes:[]}:{count:0},error:null})}}});
 const Component=env.load('src/pages/VotePublic.tsx').default;let tree;
 await act(async()=>{tree=TestRenderer.create(React.createElement(Component));await flush();});
 const choice=tree.root.findAllByType('button').find(node=>node.props['aria-label']==='Votar em Candidato fictício');assert.ok(choice);
 await act(async()=>{choice.props.onClick();await flush();});
 const confirm=button(tree,'CONFIRMAR');assert.ok(confirm);
 gate=deferred();await act(async()=>{env.browser.dispatchEvent(new Event('pageshow'));await flush();});
 assert.equal(button(tree,'CONFIRMAR'),confirm,'same-election refresh cannot replace the ballot with a spinner');
 await act(async()=>{gate.resolve();await flush();});assert.equal(button(tree,'CONFIRMAR'),confirm);
 gate=null;round=2;await act(async()=>{env.browser.dispatchEvent(new Event('pageshow'));await flush();});assert.equal(button(tree,'CONFIRMAR'),undefined);
 await act(async()=>tree.unmount());
});

test('mounted election wizard retains candidate entry until explicit advance, skips urns only after mode save, and resets scope on the next cargo',async()=>{
 let election={...count('draft').election,voting_mode:'both'},names=[];let entryProps;
 function CandidateEntry(props){entryProps=props;const [draft,setDraft]=React.useState('');return React.createElement('input',{id:'candidate-draft',value:draft,onChange:event=>setDraft(event.target.value)});}
 const query=table=>{let patch;const chain={select(){return chain;},eq(){return chain;},order(){return chain;},single(){return chain;},update(value){patch=value;return chain;},async then(resolve){if(patch)election={...election,...patch};return resolve({data:table==='elections'?{...election}:table==='election_attendance'?count().attendance:table==='election_candidates'?[...names]:[],error:null});}};return chain;};
 const stub=()=>null;
 const env=mountedEnvironment({client:{from:query},modules:{
  '@/components/eleicoes/CandidateForm':{CandidateForm:CandidateEntry},'@/components/eleicoes/AttendanceList':{AttendanceList:stub},
  '@/components/eleicoes/DeviceRegistration':{DeviceRegistration:stub},'@/components/eleicoes/VotingPanel':{VotingPanel:()=>React.createElement('p',{},'Voting reached')},
  '@/components/eleicoes/ResultPanel':{ResultPanel:stub},'@/components/eleicoes/NextElectionDialog':{NextElectionDialog:stub},
 }});
 const Component=env.load('src/pages/EleicaoDetalhe.tsx').default;let tree;
 await act(async()=>{tree=TestRenderer.create(React.createElement(Component));await flush();});
 const entry=tree.root.findByProps({id:'candidate-draft'});assert.equal(entryProps.disabled,false);
 await act(async()=>{entry.props.onChange({target:{value:'Second candidate draft'}});names=[...candidates];await entryProps.onRefresh();await flush();});
 assert.equal(tree.root.findByProps({id:'candidate-draft'}),entry);assert.equal(entry.props.value,'Second candidate draft');
 assert.ok(button(tree,'Avançar: Dispositivos Fixos'));assert.equal(button(tree,'Usar apenas celulares'),undefined);
 await act(async()=>{button(tree,'Avançar: Dispositivos Fixos').props.onClick();});
 await act(async()=>{button(tree,'Usar apenas celulares').props.onClick();await flush();});
 assert.equal(election.voting_mode,'individual');assert.match(textOf(tree.root),/Voting reached/);
 election={...election,id:'next-cargo'};names=[];env.route.id='next-cargo';
 await act(async()=>{tree.update(React.createElement(Component));await flush();});
 assert.equal(entryProps.electionId,'next-cargo');assert.equal(tree.root.findByProps({id:'candidate-draft'}).props.value,'');
 assert.doesNotMatch(textOf(tree.root),/Voting reached/);
 await act(async()=>tree.unmount());
});

test('mounted voting panel ignores a previous round response delivered after a new scope is verified',async()=>{
 let request=()=>Promise.resolve(count('open'));
 const env=mountedEnvironment({modules:{'@/lib/election-completion':{readElectionCount:()=>request(),requireElectionCount}}});
 const Component=env.load('src/components/eleicoes/VotingPanel.tsx').VotingPanel;
 const props={electionId:'fixture',status:'open',totalPresent:1,votingMode:'individual',devices:[],candidates,onRefresh(){}};
 let tree;await act(async()=>{tree=TestRenderer.create(React.createElement(Component,{...props,election:{current_round:1,seats_count:1,majority_rule:'simple'}}));await flush();});
 const old=deferred();request=()=>old.promise;await act(async()=>{await env.advance(3000);});
 const next=reconcileElectionCount({...count('open').election,current_round:2},count().attendance,[]);
 request=()=>Promise.resolve(next);
 await act(async()=>{tree.update(React.createElement(Component,{...props,election:{current_round:2,seats_count:1,majority_rule:'simple'}}));await flush();});
 assert.match(textOf(tree.root),/Falta/);assert.equal(button(tree,'Apurar resultado'),undefined);
 await act(async()=>{old.resolve(count('open'));await flush();});
 assert.match(textOf(tree.root),/Falta/);assert.doesNotMatch(textOf(tree.root),/A sala mudou/);assert.equal(button(tree,'Apurar resultado'),undefined);
 await act(async()=>tree.unmount());assert.equal(env.timerCount(),0);
});


test('result presentation distinguishes a 40 percent first-round leader from a second-round simple-majority winner', async () => {
 const voters=Array.from({length:20},(_,index)=>({id:`person-${index}`,name:`Pessoa fictícia ${index}`,present:true}));
 const candidateRows=[{id:'a',name:'Alfa',photo_url:null},{id:'b',name:'Beta',photo_url:null},{id:'c',name:'Gama',photo_url:null}];
 let round=1;
 const votes=()=>[8,7,5].flatMap((total,index)=>Array.from({length:total},(_,vote)=>({id:`vote-${index}-${vote}`,ballot_id:`ballot-${index}-${vote}`,candidate_id:candidateRows[index].id,round_number:round,is_blank:false})));
 const snapshot=()=>reconcileElectionCount({...count().election,total_present:20,current_round:round},voters,votes());
 const env=mountedEnvironment({modules:{'@/lib/election-completion':{readElectionCount:async()=>snapshot()}}});
 const Component=env.load('src/components/eleicoes/ResultPanel.tsx').ResultPanel;
 const props=()=>({electionId:'fixture',totalPresent:20,candidates:candidateRows,election:{current_round:round,seats_count:1,majority_rule:'absolute_50'}});
 let tree; await act(async()=>{tree=TestRenderer.create(React.createElement(Component,props()));await flush();});
 assert.match(textOf(tree.root),/Líder sem maioria absoluta/);
 assert.equal(tree.root.findAllByProps({'aria-label':'Eleito: Alfa'}).length,0);
 assert.match(textOf(tree.root),/11 votos/);
 round=2;await act(async()=>{tree.update(React.createElement(Component,props()));await flush();});
 assert.equal(tree.root.findAllByProps({'aria-label':'Eleito: Alfa'}).length,1);
 assert.match(textOf(tree.root),/Maioria simples entre os candidatos classificados/);
 assert.doesNotMatch(textOf(tree.root),/Líder sem maioria absoluta/);
 await act(async()=>tree.unmount());
});
