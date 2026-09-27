/* eslint-disable @typescript-eslint/no-explicit-any -- Local-only double spans heterogeneous Supabase query shapes. */
// Local-only backend double. No production credentials or network writes.
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
 member_payment_submissions:[{...base,id:'submission',member_id:'member',user_id:uid,competence:'2026',type:'annual_contribution',receipt_url:'fixture/receipt.pdf',status:'pendente',notes:'Pagamento de exemplo'}],
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
const mode=new URLSearchParams(location.search).get('state');
function query(table:string){
 const filters:Array<(r:any)=>boolean>=[];
 let one=false,operation='select',payload:any,limit=Infinity;
 const finish=()=>{
  if(mode==='error')return {data:null,error:{message:'Falha simulada de conexão'},count:null};
  let rows=(mode==='empty'?[]:data[table]||[]).filter(r=>filters.every(f=>f(r))).slice(0,limit);
  if(operation!=='select'){
   if(operation==='insert'||operation==='upsert'){rows=(Array.isArray(payload)?payload:[payload]).map((p:any)=>({...base,id:crypto.randomUUID(),...p}));data[table]=[...(data[table]||[]),...rows];}
   if(operation==='update')rows.forEach(r=>Object.assign(r,payload));
   if(operation==='delete')data[table]=(data[table]||[]).filter(r=>!rows.includes(r));
  }
  return {data:one?rows[0]??null:rows,error:null,count:rows.length};
 };
 const chain:any={select:()=>chain,order:()=>chain,range:()=>chain,abortSignal:()=>chain,limit:(n:number)=>{limit=n;return chain},single:()=>{one=true;return chain},maybeSingle:()=>{one=true;return chain},eq:(k:string,v:any)=>{filters.push(r=>r[k]===v);return chain},neq:(k:string,v:any)=>{filters.push(r=>r[k]!==v);return chain},gte:()=>chain,lte:()=>chain,gt:()=>chain,lt:()=>chain,is:()=>chain,in:(k:string,v:any[])=>{filters.push(r=>v.includes(r[k]));return chain},ilike:()=>chain,or:()=>chain,not:()=>chain,match:()=>chain,contains:()=>chain,
 insert:(v:any)=>{operation='insert';payload=v;return chain},upsert:(v:any)=>{operation='upsert';payload=v;return chain},update:(v:any)=>{operation='update';payload=v;return chain},delete:()=>{operation='delete';return chain},then:(resolve:any,reject:any)=>Promise.resolve(finish()).then(resolve,reject)};
 return chain;
}
const channel:any={on:()=>channel,subscribe:()=>channel,unsubscribe:async()=>{}};
export const supabase:any={from:query,channel:()=>channel,removeChannel:async()=>{},rpc:async(name:string)=>({data:name==='list_birthdays'?(mode==='empty'?[]:data.aniversariantes):name.includes('is_')?true:[],error:null}),
 auth:{getSession:async()=>({data:{session:{user:{id:uid},access_token:'fixture-only'}},error:null}),getUser:async()=>({data:{user:{id:uid}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},
 functions:{invoke:async(name:string)=>name.includes('manage-users')?{data:{users:[profile]},error:null}:{data:null,error:{message:'Serviço não executado no ambiente de revisão'}}},
 storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'#fixture'},error:null}),getPublicUrl:()=>({data:{publicUrl:''}}),list:async()=>({data:[],error:null})})}
};
