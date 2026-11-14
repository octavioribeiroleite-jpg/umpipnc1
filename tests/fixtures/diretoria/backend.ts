/* eslint-disable @typescript-eslint/no-explicit-any -- Local-only double spans heterogeneous Supabase query shapes. */
// Local-only backend double. No production credentials or network writes.
import { fixtureParams, fixtureRole, fixtureState, fixturePause } from './options';
const uid='00000000-0000-0000-0000-000000000001', sid='00000000-0000-0000-0000-000000000002';
const now='2026-09-27T12:00:00Z';
const base={created_at:now,updated_at:now,society_id:sid,created_by:uid};
const profile={id:'profile',user_id:uid,full_name:'Maria de Oliveira — pessoa de exemplo',email:'revisao@example.test',username:'revisao',active:true,society_id:sid,avatar_url:null};
const member={...base,id:'member',name:'Ana Carolina de Oliveira — exemplo de nome longo',full_name:'Ana Carolina de Oliveira',active:true,phone:'',birth_date:'1990-09-27',membership_date:'2025-01-01'};
const data:Record<string,any[]>={
 societies:[{id:sid,name:'União de Jovens — Exemplo',slug:'ump',color:'#1c8053',active:true}],profiles:[profile],user_roles:[{user_id:uid,role:'diretoria'}],members:[member],
 meetings:[{...base,id:'meeting',title:'Planejamento das atividades e encontro de famílias',date:now,status:'aberta',moderator_id:uid,contributions_revealed:false,ai_organized:false,final_minutes:null}],
 meeting_participants:[{id:'participant',meeting_id:'meeting',user_id:uid,profile_id:'profile'}],
 agenda_items:[{...base,id:'agenda',meeting_id:'meeting',title:'Organização do encontro',description:'Revisar horários e responsáveis.',order_index:0}],
 tasks:[{...base,id:'task',title:'Organizar os materiais para o encontro da sociedade',description:'Lista de exemplo para conferir a apresentação.',status:'todo',priority:'high',due_date:'2026-09-30',assignee_id:uid,meeting_id:'meeting',assignee:{full_name:profile.full_name}}],
 events:[{...base,id:'event',title:'Encontro das famílias e planejamento da sociedade',description:'Evento fictício para revisão.',start_date:'2026-09-27T18:00:00Z',end_date:'2026-09-27T20:00:00Z',all_day:false,location:'Salão principal',color:'#1c8053',status:'confirmado',origem:'manual',reuniao_id:null}],
 plenaries:[{...base,id:'plenary',title:'Plenária de planejamento — exemplo',date:now,quorum_required:50,notes:'Anotações de exemplo.',final_minutes:null,status:'aberta'}],
 plenary_attendance:[{id:'plenary-att',plenary_id:'plenary',member_id:'member',member_name:member.name,present:true,members:member}],
 elections:[{...base,id:'election',name:'Eleição da diretoria — exemplo',position:'Presidência',status:'draft',total_present:2,type:'cargo',voting_mode:'shared',seats_count:1,max_choices_per_ballot:1,current_round:1,majority_rule:'simple'}],
 election_candidates:[{id:'candidate',election_id:'election',name:'João de Oliveira — exemplo',photo_url:null,photo_urls:[],display_order:0,birth_date:'1990-01-01'}],
 election_devices:[{id:'device',election_id:'election',label:'Urna de demonstração',token:'fixture-token',activated:true}],
 election_attendance:[{id:'election-att',election_id:'election',name:'Maria de Oliveira — exemplo',present:true}],
 transactions:[{...base,id:'transaction',description:'Contribuição para encontro — exemplo',amount:12345.67,type:'entrada',date:'2026-09-27',category:'Doação',payment_method:'pix',status:'paid',member_id:'member',members:member}],
 financial_settings:[{...base,id:'financial-setting',competence:'geral',monthly_fee:25,per_capita:10,due_day:10}],
 member_payment_submissions:[{...base,id:'submission',member_id:'member',user_id:uid,competence:'2026',type:'annual_contribution',receipt_url:'storage://receipts/fixture/receipt.svg',status:'pendente',notes:'Pagamento de exemplo'}],
 shirt_campaigns:[{...base,id:'campaign',name:'Camisas do encontro — exemplo',purchased_quantity:50,unit_cost:25,total_purchase_cost:1250,default_sale_price:45,supplier:'Fornecedor fictício',purchase_date:'2026-09-01',transaction_id:null}],
 shirt_campaign_lots:[{...base,id:'lot',campaign_id:'campaign',quantity:50,unit_cost:25,total_cost:1250,purchase_date:'2026-09-01',supplier:'Fornecedor fictício'}],
 shirt_orders:[{...base,id:'order',buyer_name:member.name,size:'M',quantity:2,unit_price:45,unit_cost:25,total_price:90,payment_type:'pix',amount_paid:45,delivery_status:'pending',delivered_at:null,notes:'Exemplo',date:'2026-09-27',items:[{color:'off',size:'M',qty:2}],campaign_id:'campaign',lot_id:'lot'}],
 financial_categories:[{id:'category',name:'Doação',type:'entrada',society_id:sid}],
 charges:[{...base,id:'charge',member_id:'member',description:'Contribuição mensal — exemplo',amount:35,due_date:'2026-09-30',status:'pending',type:'annual_contribution',members:member,competence:'2026',amount_paid:0,reference_month:9,reference_year:2026}],
 files:[{...base,id:'file',name:'Relatório das atividades da sociedade — setembro.pdf',description:'Documento fictício para revisão de layout.',url:'fixture/report.pdf',storage_path:'fixture/report.pdf',type:'application/pdf',size:120000,category:'documento',uploaded_by:uid}],
 aniversariantes:[{...base,id:'birthday',nome:'Mariana de Oliveira — exemplo',dia:27,mes:9,ano_nascimento:1998,departamento:'UMP',observacao:null,ativo:true,pendente_revisao:false}],
 study_notes:[{...base,id:'study',title:'Estudo sobre comunhão e serviço',date:'2026-09-27',notes:'Texto de demonstração para conferir a leitura e a organização do estudo.',ai_summary:null,category:'Estudo',author:profile.full_name}],
 pastor_announcements:[{...base,id:'announcement',title:'Aviso sobre o encontro da sociedade',content:'Comunicado fictício para revisar a leitura em celular.',message:'Comunicado de exemplo.',target_society_id:sid}],
 pastor_feedback:[{...base,id:'feedback',title:'Planejamento do próximo encontro',message:'Sugestão fictícia para revisão.',content:'Sugestão de exemplo.',status:'pending',society_id:sid}],
 portal_visitors:[{...base,id:'visitor',name:'Pedro de Oliveira — exemplo',full_name:'Pedro de Oliveira — exemplo',device_id:'fixture-device',is_visitor:true,phone:'',visit_date:'2026-09-27',notes:'Cadastro fictício.',status:'novo'}],
};
// The original seed remains above; these extensions cover the remaining real pages.
const today = new Date();
const isoDay = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
const displayText = fixtureState === 'long'
 ? 'Conteúdo inteiramente fictício para avaliar quebra de linha, leitura, rolagem e ações em dispositivos estreitos. '.repeat(12)
 : 'Conteúdo fictício de demonstração, sem consulta a pessoas ou serviços reais.';
