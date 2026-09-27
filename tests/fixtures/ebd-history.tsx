// Local-only interaction fixture. All Supabase traffic is replaced with synthetic
// data before mounting the real components. This HTML is not a production entry.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { buildDayRoster } from '../../src/lib/ebd-roster';
import '../../src/index.css';
const date = '2026-09-20';
const classes = [
  {id:'old',name:'Turma Esperança',order_index:0,active:true},
  {id:'new',name:'Turma Jovens da Igreja',order_index:1,active:true},
  {id:'empty',name:'Turma sem registros',order_index:2,active:true},
];
const students = [
  {id:'a',name:'Ana — transferida',class_id:'new',active:true,created_at:'2026-01-01T12:00:00Z'},
  {id:'b',name:'Beatriz — inativa',class_id:'old',active:false,created_at:'2026-01-01T12:00:00Z'},
  {id:'c',name:'Carlos',class_id:'new',active:true,created_at:'2026-01-01T12:00:00Z'},
];
let attendance = [{id:'att-a',student_id:'a',class_id:'old',date,present:true,marked_by:'Professor'}, {id:'att-b',student_id:'b',class_id:'old',date,present:false,marked_by:'Professor'}, {id:'att-today',student_id:'c',class_id:'new',date:'2026-09-27',present:true,marked_by:'Professor'}];
let statuses = [{class_id:'old',date,status:'finalizada',changed_by:'Professor'}];
let closures: Record<string, unknown>[] = [];
let failNext = false;
const visits = [{id:'visitor',date,class_id:'old',name:'Visitante de teste'}];
function closeDay(d: string) {
  const rows = attendance.filter(a=>a.date===d);
  const roster = buildDayRoster(students,rows,d);
  const summary = classes.map(c=> { const total=roster.filter(s=>s.class_id===c.id).length; const present=rows.filter(a=>a.class_id===c.id&&a.present).length;return {classId:c.id,className:c.name,total,present,percentage:total?Math.round(present/total*100):0}; });
  const row={id:crypto.randomUUID(),date:d,closed_by:'Administrador',total_students:roster.length,present_students:rows.filter(a=>a.present).length,class_summary:summary,visitor_count:1};
  closures=closures.filter(c=>c.date!==d).concat(row); return row;
}
const nativeFetch=window.fetch.bind(window);
window.fetch=async (input,init) => {
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin);
  if (url.pathname.endsWith('/functions/v1/manage-ebd-class-password')) return new Response(JSON.stringify({class_ids:['old'],passwords:{old:'123456'}}),{headers:{'Content-Type':'application/json'}});
  if (!url.pathname.includes('/rest/v1/')) {
    if(url.hostname.endsWith('.supabase.co')) throw Error('Fixture blocked unexpected backend request');
    return nativeFetch(input,init);
  }
  const method=init?.method || 'GET';
  const body=init?.body?JSON.parse(String(init.body)):{};
  const endpoint=url.pathname.split('/').at(-1);
  const respond=(data:unknown,status=200)=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}));
  if(endpoint==='list_birthdays')return respond([{id:'birthday-test',nome:'Mariana de Oliveira — exemplo',dia:27,mes:9,ano_nascimento:1998,departamento:'EBD',observacao:null,ativo:true,pendente_revisao:false,created_at:'2026-01-01',updated_at:'2026-01-01'}]);
  if(endpoint==='ebd_session_valid')return respond(true);
  if(endpoint==='ebd_closure')return respond(closures.find(c=>c.date===body.p_date)||null);
  if(endpoint==='ebd_attendance' && ['POST','PATCH'].includes(method) && !/^[0-9a-f-]{36}$/i.test(body.marked_by || ''))return respond({message:'invalid input syntax for type uuid'},400);
  if(endpoint==='ebd_attendance' && method==='PATCH' && failNext){failNext=false;return respond({message:'Falha simulada. Tente novamente.'},400);}
  if(endpoint==='ebd_close_day')return respond(closeDay(body.p_date));
  if(endpoint==='ebd_reopen_day'){closures=closures.filter(c=>c.id!==body.p_closure_id);return respond(true);}
  let rows: Record<string, unknown>[] = endpoint==='ebd_classes'?classes:endpoint==='ebd_students'?students:endpoint==='ebd_attendance'?attendance:endpoint==='ebd_day_closures'?closures:endpoint==='ebd_call_status'?statuses:endpoint==='ebd_class_visitor_entries'?visits:[];
  const matches=(row:Record<string,unknown>)=>[...url.searchParams].every(([key,value])=>value.startsWith('eq.')?String(row[key])===value.slice(3):value.startsWith('gte.')?String(row[key])>=value.slice(4):true);
  if(method==='PATCH') { rows=rows.filter(matches);rows.forEach(r=>Object.assign(r,body)); }
  else if(method==='POST') {
    if(closures.some(c=>c.date===body.date))return respond({message:'Dia fechado. Reabra a chamada antes de alterar.'},400);
    if(endpoint==='ebd_call_status'){statuses=statuses.filter(r=>!(r.class_id===body.class_id&&r.date===body.date)).concat(body);rows=[body];}
    else if(endpoint==='ebd_attendance'){const row={...body,id:crypto.randomUUID()};attendance=attendance.concat(row);rows=[row];}
    else throw Error('Unsupported fixture mutation');
  } else rows=rows.filter(matches);
  const accept=new Headers(init?.headers).get('Accept') || '';
  return respond(accept.includes('vnd.pgrst.object')?rows[0]??null:rows);
};
const {supabase}=await import('../../src/integrations/supabase/ebd-client');
supabase.channel=(()=>{const channel={on:()=>channel,subscribe:()=>channel,unsubscribe:async()=>{}};return channel;}) as typeof supabase.channel;
supabase.removeChannel=async()=> 'ok';
// Synthetic identity used only by this local fixture, never a production login.
supabase.auth.getSession=(async()=>({data:{session:{user:{id:'00000000-0000-0000-0000-000000000099'}}},error:null})) as typeof supabase.auth.getSession;
const {default:HistoricoTab}=await import('../../src/components/secretaria/HistoricoTab');
const role=new URLSearchParams(location.search).get('role')==='professor'?'professor':'admin';
if (location.pathname.includes('ebd-back')) {
  const { BrowserRouter, Routes, Route } = await import('react-router-dom');
  const { QueryClientProvider, QueryClient } = await import('@tanstack/react-query');
  const { default: Secretaria } = await import('../../src/pages/Secretaria');
  const { saveStoredEbdSession } = await import('../../src/lib/ebd-session-storage');
  if (!localStorage.getItem('ebd-test-initialized-design-v1')) {
    saveStoredEbdSession({ accessLevel:'admin', birthdayAiToken:'synthetic', birthdayAiExpiresAt:new Date(Date.now()+3600000).toISOString() });
    localStorage.setItem('ebd-test-initialized-design-v1','yes');
  }
  createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><BrowserRouter>
    <Routes><Route path="/auth" element={<h1>Login do teste — saída confirmada</h1>}/><Route path="*" element={<Secretaria/>}/></Routes>
    <aside className="bg-white border p-2 flex gap-2"><button onClick={()=>history.back()}>Voltar nativo (teste)</button><button onClick={()=>location.reload()}>Recarregar (teste)</button></aside>
    <Toaster/>
  </BrowserRouter></QueryClientProvider>);
} else createRoot(document.getElementById('root')!).render(<>
  <header className="fixed inset-x-0 top-0 z-30 border-b bg-background px-4 py-3"><strong>Histórico</strong><p className="text-xs text-muted-foreground">Ambiente de teste · {role==='admin'?'Administrador':'Professor'}</p></header>
  <main className="mx-auto max-w-3xl px-4 pb-8 pt-20"><HistoricoTab classes={classes} students={students.filter(s=>s.active)} accessLevel={role}/></main>
  <aside className="m-4 rounded border p-3 text-xs"><p>Controles do teste local</p><button className="p-2 underline" onClick={()=>{failNext=true;document.getElementById('test-output')!.textContent='Falha preparada';}}>Simular próxima falha</button><button className="p-2 underline" onClick={()=>{closeDay(date);window.dispatchEvent(new Event('ebd-data-changed'));}}>Simular fechamento remoto</button><button className="p-2 underline" onClick={()=>{document.getElementById('test-output')!.textContent=JSON.stringify(attendance);}}>Conferir dados simulados</button><output id="test-output" className="block break-all"/></aside>
  <Toaster />
</>);
