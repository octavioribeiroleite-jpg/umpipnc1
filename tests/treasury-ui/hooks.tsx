// Local UI fixtures only. Not imported by the application or production build.
import { createContext, useContext, useState } from 'react';
export const FUND = '11111111-1111-4111-8111-111111111111';
export const OTHER = '22222222-2222-4222-8222-222222222222';
export const bankId = '33333333-3333-4333-8333-333333333333';
export const seed = [{ id: '44444444-4444-4444-8444-444444444444', fund_id: FUND, kind: 'income', amount_cents: 20000, occurred_on: '2026-09-28', person_name: 'PESSOA FICTÍCIA - TESTE', description: 'Pix de teste: camisa e mensalidade, com per capita reservada.', status: 'pending', shirt_cents: 12000, monthly_fee_cents: 6000, per_capita_cents: 2000, payment_method: 'pix', review_note: '', bank_transaction_id: null, revision: 1, created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z', balance_after_cents: 0 }];
export const Context = createContext(null);
const query = data => ({ data, error:null,isPending:false,isFetching:false,refetch:async()=>({data}) });
export function useTreasuryBank() { const c=useContext(Context);return query([{id:bankId,revision:1,reference:'PIX-FICTICIO-TESTE-001',occurred_on:'2026-09-28',kind:'income',amount_cents:20000,remaining_cents:20000-c.entries.filter(e=>e.status==='confirmed').reduce((s,e)=>s+e.amount_cents,0)}]); }
export function useTreasuryQueue(fundId,page=0) {const c=useContext(Context);const rows=c.entries.filter(e=>e.status!=='confirmed'&&(!fundId||e.fund_id===fundId));return query({entries:rows.slice(page*20,page*20+20),total_count:rows.length});}
export function useTreasuryAdministration() {return query({accounts:[{user_id:FUND,name:'Tesoureiro fictício',username:'teste'}],managers:[]});}
export function useTreasuryWorkflowMutations() {return {createBank:{isPending:false,mutateAsync:async()=>({})},assign:{isPending:false,mutateAsync:async()=>({})}};}
export function useTreasuryMutations() {const c=useContext(Context);const [busy,setBusy]=useState(false);const wrap=fn=>({isPending:busy,mutateAsync:async x=>{setBusy(true);try{return fn(x);}finally{setBusy(false);}}});return {createEntry:wrap(x=>c.setEntries(rows=>[...rows,{...x,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),balance_after_cents:0}])),updateEntry:wrap(x=>{if(x.status==='confirmed'&&x.payment_method==='pix'&&!x.bank_transaction_id)throw Error('Vincule o movimento bancário.');c.setEntries(rows=>rows.map(e=>e.id===x.id?{...e,...x,revision:x.revision+1}:e));}),createFund:wrap(()=>{})};}
export function useTreasuryAttachments(){return query([]);}
export async function attachTreasuryReceipt(){}
export async function downloadTreasuryReceipt(){return new Uint8Array();}
export async function fetchTreasuryReport(){throw Error('Prévia isolada: geração validada nos testes automatizados de PDF.');}

export async function setTreasuryAttachmentActive(){}
