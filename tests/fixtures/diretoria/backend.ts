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
data.pastor_announcements = ['church','society'].map((scope,index)=>({...data.pastor_announcements[0],id:`announcement-${index}`,scope,target:'all',priority:index?'normal':'alta',message:displayText,content:displayText}));
data.pastor_feedback[0] = {...data.pastor_feedback[0],section:'geral',read:false,response:null,message:displayText};
data.study_notes[0] = {...data.study_notes[0],notes:displayText};
data.membership_payments = [{...base,id:'payment',member_id:'member',amount:25,status:'pago',month:today.getMonth()+1,year:today.getFullYear()}];
data.settings = Object.entries({pix_key:'chave-ficticia@example.test',pix_key_type:'email',pix_beneficiary:'IGREJA FICTÍCIA — PRÉVIA',pix_instructions:displayText}).map(([key,value])=>({key,value}));
data.aniversariantes[0] = {...data.aniversariantes[0],dia:today.getDate(),mes:today.getMonth()+1};
const electionState = fixtureParams.get('election') || (location.pathname.includes('/vote/')?'open':'draft');
data.elections[0] = {...data.elections[0],status:electionState,total_present:20,show_result:electionState==='finished'&&fixtureParams.get('result')!=='hidden',voting_mode:fixtureParams.get('mode')==='urna'?'shared':'both',type:fixtureParams.get('kind')==='camisa'?'camisa':'cargo'};
if(electionState==='missing')data.elections=[];
const portrait='/tests/fixtures/diretoria/portrait.svg';
data.election_candidates = Array.from({length:fixtureState==='long'?18:3},(_,index)=>({...data.election_candidates[0],id:`candidate-${index+1}`,name:`Candidato Fictício ${index+1}${fixtureState==='long'?' — Nome muito extenso para verificar quebra em várias linhas':''}`,photo_url:portrait,photo_urls:Array.from({length:fixtureState==='long'?8:2},(_,photo)=>`${portrait}?candidate=${index}&photo=${photo}`),display_order:index}));
data.election_votes = electionState==='finished'?Array.from({length:8},(_,index)=>({id:`vote-${index}`,election_id:'election',candidate_id:`candidate-${index%3+1}`,round_number:1,is_blank:false})):[];
const mode=fixtureState;
let readsFail = mode === 'error';
export function setFixtureReadFailure(failed:boolean) { readsFail = failed; }
const realtimeSubscribers = new Set<{handlers:Array<{kind:string,table?:string,callback:(payload:any)=>unknown}>}>();
export async function emitFixtureRealtime() {
 const callbacks = [...realtimeSubscribers].flatMap(channel => channel.handlers.filter(handler => handler.kind === 'postgres_changes'));
 await Promise.allSettled(callbacks.map(handler => Promise.resolve().then(() => handler.callback({eventType:'UPDATE',schema:'public',table:handler.table,new:{},old:{},fixture:true}))));
 return callbacks.length;
}
const keepWhenEmpty=new Set(['societies','profiles','user_roles','settings','elections']);
const failure=()=>({data:null,error:{message:'Falha simulada de conexão — dados fictícios'},count:null});
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
  let rows=(mode==='empty'&&!keepWhenEmpty.has(table)?[]:data[table]||[]).filter(r=>filters.every(f=>f(r)));
  const count=rows.length;
  rows=rows.slice(offset,offset+limit);
  if(operation!=='select'){
   if(operation==='insert'||operation==='upsert'){rows=(Array.isArray(payload)?payload:[payload]).map((p:any)=>({...base,id:crypto.randomUUID(),...p}));data[table]=[...(data[table]||[]),...rows];}
   if(operation==='update')rows.forEach(r=>Object.assign(r,payload));
   if(operation==='delete')data[table]=(data[table]||[]).filter(r=>!rows.includes(r));
  }
  return {data:one?rows[0]??null:rows,error:null,count:operation==='select'?count:rows.length};
 };
 const chain:any={select:()=>chain,order:()=>chain,range:(from:number,to:number)=>{offset=from;limit=to-from+1;return chain},abortSignal:()=>chain,limit:(n:number)=>{limit=n;return chain},single:()=>{one=true;return chain},maybeSingle:()=>{one=true;return chain},eq:(k:string,v:any)=>{filters.push(r=>r[k]===v);return chain},neq:(k:string,v:any)=>{filters.push(r=>r[k]!==v);return chain},gte:()=>chain,lte:()=>chain,gt:()=>chain,lt:()=>chain,is:()=>chain,in:(k:string,v:any[])=>{filters.push(r=>v.includes(r[k]));return chain},
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
 if(name==='election-vote'){
  if(fixtureParams.get('read_error')===body.action && !failedVoteReads.has(body.action)){failedVoteReads.add(body.action);return failure();}
  if(body.action==='history')return {data:{votes:data.election_votes},error:null};
  if(body.action==='already')return {data:{count:fixtureParams.get('voted')==='1'?1:ballots.size},error:null};
  if(body.action==='device')return {data:{device:body.token==='fixture-urna'?{id:'device',label:'Urna FICTÍCIA'}:null},error:null};
  if(body.action==='cast'){
   fixtureVoteCalls.push({ballot_id:body.ballot_id,round_number:body.round_number,choices:[...(body.choices||[])]});
   const simulatedError = fixtureParams.get('vote_error');
   if(fixtureVoteCalls.length===1 && simulatedError==='returned')return {data:{success:false,error:'Rejeição FICTÍCIA da cédula'},error:null};
   if(fixtureVoteCalls.length===1 && simulatedError==='network')return failure();
   if(fixtureVoteCalls.length===1 && simulatedError==='throw')throw new Error('Conexão FICTÍCIA interrompida');
   // Memory only, enough for the success screen. Does not emulate database rules.
   if(!ballots.has(body.ballot_id)){ballots.add(body.ballot_id);for(const candidate_id of body.choices||[])data.election_votes.push({id:crypto.randomUUID(),election_id:body.election_id,candidate_id,round_number:body.round_number});}
   return {data:{success:true},error:null};
  }
 }
 if(name==='summarize-for-pastor')return {data:{summaries:{geral:displayText,financas:displayText,tarefas:displayText,destaques:[displayText]},generated_at:now,from_cache:true},error:null};
 if(name==='validate-diretoria-pin')return {data:{success:true,session:fakeSession},error:null};
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
 rpc:async(name:string)=>{
  await fixturePause();if(readsFail)return failure();
  if(name==='list_birthdays')return {data:mode==='empty'?[]:data.aniversariantes,error:null};
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
