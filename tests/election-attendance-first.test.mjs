import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';

const file='src/pages/EleicaoDetalhe.tsx';
const source=ts.createSourceFile(file,readFileSync(new URL('../'+file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declarations=new Map();let resetEffect;
function visit(node){
  if(ts.isVariableDeclaration(node)&&node.initializer)declarations.set(node.name.getText(source),node.initializer.getText(source));
  if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[0].getText(source).includes('setActiveStep(null)'))resetEffect=node.arguments[0].getText(source);
  ts.forEachChild(node,visit);
}
visit(source);
function workflow(overrides={}){
  const context={useMemo:fn=>fn(),candidates:[],attendance:[],devices:[],showDevices:true,electionType:'cargo',election:{status:'draft',total_present:0},activeStep:null,...overrides};
  const names=['currentRound','nominationsOpen','currentCandidates','completion','steps','autoCurrentIndex','selectedIndex','currentStepKey','currentIndex','handleStepClick'];
  let selected=context.activeStep;
  context.setActiveStep=value=>{selected=value;};
  vm.runInNewContext(ts.transpileModule(names.map(name=>`var ${name}=${declarations.get(name)};`).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  return {...context,selected:()=>selected};
}
const present=[{id:'person-fictional',present:true}];

test('unconfirmed or changed attendance blocks existing candidates and later steps; confirmation unlocks the next task',()=>{
  for(const election of [{status:'draft',total_present:0},{status:'draft',total_present:2}]){
    const current=workflow({election,attendance:present,candidates:[{id:'existing-candidate'}],devices:[{id:'existing-urn'}],activeStep:'candidatos'});
    assert.equal(current.currentStepKey,'presenca');
    current.handleStepClick(1);assert.equal(current.selected(),'candidatos','rejected click must not replace stored selection');
    current.handleStepClick(3);assert.equal(current.selected(),'candidatos');
    assert.equal(current.autoCurrentIndex,0);
  }
  const confirmed=workflow({election:{status:'draft',total_present:1},attendance:present});
  assert.equal(confirmed.currentStepKey,'candidatos');
  confirmed.handleStepClick(0);assert.equal(confirmed.selected(),'presenca');
  const reviewed=workflow({election:{status:'draft',total_present:1},attendance:present,activeStep:'presenca'});
  reviewed.handleStepClick(1);assert.equal(reviewed.selected(),'candidatos');
  reviewed.handleStepClick(2);assert.equal(reviewed.selected(),'candidatos','urn configuration remains behind candidates');
});

test('navigating to a new cargo clears the old selected step and honors its copied, confirmed attendance',()=>{
  assert.ok(resetEffect,'ID navigation must reset manual step selection');
  let selected='votacao',fetched=0;
  const context={setActiveStep:value=>{selected=value;},fetchAll:()=>{fetched++;}};
  vm.runInNewContext(ts.transpileModule(`(${resetEffect})();`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  assert.equal(selected,null);assert.equal(fetched,1);
  const next=workflow({activeStep:selected,election:{id:'new-cargo',status:'draft',total_present:1},attendance:present});
  assert.equal(next.currentStepKey,'candidatos','a copied valid call does not require re-entering attendance');
  const newElection=workflow({activeStep:selected,election:{id:'new-election',status:'draft',total_present:0}});
  assert.equal(newElection.currentStepKey,'presenca');
});

test('rendered stepper disables later completed steps until attendance is confirmed, and permits returning to unlocked steps',()=>{
  const require=createRequire(import.meta.url);const exports={};
  const text=readFileSync(new URL('../src/components/eleicoes/ElectionStepper.tsx',import.meta.url),'utf8');
  vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>id==='lucide-react'?{Check:()=>null}:id==='@/lib/utils'?{cn:(...args)=>args.filter(Boolean).join(' ')}:require(id)});
  const steps=workflow().steps;
  const buttons=maxAvailableIndex=>Array.from(renderToStaticMarkup(exports.ElectionStepper({steps,currentIndex:0,maxAvailableIndex,completed:{presenca:false,candidatos:true,dispositivos:true},onStepClick(){}})).matchAll(/<button\b[^>]*>/g),match=>match[0].includes('disabled'));
  assert.deepEqual(buttons(0),[false,true,true,true]);
  assert.deepEqual(buttons(1),[false,false,true,true]);
});


test('a new scrutiny preserves confirmed attendance but requires fresh nominations and an explicit start',()=>{
 const election={id:'same-election',status:'open',current_round:2,total_present:1,nominations_open:true};
 const old={id:'old-nominee',nomination_round:1};
 const preparing=workflow({election,attendance:present,candidates:[old],devices:[{id:'preserved-urn'}],activeStep:'votacao'});
 assert.equal(preparing.completion.presenca,true,'the previously confirmed call remains valid');
 assert.equal(preparing.currentCandidates.length,0,'historical nominees cannot satisfy the new nomination step');
 assert.equal(preparing.completion.candidatos,false);assert.equal(preparing.completion.votacao,false);
 assert.equal(preparing.currentStepKey,'candidatos','the open status must not bypass a nomination phase');
 preparing.handleStepClick(3);assert.equal(preparing.selected(),'votacao','a premature start-step click cannot unlock nomination requirements');
 const nominated=workflow({election,attendance:present,candidates:[old,{id:'new-nominee',nomination_round:2}],devices:[{id:'preserved-urn'}],activeStep:'candidatos'});
 assert.equal(nominated.currentCandidates.length,1);assert.equal(nominated.completion.candidatos,true);
 assert.equal(nominated.currentStepKey,'candidatos','saving the first nomination must not auto-advance or start voting');
 assert.equal(nominated.completion.votacao,false);
 nominated.handleStepClick(3);assert.equal(nominated.selected(),'votacao','the organizer may explicitly proceed after nominations');
 const started=workflow({election:{...election,nominations_open:false},attendance:present,candidates:[old,{id:'new-nominee',nomination_round:2}],devices:[{id:'preserved-urn'}],activeStep:'votacao'});
 assert.equal(started.completion.votacao,true);assert.equal(started.currentStepKey,'votacao');
});
