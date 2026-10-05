import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { jsPDF as RealPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as queueDomain from '../src/lib/ebd-attendance-queue.ts';
const { createAttendanceQueue, assertAttendanceConfirmed } = queueDomain;
const version = () => queueDomain.captureEbdSnapshot();
let saved = [];
class CapturedPDF extends RealPDF {
  constructor() {
    super(); this.capturedText=[];
    const originalText=this.text.bind(this);
    this.text=(text,...args)=>{this.capturedText.push(String(text));return originalText(text,...args);};
    this.save=name=>{saved.push({name,text:this.capturedText,bytes:Buffer.from(this.output('arraybuffer'))});return this;};
  }
}
globalThis.__pdfSnapshot={jsPDF:CapturedPDF,format,ptBR,logoBase64:'',assertAttendanceConfirmed,assertEbdSnapshotCurrent:queueDomain.assertEbdSnapshotCurrent};
const pdfSource=readFileSync(new URL('../src/utils/generateEbdPDF.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const pdfCompiled=ts.transpileModule('const {jsPDF,format,ptBR,logoBase64,assertAttendanceConfirmed,assertEbdSnapshotCurrent}=globalThis.__pdfSnapshot;\n'+pdfSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const pdf=await import('data:text/javascript;base64,'+Buffer.from(pdfCompiled).toString('base64'));
const date='2026-10-04', pupil={id:'pupil',class_id:'class-a'}, group={id:'class-a',name:'Turma sintética',order_index:0};
const row=present=>({id:'persisted',student_id:pupil.id,class_id:pupil.class_id,date,present});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(t) {
 let resolve;
 const queue=createAttendanceQueue({save:()=>new Promise(done=>{resolve=done;}),read:async()=>row(true),onConfirmed:()=>{}});
 t.after(async()=>{queue.dispose();resolve?.(row(true));await tick();});
 return {queue,confirm:async()=>{resolve(row(true));await tick();}};
}
function reports(snapshotVersion,present) {
 const count=present?1:0;
 const day={date,present:count,total:1,percentage:count*100,visitorCount:0};
 return [
  ['day',()=>pdf.generateEbdAttendancePDF({snapshotVersion,classes:[group],students:[{...pupil,name:'Aluno sintético'}],attendance:[row(present)],date,formattedDate:'04 de outubro de 2026'})],
  ['period',()=>pdf.generateEbdPeriodPDF({snapshotVersion,periodLabel:'Período sintético',days:[day],classes:[{name:group.name,totalPresent:count,avgPercentage:count*100}]})],
  ['quarter',()=>pdf.generateEbdQuarterlyPDF({snapshotVersion,periodLabel:'Trimestre sintético',days:[day],classesDetail:[{name:group.name,totalPresent:count,avgPercentage:count*100,totalVisitors:0,days:[{...day,visitorNames:[]}],students:[{name:'Aluno sintético',present:count,total:1,percentage:count*100}]}]})],
 ];
}
beforeEach(()=>{saved=[];});
for(const kind of ['day','period','quarter']) {
 test(`${kind} PDF blocks an active write before creating any file`,async t=>{
  const h=harness(t);const snapshotVersion=version();h.queue.submit(pupil,date,true);
  assert.throws(reports(snapshotVersion,false).find(([name])=>name===kind)[1],/aguardando confirmação|dados.*mudaram/i);
  assert.equal(saved.length,0);
 });
 for(const when of ['before','during']) test(`${kind} PDF refuses a stale snapshot read ${when} the write, even after the queue empties`,async t=>{
  const h=harness(t);let snapshotVersion;
  if(when==='before')snapshotVersion=version();
  h.queue.submit(pupil,date,true);
  if(when==='during')snapshotVersion=version();
  await h.confirm();
  assert.equal(h.queue.hasPending(),false);
  assert.throws(reports(snapshotVersion,false).find(([name])=>name===kind)[1],/dados.*mudaram/i);
  assert.equal(saved.length,0,'A stale report must never reach jsPDF.save');
 });
 test(`${kind} PDF read after confirmation keeps existing totals and produces PDF bytes in memory`,async t=>{
  const h=harness(t);h.queue.submit(pupil,date,true);await h.confirm();
  reports(version(),true).find(([name])=>name===kind)[1]();
  assert.equal(saved.length,1);assert.equal(saved[0].bytes.subarray(0,5).toString(),'%PDF-');
  assert.ok(saved[0].text.includes('100%'),'Confirmed 1/1 must remain 100%');
  assert.ok(saved[0].text.some(text=>text.includes('Turma sintética')));
 });
}

// Execute the actual upstream read/handler bodies with controlled database reads.
// React rendering is outside this test; calculations and PDF functions are real.
import { buildDayRoster, buildDayClasses } from '../src/lib/ebd-roster.ts';
import { subWeeks, subMonths } from 'date-fns';
const sourceHistory=readFileSync(new URL('../src/components/secretaria/HistoricoTab.tsx',import.meta.url),'utf8');
function historyFunction(name,scope,memo=false) {
 const source=ts.createSourceFile('HistoricoTab.tsx',sourceHistory,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let initializer;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)initializer=node.initializer;ts.forEachChild(node,visit);};visit(source);
 assert.ok(initializer,`Actual ${name} must exist`);
 if(memo)initializer=initializer.arguments[0];
 const text=ts.transpileModule('return ('+initializer.getText(source)+');',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function(...Object.keys(scope),text)(...Object.values(scope));
}
function historyHelper(name) {
 const source=ts.createSourceFile('HistoricoTab.tsx',sourceHistory,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const declaration=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 assert.ok(declaration, `Actual ${name} must exist`);
 const compiled=ts.transpileModule(declaration.getText(source)+'\nreturn '+name+';', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function('buildDayRoster',compiled)(buildDayRoster);
}
const filterHistoryDays=historyHelper('filterHistoryDays');
const historyStudentStats=historyHelper('historyStudentStats');

function deferred() {let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
function readBackend() {
 const state={attendance:[row(false)],heldTable:null,hold:null};
 const pupils=[{...pupil,name:'Aluno sintético',active:true,created_at:'2026-01-01T12:00:00Z'}];
 const groups=[{...group,active:true}];
 const supabase={from(table){let single=false;
  const read=async()=>{
   const data={ebd_attendance:state.attendance.map(value=>({...value})),ebd_students:pupils,ebd_classes:groups,ebd_day_closures:[],ebd_call_status:[{class_id:pupil.class_id,date,status:'aberta',changed_by:'Administrador'}],ebd_class_visitor_entries:[],ebd_class_visitors:[]}[table];
   if(state.heldTable===table&&state.hold)await state.hold.promise;
   return {data:single?(data?.[0]??null):data,error:null};
  };
  const chain={select(){return chain;},order(){return chain;},eq(){return chain;},gte(){return chain;},maybeSingle(){single=true;return chain;},range(){return read();},then(resolve,reject){return read().then(resolve,reject);}};
  return chain;
 }};
 return {state,supabase,pupils,groups};
}
function historyHarness(backend) {
 const model={historySnapshotVersion:null,historyStudents:[],historyClasses:[],otherDates:[],callActors:[],historyVisitors:[],allAttendance:[],closures:[],historyError:false,loading:true};
 const reportScope={current:{sessionScope:'synthetic-admin',active:true}};
 const isReportScopeCurrent=scope=>reportScope.current.active&&reportScope.current.sessionScope===scope;
 const common={sessionScope:'synthetic-admin',reportScope,isReportScopeCurrent,supabase:backend.supabase,requestId:{current:0},period:'all',format,subWeeks,subMonths,captureEbdSnapshot:queueDomain.captureEbdSnapshot};
 for(const key of Object.keys(model))common['set'+key[0].toUpperCase()+key.slice(1)]=value=>{model[key]=value;};
 const fetchHistory=historyFunction('fetchHistory',common);
 const days=()=>historyFunction('dayRecords',{...model,buildDayRoster,buildDayClasses},true)();
 const messages=[];
 const handler=name=>historyFunction(name,{
  ...model,sessionScope:'synthetic-admin',reportScope,isReportScopeCurrent,dayRecords:days(),filteredDayRecords:days(),historyStudentStats,students:backend.pupils,classes:backend.groups,supabase:backend.supabase,
  period:'all',periodLabel:'Período sintético',fetchHistory,assertEbdSnapshotCurrent:queueDomain.assertEbdSnapshotCurrent,
  EbdSnapshotChangedError:queueDomain.EbdSnapshotChangedError,generateEbdPeriodPDF:pdf.generateEbdPeriodPDF,generateEbdQuarterlyPDF:pdf.generateEbdQuarterlyPDF,
  setGeneratingQuarterly:()=>{},toast:{error:value=>messages.push(value),success:value=>messages.push(value)},reportClientError:async()=>{throw new Error('Unexpected error telemetry');},
 });
 return {model,fetchHistory,days,handler,messages,reportScope};
}

test('actual readEbdDay attaches the version from before its parallel reads and stale day PDF is rejected',async t=>{
 const backend=readBackend();backend.state.heldTable='ebd_classes';backend.state.hold=deferred();
 globalThis.__readDaySnapshot={supabase:backend.supabase,ensureEbdSession:async()=>{},captureEbdSnapshot:queueDomain.captureEbdSnapshot,buildDayRoster,buildDayClasses};
 const source=readFileSync(new URL('../src/lib/ebd-day.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 const compiled=ts.transpileModule('const {supabase,ensureEbdSession,captureEbdSnapshot,buildDayRoster,buildDayClasses}=globalThis.__readDaySnapshot;\n'+source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {readEbdDay}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
 const oldRead=readEbdDay(date);await tick();
 const h=harness(t);h.queue.submit(pupil,date,true);backend.state.attendance=[row(true)];await h.confirm();
 backend.state.hold.resolve();const old=await oldRead;
 assert.equal(old.attendance[0].present,false);
 assert.throws(()=>pdf.generateEbdAttendancePDF({...old,formattedDate:'Dia sintético'}),/dados.*mudaram/i);
 assert.equal(saved.length,0);
 const fresh=await readEbdDay(date);pdf.generateEbdAttendancePDF({...fresh,formattedDate:'Dia sintético'});
 assert.ok(saved[0].text.includes('100%'));
});

for(const kind of ['handleDownloadPeriodPDF','handleDownloadQuarterlyPDF'])test(`actual ${kind} refuses old fetchHistory aggregates, refreshes and succeeds on current snapshot`,async t=>{
 const backend=readBackend(), history=historyHarness(backend);
 backend.state.heldTable='ebd_classes';backend.state.hold=deferred();
 const oldFetch=history.fetchHistory();await tick();
 const h=harness(t);h.queue.submit(pupil,date,true);backend.state.attendance=[row(true)];await h.confirm();
 backend.state.hold.resolve();await oldFetch;
 assert.equal(history.days()[0].presentStudents,0,'Controlled old read reached actual aggregate calculation');
 await history.handler(kind)();
 assert.equal(saved.length,0,'Stale aggregate must not reach jsPDF.save');
 assert.equal(history.days()[0].presentStudents,1,'Expected stale-snapshot handler re-fetches instead of changing formulas');
 await history.handler(kind)();
 assert.equal(saved.length,1);assert.ok(saved[0].text.includes('100%'));
});

test('actual quarterly handler rejects attendance changed while its visitor reads were pending',async t=>{
 const backend=readBackend(), history=historyHarness(backend);await history.fetchHistory();
 backend.state.heldTable='ebd_class_visitors';backend.state.hold=deferred();
 const generation=history.handler('handleDownloadQuarterlyPDF')();await tick();
 const h=harness(t);h.queue.submit(pupil,date,true);backend.state.attendance=[row(true)];await h.confirm();
 backend.state.hold.resolve();await generation;
 assert.equal(saved.length,0);assert.equal(history.days()[0].presentStudents,1);
 await history.handler('handleDownloadQuarterlyPDF')();
 assert.equal(saved.length,1);assert.ok(saved[0].text.includes('100%'));
});


test('history fetch and asynchronous quarterly PDF cannot publish into a renewed or unmounted access scope',async()=>{
 for(const transition of ['renew','unmount']){
  const backend=readBackend(), history=historyHarness(backend);await history.fetchHistory();
  backend.state.heldTable='ebd_class_visitors';backend.state.hold=deferred();
  const pending=history.handler('handleDownloadQuarterlyPDF')();await tick();
  if(transition==='renew')history.reportScope.current.sessionScope='synthetic-renewed';else history.reportScope.current.active=false;
  backend.state.hold.resolve();await pending;
  assert.equal(saved.length,0);assert.equal(history.messages.length,0);
 }
 const backend=readBackend(), history=historyHarness(backend);backend.state.heldTable='ebd_classes';backend.state.hold=deferred();
 const pending=history.fetchHistory();await tick();history.reportScope.current.sessionScope='synthetic-renewed';backend.state.hold.resolve();await pending;
 assert.deepEqual(history.model.allAttendance,[],'An old-scope fetch must not publish records');
});


test('an observed Realtime change invalidates PDF snapshots synchronously, before debounced refetch', async () => {
 const cleanups=[], changes=[], events=new Map();
 let refreshes=0;
 const channel={on(_event,_filter,callback){changes.push(callback);return channel;},subscribe(){return channel;}};
 const scope={
  useEffect:effect=>{const cleanup=effect();if(cleanup)cleanups.push(cleanup);},
  useMemo:factory=>factory(),useRef:current=>({current}),useState:value=>[value,()=>{}],
  createRefreshQueue:()=>({resume(){},dispose(){},request:async()=>{refreshes++;}}),
  supabase:{channel:()=>channel,removeChannel:async()=>{}},
  markEbdDataChanged:queueDomain.markEbdDataChanged,
  window:{setInterval:()=>1,clearInterval(){},addEventListener:(name,callback)=>events.set(name,callback),removeEventListener:name=>events.delete(name)},
  document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},
 };
 const source=readFileSync(new URL('../src/hooks/useEbdSync.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const compiled=ts.transpileModule(source+'\nreturn useEbdSync;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const useEbdSync=new Function(...Object.keys(scope),compiled)(...Object.values(scope));
 try {
  useEbdSync(true,'synthetic-scope',async()=>{});
  assert.equal(changes.length,6);
  const snapshot=version();const readsBefore=refreshes;
  changes[0]();
  assert.throws(()=>queueDomain.assertEbdSnapshotCurrent(snapshot),/dados.*mudaram/i);
  assert.equal(refreshes,readsBefore,'The stale report must be blocked before the debounce fires');
  const afterRemote=version();events.get('ebd-data-changed')();
  assert.throws(()=>queueDomain.assertEbdSnapshotCurrent(afterRemote),/dados.*mudaram/i);
  assert.equal(refreshes,readsBefore,'Invalidation itself must not dispatch or recursively refresh');
 } finally { for(const cleanup of cleanups)cleanup(); }
 assert.equal(events.size,0);
});


for (const change of ['finalized class','closed day']) test(`actual Secretaria read cannot regress ${change} when its old snapshot arrives later`, async () => {
 const backend=readBackend();backend.state.heldTable='ebd_call_status';backend.state.hold=deferred();
 backend.supabase.rpc=async name=>({data:name==='ebd_session_valid'?true:null,error:null});
 const model={callStatuses:{'class-a':'aberta'},dayIsClosed:false};
 const scope={supabase:backend.supabase,sundayDate:date,dataScopeRef:{current:'synthetic-access'},
  attendanceQueue:{readVersion:()=>({}),reconcile:rows=>rows},
  captureEbdSnapshot:queueDomain.captureEbdSnapshot,assertEbdSnapshotCurrent:queueDomain.assertEbdSnapshotCurrent,
  setCallStatuses:value=>{model.callStatuses=value;},setDayIsClosed:value=>{model.dayIsClosed=value;},
  setClasses(){},setActiveStudents(){},setAllStudents(){},setAttendance(){},setClassVisitors(){},setClosureId(){},setVisitorCount(){},setAiReauthOpen(){},
 };
 const text=readFileSync(new URL('../src/pages/Secretaria.tsx',import.meta.url),'utf8');
 const source=ts.createSourceFile('Secretaria.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let initializer;const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='readData')initializer=node.initializer.arguments[0];ts.forEachChild(node,visit);};visit(source);
 assert.ok(initializer);
 const compiled=ts.transpileModule('return ('+initializer.getText(source)+');',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const read=new Function(...Object.keys(scope),compiled)(...Object.values(scope));
 const pending=read();await tick();
 if(change==='finalized class')model.callStatuses={'class-a':'finalizada'};else model.dayIsClosed=true;
 queueDomain.markEbdDataChanged();backend.state.hold.resolve();
 let failure;try{await pending;}catch(error){failure=error;}
 if(change==='finalized class')assert.equal(model.callStatuses['class-a'],'finalizada');else assert.equal(model.dayIsClosed,true);
 assert.ok(failure instanceof queueDomain.EbdSnapshotChangedError,'A discarded snapshot must not be reported as a successful refresh');
});


test('history class filter preserves closed snapshots instead of recalculating their totals from current enrollment', () => {
 const day={date,isClosed:true,totalStudents:50,presentStudents:31,visitorCount:7,classSummary:[
  {classId:'class-a',className:'Turma histórica',total:20,present:12,percentage:60,visitor_count:3},
  {classId:'class-b',className:'Outra turma',total:30,present:19,percentage:63,visitor_count:4},
 ]};
 const filtered=filterHistoryDays([day],'class-a');
 assert.equal(filtered[0].totalStudents,20);assert.equal(filtered[0].presentStudents,12);assert.equal(filtered[0].visitorCount,3);
 assert.equal(filtered[0].classSummary[0].className,'Turma histórica');assert.equal(day.totalStudents,50);
 assert.deepEqual(filterHistoryDays([day],'missing'),[]);assert.equal(filterHistoryDays([day],'all')[0],day);
});

test('history student statistics keep a transferred inactive pupil in the class saved on the historical attendance', () => {
 const pupil={id:'transferred',name:'Aluno histórico',class_id:'class-b',active:false,created_at:'2025-01-01T12:00:00Z'};
 const attendance=[{student_id:pupil.id,class_id:'class-a',date,present:true}];
 const stats=historyStudentStats([pupil],attendance,[{date}],'class-a');
 assert.deepEqual(stats,[{id:pupil.id,name:pupil.name,present:1,total:1,percentage:100}]);
 assert.deepEqual(historyStudentStats([pupil],attendance,[{date}],'class-b'),[]);
});
