// Isolated browser fixture. No real Supabase client is instantiated: Vite aliases
// the backend below. Visible diagnostics contain only synthetic IDs and timings.
import React, { Profiler, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { useEbdAttendanceQueue } from '@/hooks/useEbdAttendanceQueue';
import type { AttendanceQueue } from '@/lib/ebd-attendance-queue';
import type { DayAttendance } from '@/lib/ebd-roster';
import ChamadaTab from '@/components/secretaria/ChamadaTab';
import { fixture } from './latency-backend';
import '../../src/index.css';
import '../../src/responsive-foundation.css';
import '../../src/components/secretaria/secretaria-workspace.css';
import '../../src/pages/secretaria-theme.css';
const date='2026-10-05';
const classes=[{id:'class-a',name:'Turma Esperança — demonstração de nome extenso na chamada',order_index:0}];
const amount=Number(new URLSearchParams(location.search).get('count')||8);
const students=Array.from({length:amount},(_,i)=>({id:`student-${i}`,class_id:'class-a',name:`Aluno ${String(i+1).padStart(3,'0')} — nome fictício de demonstração` }));
fixture.classes=classes;fixture.students=students;
const samples:Array<Record<string,unknown>>=[];
let current:Record<string,unknown>|null=null;
const renderTimes:number[]=[];
function report(){const out=document.getElementById('measurements');if(out)out.textContent=JSON.stringify({samples,requests:fixture.requests,renderCount:renderTimes.length,renderMs:renderTimes},null,2);}
document.addEventListener('click',event=>{
 const button=(event.target as Element).closest('button.ebd-attendance-student');
 if(!button||button.hasAttribute('disabled'))return;
 const t=performance.now();
 current={sample:samples.length+1,at:t,from:button.getAttribute('aria-pressed')};samples.push(current);
 const sample=current;
 const observer=new MutationObserver(()=>{
   if(sample.feedbackMs===undefined)requestAnimationFrame(()=>{if(sample.feedbackMs===undefined){sample.feedbackMs=performance.now()-t;report()}});
   if(button.getAttribute('aria-pressed')!==sample.from && sample.markMs===undefined){sample.markMs=performance.now()-t;report()}
 });
 observer.observe(button,{attributes:true,childList:true,subtree:true});
 setTimeout(()=>observer.disconnect(),15000);
},true);
fixture.onRequest=()=>report();
fixture.onConfirm=()=>{if(current){current.persistMs=performance.now()-Number(current.at);report()}};
function QueueOwner({ generation, attendance, setAttendance, statuses, setStatuses, closed, setClosed, queueRef }: {
 generation:number; attendance:DayAttendance[]; setAttendance:React.Dispatch<React.SetStateAction<DayAttendance[]>>;
 statuses:Record<string,'aberta'|'finalizada'>; setStatuses:React.Dispatch<React.SetStateAction<Record<string,'aberta'|'finalizada'>>>;
 closed:boolean;setClosed:React.Dispatch<React.SetStateAction<boolean>>;queueRef:React.MutableRefObject<AttendanceQueue|null>;
}) {
 const {queue}=useEbdAttendanceQueue(`fixture-admin:${date}:${generation}`,setAttendance);
 queueRef.current=queue;
 return <Profiler id="chamada" onRender={(_id,_phase,duration)=>{renderTimes.push(duration);report()}}>
  <ChamadaTab attendanceQueue={queue} classes={classes} students={students} attendance={attendance} setAttendance={setAttendance} callStatuses={statuses}
   onCallStatusChange={async(id,status)=>{fixture.statuses={...fixture.statuses,[id]:status};setStatuses(s=>({...s,[id]:status}));}} attendanceDate={date} formattedDate="05 de outubro de 2026" accessLevel="admin"
   dayIsClosed={closed} onCloseDay={async()=>{fixture.closed=true;setClosed(true)}} onReopenDay={async()=>{fixture.closed=false;setClosed(false)}}/>
 </Profiler>;
}
function Preview(){
 const [attendance,setAttendance]=useState<DayAttendance[]>([]);
 const [generation,setGeneration]=useState(0);
 const [shown,setShown]=useState(true);
 const queueRef=useRef<AttendanceQueue|null>(null);
 const oldRead=useRef<{queue:AttendanceQueue|null;ticket:ReturnType<AttendanceQueue['readVersion']>|null;rows:DayAttendance[]}>({queue:null,ticket:null,rows:[]});
 const [statuses,setStatuses]=useState<Record<string,'aberta'|'finalizada'>>({'class-a':'aberta'});
 const [closed,setClosed]=useState(false);
 const [controlStatus,setControlStatus]=useState('');
 const renew=()=>{fixture.accessToken=`synthetic-fixture-token-${generation+1}`;fixture.offline=false;fixture.mode='success';setGeneration(value=>value+1);setControlStatus('Acesso sintético renovado; dados persistidos preservados.');};
 return <div className="ebd-theme ebd-workspace">
  <header className="p-4 border-b"><h1 className="font-bold">Chamada: dados fictícios</h1><p>Sem conexão com produção. Sessão {fixture.sessionDelayMs} ms + gravação {fixture.saveDelayMs} ms. Geração {generation}.</p></header>
  <main className="mx-auto max-w-3xl p-3">
   {shown ? <QueueOwner key={generation} generation={generation} attendance={attendance} setAttendance={setAttendance} statuses={statuses} setStatuses={setStatuses} closed={closed} setClosed={setClosed} queueRef={queueRef}/> : <p role="status">Chamada desmontada. Requisições enviadas continuam; intenções ainda não enviadas foram descartadas.</p>}
  </main>
  <aside className="mx-auto max-w-3xl p-4 border space-y-3"><h2>Controles da fixture</h2><p role="status">{controlStatus}</p>
   <div className="flex flex-wrap gap-3">
    {(['success','rejected','lost','expired','unavailable'] as const).map(mode=><button className="border rounded p-3" key={mode} onClick={()=>{fixture.mode=mode;fixture.offline=false;setControlStatus(`Próxima operação: ${mode}`)}}>Próxima operação: {mode}</button>)}
    <button className="border rounded p-3" onClick={renew}>Renovar acesso sem apagar dados</button>
    <button className="border rounded p-3" onClick={()=>{setShown(value=>!value);if(shown)queueRef.current=null;}}>{shown?'Desmontar chamada':'Montar chamada'}</button>
    <button className="border rounded p-3" onClick={()=>{fixture.readDelayMs=5000;setControlStatus('Próxima leitura levará 5 segundos; leituras já iniciadas mantêm sua demora.')}}>Leitura lenta: 5 segundos</button>
    <button className="border rounded p-3" onClick={()=>{fixture.readDelayMs=0;fixture.offline=false;setControlStatus('Novas consultas sem atraso; leitura antiga continua em voo.')}}>Leitura rápida e reconectar</button>
    <button className="border rounded p-3" onClick={()=>{fixture.closed=true;setClosed(true)}}>Fechar em outra sessão</button>
    <button className="border rounded p-3" onClick={()=>{fixture.statuses={...fixture.statuses,'class-a':'finalizada'};setStatuses(s=>({...s,'class-a':'finalizada'}))}}>Finalizar turma em outra sessão</button>
    <button className="border rounded p-3" onClick={()=>{fixture.closed=false;fixture.statuses={'class-a':'aberta'};setClosed(false);setStatuses({'class-a':'aberta'});setControlStatus('Somente status sintético reaberto; presenças preservadas.')}}>Reabrir fixture sem apagar presenças</button>
    <button className="border rounded p-3" onClick={()=>{const queue=queueRef.current;if(queue)oldRead.current={queue,ticket:queue.readVersion(),rows:[...fixture.rows]}}}>Iniciar leitura antiga</button>
    <button className="border rounded p-3" onClick={()=>{const old=oldRead.current;const queue=queueRef.current;if(queue&&old.queue===queue&&old.ticket)setAttendance(queue.reconcile(old.rows,old.ticket));else setControlStatus('Leitura antiga ignorada: acesso ou montagem mudou.')}}>Entregar leitura antiga</button>
    <button className="border rounded p-3" onClick={()=>{const queue=queueRef.current;if(queue)setAttendance(queue.reconcile([...fixture.rows],queue.readVersion()))}}>Atualizar dados confirmados</button>
   </div><details><summary>Medições locais</summary><pre id="measurements" className="whitespace-pre-wrap break-all text-xs"/></details>
  </aside><Toaster/>
 </div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