data.societies = [data.societies[0], ...['SAF','UPA','UPH','UCP'].map((name,index)=>({id:`00000000-0000-0000-0000-${String(index+3).padStart(12,'0')}`,name,slug:name.toLowerCase(),color:['#a35a78','#bd793f','#356296','#75539c'][index],active:true}))];
data.events[0] = {...data.events[0],start_date:`${isoDay}T18:00:00`,end_date:`${isoDay}T20:00:00`,description:displayText};
data.meetings[0] = {...data.meetings[0],date:`${isoDay}T14:00:00`,meeting_notes:displayText,whatsapp_message:displayText};
if (fixtureState === 'long' || fixtureParams.get('processed') === '1') {
 data.meetings[0] = {...data.meetings[0],contributions_revealed:true,ai_organized:true,
  final_minutes:`ATA FICTÍCIA — REUNIÃO DE DEMONSTRAÇÃO\n\nAbertura\n${displayText}\n\nDecisões e encaminhamentos\n${displayText}\n\nEncerramento\nConteúdo pré-preenchido para inspeção de interface, sem processamento de IA ou reunião real.`};
 data.ai_suggestions = ['decisoes','tarefas','pendencias','datas_prazos','observacoes','pontos_discutidos','eventos_sugeridos'].map((category,index)=>({...base,id:`suggestion-${index}`,meeting_id:'meeting',category,original_content:displayText,edited_content:null,status:'accepted',suggested_event_title:category==='eventos_sugeridos'?'Evento fictício de demonstração':null,suggested_event_date:category==='eventos_sugeridos'?isoDay:null}));
 data.contributions = [{...base,id:'contribution-fixture',meeting_id:'meeting',user_id:uid,agenda_item_id:'agenda',content:displayText,status:'revealed'}];
}
if (fixtureParams.get('meetings-demo') === '1') {
 data.meetings.push({
  ...data.meetings[0], id:'meeting-closed', title:'Revisão das atividades de encerramento',
  date:'2025-12-16T19:30:00', status:'fechada',
  final_minutes:'ATA DE REUNIÃO\n\nPAUTA\nReunião: Revisão das atividades de encerramento\nData: 16 de dezembro de 2025 às 22:30\nParticipantes: Participante fictício\n\nDELIBERAÇÕES\nAta fictícia para conferir a abertura pelo histórico.',
  contributions_revealed:true, ai_organized:true,
 });
 data.agenda_items.push({...data.agenda_items[0],id:'agenda-2',title:'Confirmar os próximos prazos',order_index:1});
 if (fixtureRole === 'unauthorized') data.meetings[0].moderator_id = 'outro-moderador-ficticio';
}
data.pastor_announcements = ['church','society'].map((scope,index)=>({...data.pastor_announcements[0],id:`announcement-${index}`,scope,target:'all',priority:index?'normal':'alta',message:displayText,content:displayText}));
data.pastor_feedback[0] = {...data.pastor_feedback[0],section:'geral',read:false,response:null,message:displayText};
data.study_notes[0] = {...data.study_notes[0],notes:displayText};
data.membership_payments = [{...base,id:'payment',member_id:'member',amount:25,status:'pago',month:today.getMonth()+1,year:today.getFullYear()}];
data.settings = Object.entries({pix_key:'chave-ficticia@example.test',pix_key_type:'email',pix_beneficiary:'IGREJA FICTÍCIA — PRÉVIA',pix_instructions:displayText}).map(([key,value])=>({key,value}));
data.aniversariantes[0] = {...data.aniversariantes[0],dia:today.getDate(),mes:today.getMonth()+1};
const electionState = fixtureParams.get('election') || (location.pathname.includes('/vote/')?'open':'draft');
data.elections[0] = {...data.elections[0],status:electionState,total_present:20,show_result:electionState==='finished'&&fixtureParams.get('result')!=='hidden',voting_mode:fixtureParams.get('voting_mode') || (fixtureParams.get('mode')==='urna'?'shared':'both'),type:fixtureParams.get('kind')==='camisa'?'camisa':'cargo'};
if(electionState==='missing')data.elections=[];
const portrait='/tests/fixtures/diretoria/portrait.svg';
data.election_candidates = Array.from({length:fixtureState==='long'?18:3},(_,index)=>({...data.election_candidates[0],id:`candidate-${index+1}`,name:`Candidato Fictício ${index+1}${fixtureState==='long'?' — Nome muito extenso para verificar quebra em várias linhas':''}`,photo_url:portrait,photo_urls:Array.from({length:fixtureState==='long'?8:2},(_,photo)=>`${portrait}?candidate=${index}&photo=${photo}`),display_order:index}));
data.election_votes = electionState==='finished'?Array.from({length:8},(_,index)=>({id:`vote-${index}`,election_id:'election',candidate_id:`candidate-${index%3+1}`,round_number:1,ballot_id:`ballot-${index}`,is_blank:false})):[];
if (fixtureParams.has('ballot_count') || fixtureParams.has('attendance_present')) {
 const present = Math.max(0, Math.min(2000, Number(fixtureParams.get('attendance_present') || '16')));
 const ballotCount = Math.max(0, Math.min(2000, Number(fixtureParams.get('ballot_count') || '0')));
 const choices = Math.max(1, Math.min(3, Number(fixtureParams.get('ballot_choices') || '1')));
 data.elections[0] = {...data.elections[0], total_present:Number(fixtureParams.get('total_present') || present), max_choices_per_ballot:choices, seats_count:choices};
 data.election_attendance=Array.from({length:present},(_,index)=>({id:`attendance-${String(index).padStart(5,'0')}`,election_id:'election',name:`Pessoa FICTÍCIA ${index+1}`,present:true}));
 data.election_votes=Array.from({length:ballotCount},(_,ballot)=>Array.from({length:choices},(_,choice)=>({id:`vote-${String(ballot).padStart(5,'0')}-${choice}`,election_id:'election',candidate_id:`candidate-${choice+1}`,ballot_id:`ballot-${ballot}`,round_number:1,is_blank:false}))).flat();
}
// Optional, non-production visual QA scenarios. Defaults and persisted rehearsals
// remain unchanged when these query parameters are absent.
if (fixtureParams.get('majority_rule') === 'absolute_50' || fixtureParams.get('majority_rule') === 'simple') {
 data.elections[0].majority_rule = fixtureParams.get('majority_rule');
}
const requestedRound = Number(fixtureParams.get('current_round'));
if (Number.isSafeInteger(requestedRound) && requestedRound >= 1 && requestedRound <= 3) data.elections[0].current_round = requestedRound;
if(data.elections[0])data.elections[0].nominations_open = fixtureParams.get('nominations_open')==='1';
data.election_candidates = data.election_candidates.map(candidate=>({...candidate,nomination_round:1}));
if(fixtureParams.has('nomination_count')){
 const count=Math.max(0,Math.min(100,Number(fixtureParams.get('nomination_count')||'0')));
 const round=data.elections[0].current_round||1;
 if(round===1)data.election_candidates=[];
 data.election_candidates.push(...Array.from({length:count},(_,index)=>({id:`nominee-${round}-${index}`,election_id:'election',name:`Nova indicação fictícia ${index+1}`,photo_url:null,photo_urls:[],display_order:index,nomination_round:round})));
}
const requestedDistribution = fixtureParams.get('distribution');
if (requestedDistribution && /^\d{1,4}(,\d{1,4}){0,17}$/.test(requestedDistribution)) {
 const distribution = requestedDistribution.split(',').map(Number);
 const total = distribution.reduce((sum, count) => sum + count, 0);
 if (total <= 2000 && distribution.length <= data.election_candidates.length) {
  data.election_votes = distribution.flatMap((count, index) => Array.from({length:count}, (_, vote) => ({id:`qa-vote-${index}-${vote}`,election_id:'election',candidate_id:`candidate-${index+1}`,ballot_id:`qa-ballot-${index}-${vote}`,round_number:requestedRound >= 1 && requestedRound <= 3 ? requestedRound : 1,is_blank:false})));
  data.elections[0].total_present = total;
  data.election_attendance = Array.from({length:total}, (_, index) => ({id:`qa-attendance-${index}`,election_id:'election',name:`Pessoa FICTÍCIA ${index+1}`,present:true}));
 }
}
const mode=fixtureState;
let readsFail = mode === 'error';
export function setFixtureReadFailure(failed:boolean) { readsFail = failed; }
const realtimeSubscribers = new Set<{handlers:Array<{kind:string,table?:string,callback:(payload:any)=>unknown}>}>();
export async function emitFixtureRealtime() {
 const callbacks = [...realtimeSubscribers].flatMap(channel => channel.handlers.filter(handler => handler.kind === 'postgres_changes'));
 await Promise.allSettled(callbacks.map(handler => Promise.resolve().then(() => handler.callback({eventType:'UPDATE',schema:'public',table:handler.table,new:{},old:{},fixture:true}))));
 return callbacks.length;
}
data.settings.push(...['saf','ucp','ump','upa','uph','pastor'].map((slug,index)=>({key:`diretoria_pin_${slug}`,value:`65432${index}`})));
const keepWhenEmpty=new Set(['societies','profiles','user_roles','settings','elections']);
const failure=()=>({data:null,error:{message:'Falha simulada de conexão — dados fictícios'},count:null});
// Opt-in local store for complete, multi-tab election rehearsals. Only these
// synthetic tables are persisted, under an explicit fixture namespace.
const namespaceValue = fixtureParams.get('namespace') || '';
const sharedKey = /^[a-zA-Z0-9_-]{1,64}$/.test(namespaceValue) && typeof localStorage !== 'undefined'
 ? `ipnc-fixture:elections:v1:${namespaceValue}` : null;
