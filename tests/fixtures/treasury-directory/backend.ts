import { supabase as base } from '../diretoria/backend';
import { fixtureRole, fixtureState } from '../diretoria/options';
const fund={id:'00000000-0000-4000-8000-000000000078',name:'União de Mocidade Presbiteriana — fictícia',abbreviation:'UMP',color:'#4267a5',income_cents:100000,expense_cents:0,balance_cents:100000,entry_count:1,reserved_cents:10000,available_cents:90000};
const entry={id:'00000000-0000-4000-8000-000000000080',fund_id:fund.id,kind:'income',amount_cents:100000,occurred_on:'2026-10-25',person_name:'Pessoa fictícia',description:'Entrada fictícia confirmada',status:'confirmed',payment_method:'cash',shirt_cents:0,monthly_fee_cents:0,per_capita_cents:10000,bank_transaction_id:null,review_note:'Conferência fictícia',revision:1,created_at:'2026-10-25T12:00:00Z',updated_at:'2026-10-25T12:00:00Z',balance_after_cents:100000};
export const supabase={...base,rpc(name:string,args:Record<string,unknown>={}) {
  if(!name.startsWith('treasury_'))return base.rpc(name,args);
  let data:unknown=null,error:unknown=null;
  if(fixtureState==='error')error={message:'Falha fictícia na consulta'};
  else if(name==='treasury_access') data={admin:fixtureRole==='admin',fund_ids:fixtureRole==='anonymous'?[]:[fund.id],directory_fund_id:fixtureRole==='anonymous'?null:fund.id};
  else if(name==='treasury_dashboard')data={funds:[fund],totals:fund,months:[]};
  else if(name==='treasury_statement')data={entries:args.p_fund_id===fund.id?[entry]:[],total_count:args.p_fund_id===fund.id?1:0,income_cents:100000,expense_cents:0};
  else if(name==='treasury_review_queue')data={entries:[],total_count:0};
  else if(name==='treasury_pin_status'||name==='treasury_admin_accounts'||name==='treasury_bank_reconciliation')data=[];
  else error={message:'Operação desabilitada na fixture isolada'};
  const chain={abortSignal(){return chain;},then(resolve:(value:unknown)=>unknown){return Promise.resolve({data,error}).then(resolve);}};
  return chain;
}};