const sharedTables = ['elections','election_attendance','election_candidates','election_devices','election_votes'];
function reloadShared() {
 if (!sharedKey) return;
 const raw = localStorage.getItem(sharedKey);
 if (!raw) return;
 const saved = JSON.parse(raw);
 if (saved.kind !== 'ipnc-isolated-election-fixture-v1') throw new Error('Invalid fixture store');
 for (const table of sharedTables) if (Array.isArray(saved.tables?.[table])) data[table] = saved.tables[table];
}
function persistShared() {
 if (!sharedKey) return;
 const serialized = JSON.stringify({kind:'ipnc-isolated-election-fixture-v1',tables:Object.fromEntries(sharedTables.map(table=>[table,data[table]]))});
 if (localStorage.getItem(sharedKey) === serialized) return;
 localStorage.setItem(sharedKey, serialized);
 void emitFixtureRealtime();
}
async function sharedOperation<T>(write:boolean, work:()=>T):Promise<T> {
 const run=()=>{reloadShared();const result=work();if(write && !(result as any)?.error)persistShared();return result;};
 if(sharedKey && write && typeof navigator!=='undefined' && navigator.locks?.request)return navigator.locks.request(sharedKey,{mode:'exclusive'},run);
 return run();
}
if(sharedKey){
 if(localStorage.getItem(sharedKey))reloadShared();else persistShared();
 if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===sharedKey){reloadShared();void emitFixtureRealtime();}});
}
function sharedElectionWriteAllowed(table:string,operation:string,rows:any[],payload:any) {
 if(!sharedKey)return true;
 if(table==='election_attendance'&&operation!=='select'){
  const affected=operation==='insert'||operation==='upsert'?(Array.isArray(payload)?payload:[payload]):rows;
  return affected.every(row=>data.elections.find(e=>e.id===row.election_id)?.status==='draft');
 }
 if(table==='elections'&&operation==='update')return rows.every(old=>{
  const next={...old,...payload};
  const present=data.election_attendance.filter(person=>person.election_id===old.id&&person.present).length;
  const votes=data.election_votes.filter(vote=>vote.election_id===old.id);
  const count=new Set(votes.filter(vote=>vote.round_number===old.current_round).map(vote=>vote.ballot_id)).size;
  if(old.status!=='draft'&&next.total_present!==old.total_present)return false;
  if(old.status==='finished'&&(next.status!==old.status||next.current_round!==old.current_round))return false;
  if(next.total_present!==old.total_present&&next.total_present!==present)return false;
  if(old.status==='draft'&&next.status==='open')return next.total_present===present&&present>0&&votes.length===0;
  if((next.status==='finished'&&old.status!=='finished')||next.current_round!==old.current_round)return present>0&&old.total_present===present&&count===present;
  return true;
 });
 return true;
}
function ilikePattern(pattern:string) {
 return new RegExp(`^${Array.from(pattern).map(char=>char==='%'?'.*':char==='_'?'.':char.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')}$`,'isu');
}
function query(table:string){
 const filters:Array<(r:any)=>boolean>=[];
 let one=false,operation='select',payload:any,limit=Infinity,offset=0;
 const finish=async()=>{
  if(mode==='loading')return new Promise(()=>{});
  await fixturePause();
  if(operation==='select' && readsFail)return failure();
  if(operation!=='select' && (mode==='error'||(table==='election_candidates'&&(fixtureParams.get('candidate_error')==='1'||fixtureParams.get('photo_error')==='update'))))return failure();
  return sharedOperation(operation!=='select',()=>{
  let rows=(mode==='empty'&&!keepWhenEmpty.has(table)?[]:data[table]||[]).filter(r=>filters.every(f=>f(r)));
  const count=rows.length;
  rows=rows.slice(offset,offset+limit);
  if(!sharedElectionWriteAllowed(table,operation,rows,payload))return failure();
  if(operation!=='select'){
   if(operation==='insert'||operation==='upsert'){
    rows=(Array.isArray(payload)?payload:[payload]).map((p:any)=>({...base,...(table==='elections'?{status:'draft',current_round:1,total_present:0,voting_mode:'shared',type:'cargo',seats_count:1,max_choices_per_ballot:1,show_result:false}:{}),id:crypto.randomUUID(),...p}));
    data[table] ||= [];
    for(const row of rows){const existing=data[table].find(entry=>entry.id===row.id);if(existing&&operation==='upsert')Object.assign(existing,row);else data[table].push(row);}
   }
   if(operation==='update')rows.forEach(r=>Object.assign(r,payload));
   if(operation==='delete')data[table]=(data[table]||[]).filter(r=>!rows.includes(r));
  }
  return {data:one?rows[0]??null:rows,error:null,count:operation==='select'?count:rows.length};
  });
 };
 const chain:any={select:()=>chain,order:()=>chain,range:(from:number,to:number)=>{offset=from;limit=to-from+1;return chain},abortSignal:()=>chain,limit:(n:number)=>{limit=n;return chain},single:()=>{one=true;return chain},maybeSingle:()=>{one=true;return chain},eq:(k:string,v:any)=>{filters.push(r=>r[k]===v);return chain},neq:(k:string,v:any)=>{filters.push(r=>r[k]!==v);return chain},gte:()=>chain,lte:()=>chain,gt:()=>chain,lt:()=>chain,is:()=>chain,in:(k:string,v:any[])=>{filters.push(r=>v.includes(r[k]));return chain},
 like:(key:string,pattern:string)=>{const matcher=ilikePattern(pattern);filters.push(row=>row[key]!=null&&matcher.test(String(row[key])));return chain},
 ilike:(key:string,pattern:string)=>{const matcher=ilikePattern(pattern);filters.push(row=>row[key]!=null&&matcher.test(String(row[key])));return chain},
 or:(expression:string)=>{const terms=expression.split(',').map(term=>/^([^.]+)\.ilike\.(.*)$/.exec(term));if(terms.every(Boolean)){const alternatives=terms.map(term=>({key:term![1],matcher:ilikePattern(term![2])}));filters.push(row=>alternatives.some(({key,matcher})=>row[key]!=null&&matcher.test(String(row[key]))));}return chain},
 not:()=>chain,match:()=>chain,contains:()=>chain,
 insert:(v:any)=>{operation='insert';payload=v;return chain},upsert:(v:any)=>{operation='upsert';payload=v;return chain},update:(v:any)=>{operation='update';payload=v;return chain},delete:()=>{operation='delete';return chain},then:(resolve:any,reject:any)=>finish().then(resolve,reject)};
 return chain;
}
const fakeSession={user:{id:uid,email:'revisao@example.test'},access_token:'fixture-only',refresh_token:'fixture-only'};
const ballots=new Set<string>();
const fixtureVoteCalls:Array<{ballot_id:string,round_number:number,choices:string[]}> = [];
// Exposed only by the isolated fixture so browser assertions can compare retries.
if (typeof window !== 'undefined') (window as any).__ipncFixtureVoteCalls = fixtureVoteCalls;
const failedVoteReads = new Set<string>();
async function invoke(name:string,options:{body?:Record<string,any>}={}){
 await fixturePause();
 if(mode==='error'||fixtureParams.get('auth')==='deny')return failure();
 const body=options.body||{};
 if(name==='auto-process-meeting'&&fixtureParams.get('meetings-demo')==='1'){
  const meeting=data.meetings.find(row=>row.id===body.meetingId);
  if(!meeting?.meeting_notes?.trim())return failure();
  meeting.ai_organized=true;
  meeting.final_minutes=meeting.meeting_notes;
  meeting.whatsapp_message=meeting.meeting_notes;
  data.ai_suggestions=(data.ai_suggestions||[]).filter(row=>row.meeting_id!==meeting.id);
  for(const [category,original_content] of [
   ['decisoes',meeting.meeting_notes],['tarefas','Confirmar os responsáveis.'],['pendencias','Definir a data.'],
  ])data.ai_suggestions.push({...base,id:`suggestion-${category}`,meeting_id:meeting.id,category,original_content,status:'accepted'});
  return {data:{eventsCreated:0,tasksCreated:0},error:null};
 }
 if(name==='election-vote'&&sharedKey)return sharedOperation(body.action==='cast'||body.action==='device',()=>{
  const election=data.elections.find(row=>row.id===body.election_id);
  if(!election||readsFail)return failure();
  const rows=data.election_votes.filter(vote=>vote.election_id===body.election_id);
  if(body.action==='history')return {data:{votes:rows.filter(vote=>election.show_result||vote.round_number<election.current_round)},error:null};
  if(body.action==='already')return {data:{count:rows.filter(vote=>vote.device_id===body.device_id&&vote.round_number===election.current_round).length},error:null};
  const device=body.token?data.election_devices.find(row=>row.election_id===body.election_id&&row.token===body.token):null;
  if(body.action==='device'){if(!device)return failure();device.activated=true;return {data:{device},error:null};}
  if(body.action!=='cast'||election.status!=='open'||body.round_number!==election.current_round)return failure();
  if(rows.some(vote=>vote.ballot_id===body.ballot_id))return {data:{success:true},error:null};
  if(body.token&&!device)return failure();
  if(!device&&(!body.device_id||rows.some(vote=>vote.device_id===body.device_id&&vote.round_number===body.round_number)))return failure();
  fixtureVoteCalls.push({ballot_id:body.ballot_id,round_number:body.round_number,choices:[...(body.choices||[])]});
  const marks=[...(body.choices||[]),...Array.from({length:body.blanks||0},()=>null)];
  if(!marks.length)return failure();
  for(const candidate_id of marks)data.election_votes.push({id:crypto.randomUUID(),election_id:body.election_id,candidate_id,is_blank:!candidate_id,round_number:body.round_number,device_id:device?null:body.device_id,ballot_id:body.ballot_id});
  return {data:{success:true},error:null};
 });
 if(name==='election-vote'){
  if(fixtureParams.get('read_error')===body.action && !failedVoteReads.has(body.action)){failedVoteReads.add(body.action);return failure();}
  if(body.action==='history')return {data:{votes:data.election_votes},error:null};
  if(body.action==='already')return {data:{count:fixtureParams.get('voted')==='1'?1:data.election_votes.filter(vote=>vote.election_id===body.election_id&&vote.device_id===body.device_id&&vote.round_number===(data.elections.find(election=>election.id===body.election_id)?.current_round||1)).length},error:null};
  if(body.action==='device')return {data:{device:body.token==='fixture-urna'?{id:'device',label:'Urna FICTÍCIA'}:null},error:null};
  if(body.action==='cast'){
   fixtureVoteCalls.push({ballot_id:body.ballot_id,round_number:body.round_number,choices:[...(body.choices||[])]});
   const simulatedError = fixtureParams.get('vote_error');
   if(fixtureVoteCalls.length===1 && simulatedError==='returned')return {data:{success:false,error:'Rejeição FICTÍCIA da cédula'},error:null};
   if(fixtureVoteCalls.length===1 && simulatedError==='network')return failure();
   if(fixtureVoteCalls.length===1 && simulatedError==='throw')throw new Error('Conexão FICTÍCIA interrompida');
   // Memory only, enough for the success screen. Does not emulate database rules.
   if(!ballots.has(body.ballot_id)){ballots.add(body.ballot_id);for(const candidate_id of body.choices||[])data.election_votes.push({id:crypto.randomUUID(),election_id:body.election_id,candidate_id,round_number:body.round_number,device_id:body.device_id||null,ballot_id:body.ballot_id});}
   return {data:{success:true},error:null};
  }
 }
 if(name==='summarize-for-pastor')return {data:{summaries:{geral:displayText,financas:displayText,tarefas:displayText,destaques:[displayText]},generated_at:now,from_cache:true},error:null};
 if(name==='summarize-study'){
  const study=data.study_notes.find(row=>row.id===body.studyId);
  if(!study?.notes.trim())return failure();
  const expectedGuidance=fixtureParams.get('study_guidance');
  if(expectedGuidance && study.summary_guidance!==expectedGuidance)return failure();
  study.ai_summary='📖 *Estudo Bíblico: Comunhão e serviço*\n\n1. *Sirva com alegria*\nApoie quem precisa de ajuda.\n\n2. *Caminhe em comunhão*\nReserve tempo para ouvir.';
  return {data:{summary:study.ai_summary},error:null};
 }
 if(name==='validate-diretoria-pin'){const configured=data.settings.find(row=>row.key===`diretoria_pin_${body.society_slug}`);return configured?.value===body.pin?{data:{success:true,session:fakeSession},error:null}:{data:{success:false,error:'PIN incorreto'},error:null};}
 if(name==='treasury-pin-login')return {data:{session:fakeSession},error:null};
 if(name==='member-list')return {data:{members:mode==='empty'?[]:data.members},error:null};
 if(name==='manage-users')return {data:{users:[profile]},error:null};
 return {data:null,error:{message:'Serviço desabilitado nesta prévia isolada'}};
}
function createChannel() {
 const channel = {
  handlers: [] as Array<{kind:string,table?:string,callback:(payload:any)=>unknown}>,
  on(kind:string,filter:{table?:string},callback:(payload:any)=>unknown) { channel.handlers.push({kind,table:filter?.table,callback}); return channel; },
  subscribe() { realtimeSubscribers.add(channel); return channel; },
  async unsubscribe() { realtimeSubscribers.delete(channel); },
 };
 return channel;
}
export const supabase:any={from:query,channel:createChannel,removeChannel:async(channel:ReturnType<typeof createChannel>)=>{await channel.unsubscribe();},
 rpc:async(name:string,args:Record<string,any>={})=>{
  await fixturePause();if(readsFail)return failure();
  if(name==='election_room_ensure')return {data:{room_id:'11111111-1111-4111-8111-111111111111',room_token:'22222222-2222-4222-8222-222222222222',title:data.elections[0]?.name||'Sala fictícia'},error:null};
  if(name==='election_room_report'){
   const elections=fixtureParams.get('report_fixture')==='1'?['Presidente','Vice-presidente','1º secretário','2º secretário','Tesoureiro'].map((position,index)=>{
    const candidates=[{id:`report-${index}-a`,name:'Alfa fictício',nomination_round:1},{id:`report-${index}-b`,name:'Beta fictícia',nomination_round:1},{id:`report-${index}-c`,name:'Gama fictício',nomination_round:1},{id:`report-${index}-d`,name:'Débora fictícia',nomination_round:2},{id:`report-${index}-e`,name:'Érica fictícia',nomination_round:2}];
    return {election:{id:`report-cargo-${index}`,name:'Diretoria UMP - dados fictícios',position,status:'finished',current_round:2,total_present:150,seats_count:1,majority_rule:'absolute_50'},candidates,rounds:[{round:1,totalBallots:150,blankVotes:0,rows:[{candidate_id:candidates[0].id,count:60},{candidate_id:candidates[1].id,count:55},{candidate_id:candidates[2].id,count:35}],electedIds:[],hasTie:false},{round:2,totalBallots:150,blankVotes:0,rows:[{candidate_id:candidates[3].id,count:90},{candidate_id:candidates[4].id,count:60}],electedIds:[candidates[3].id],hasTie:false}],electedIds:[candidates[3].id],count:{ballots:150,present:150,confirmed:150,exact:true}};
   }):[];
   return {data:{room_id:'11111111-1111-4111-8111-111111111111',title:'Ensaio fictício',generated_at:new Date().toISOString(),completed:fixtureParams.get('report_fixture')==='1',elections},error:null};
  }
  if(name==='election_room_attach')return {data:{success:true},error:null};
  if(name==='election_start_nominated_round')return sharedOperation(true,()=>{
   const election=data.elections.find(row=>row.id===args.p_election_id);
   if(!election||election.current_round!==args.p_expected_round||!election.nominations_open||!data.election_candidates.some(candidate=>candidate.election_id===election.id&&candidate.nomination_round===election.current_round))return failure();
   election.nominations_open=false;return {data:{id:election.id,current_round:election.current_round,nominations_open:false},error:null};
  });
  if((name==='election_room_snapshot'||name==='election_demo_command')&&fixtureParams.get('room_fixture')==='1'){
   // Explicit, read-only room UI fixture; never the imported cross-phone demo.
   if(name==='election_demo_command'&&args.p_action!=='snapshot')return failure();
   const phase=fixtureParams.get('room_phase')||'voting';
   const source=data.elections[0];
   const present=Number(fixtureParams.get('attendance_present')||'150');
   const ballots=phase==='result'||phase==='finished'?present:Number(fixtureParams.get('ballot_count')||'149');
   const candidates=data.election_candidates;
   const election={...source,status:phase==='waiting'?'draft':phase==='result'||phase==='finished'?'finished':'open',total_present:present,show_result:phase==='result',voting_mode:'both',nominations_open:phase==='nominations'};
   const published_result=phase==='result'?{candidates,rounds:[{round:election.current_round||1,totalBallots:present,blankVotes:0,rows:candidates.slice(0,3).map((candidate,index)=>({candidate_id:candidate.id,count:index===0?Math.ceil(present*.6):index===1?Math.floor(present*.3):present-Math.ceil(present*.6)-Math.floor(present*.3)})),electedIds:[candidates[0]?.id],hasTie:false}]}:null;
   const snapshot={kind:'demo',room_id:'11111111-1111-4111-8111-111111111111',title:'Ensaio fictício — interface da sala',revision:1,phase,activeElection:election,candidates:phase==='waiting'||phase==='nominations'?[]:candidates,already_voted:phase==='voted',count:{ballots,present,confirmed:present,exact:present>0&&ballots===present},eligible_candidate_ids:phase==='nominations'?[]:candidates.map(candidate=>candidate.id),elected_ids:[],max_choices:1,published_result};
   return {data:name==='election_demo_command'?{...snapshot,room_token:'22222222-2222-4222-8222-222222222222',urn_token:'33333333-3333-4333-8333-333333333333',attendance:data.election_attendance,attendance_confirmed:fixtureParams.get('attendance_confirmed')==='1'||(phase!=='waiting'),current_candidates:candidates.filter(candidate=>candidate.nomination_round===(election.current_round||1)),all_candidates:candidates}:snapshot,error:null};
  }
  if(name==='election_public_count')return sharedOperation(false,()=>{
   const election=data.elections.find(row=>row.id===args.p_election_id);
   if(!election)return failure();
   const round=election.current_round||1;
   const ballots=election.status==='draft'?0:new Set(data.election_votes.filter(row=>row.election_id===election.id&&row.round_number===round&&row.ballot_id).map(row=>row.ballot_id)).size;
   return {data:{election_id:election.id,current_round:round,total_present:election.total_present,ballots},error:null};
  });
  if(name==='list_birthdays')return {data:mode==='empty'?[]:data.aniversariantes,error:null};
  if(name==='treasury_access')return {data:{admin:fixtureRole==='admin',fund_ids:data.societies.map(s=>s.id)},error:null};
  if(name==='treasury_directory')return {data:data.societies.map(s=>({id:s.id,name:s.name,abbreviation:s.slug.toUpperCase(),color:s.color})),error:null};
  if(name==='register_portal_visit')return {data:{id:crypto.randomUUID()},error:null};
  return {data:name.includes('is_')?fixtureRole==='admin':[],error:null};
 },
 auth:{
  getSession:async()=>({data:{session:fixtureParams.get('recovery')==='invalid'||fixtureRole==='anonymous'?null:fakeSession},error:null}),
  getUser:async()=>({data:{user:fakeSession.user},error:null}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  setSession:async()=>{window.dispatchEvent(new Event('fixture-signed-in'));return {data:{session:fakeSession},error:null};},
  updateUser:async()=>{await fixturePause();return mode==='error'?failure():{data:{user:fakeSession.user},error:null};},
  signOut:async()=>({error:null}),
 },
 functions:{invoke},
 storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:portrait},error:null}),getPublicUrl:()=>({data:{publicUrl:portrait}}),list:async()=>({data:[],error:null}),upload:async()=>fixtureParams.get('photo_error')==='upload'?failure():({data:{path:'fixture-only'},error:null}),remove:async()=>({data:[],error:null})})}
};
// Access-dialog rendering only. Full treasury workflow keeps its separate fixture.
export const treasuryClient=supabase;
