import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { TreasuryDashboard } from '../../src/components/treasury/TreasuryDashboard';
import { TreasuryEntryDialog } from '../../src/components/treasury/TreasuryEntryDialog';
import { TreasuryWorkflow } from '../../src/components/treasury/TreasuryWorkflow';
import { Context, FUND, OTHER, seed } from './hooks';
function App(){
 const [role,setRole]=useState('treasurer');const [entries,setEntries]=useState(seed);const [open,setOpen]=useState(false);const [editing,setEditing]=useState(null);const [selected,setSelected]=useState(FUND);const [filters,setFilters]=useState({search:'',kind:'',start:'',end:''});
 const confirmed=entries.filter(e=>e.status==='confirmed');
 const makeFund=(id,abbr,name,color)=>{const rows=confirmed.filter(e=>e.fund_id===id);const income=rows.filter(e=>e.kind==='income').reduce((s,e)=>s+e.amount_cents,0);const expense=rows.filter(e=>e.kind==='expense').reduce((s,e)=>s+e.amount_cents,0);const reserve=rows.reduce((s,e)=>s+(e.kind==='income'?e.per_capita_cents:-e.per_capita_cents),0);return{id,abbreviation:abbr,name,color,income_cents:income,expense_cents:expense,balance_cents:income-expense,entry_count:rows.length,reserved_cents:reserve,available_cents:income-expense-reserve}};
 const funds=[makeFund(FUND,'UMP','Sociedade fictícia para testes UMP','#5373b8'),makeFund(OTHER,'SAF','Sociedade fictícia para testes SAF','#b87851')];const totals=funds.reduce((s,f)=>Object.fromEntries(Object.keys(s).map(k=>[k,s[k]+f[k]])),{income_cents:0,expense_cents:0,balance_cents:0,entry_count:0,reserved_cents:0,available_cents:0});
 const onEdit=e=>{setEditing(e);setOpen(true);};const noop=()=>{};
 return <Context.Provider value={{entries,setEntries}}><div className="qa-bar"><strong>TESTE LOCAL · DADOS FICTÍCIOS</strong><label>Perfil de teste <select value={role} onChange={e=>{setRole(e.target.value);setOpen(false);}}><option value="treasurer">Tesoureiro</option><option value="admin">Administrador</option><option value="public">Visitante</option></select></label></div><Toaster />
 <TreasuryDashboard data={{funds,totals,months:[{month:'2026-09',income_cents:totals.income_cents,expense_cents:totals.expense_cents}]}} admin={role==='admin'} treasurer={role==='treasurer'} selectedFundId={selected} onFund={setSelected} entries={confirmed.map(e=>({...e,balance_after_cents:totals.balance_cents}))} totalCount={confirmed.length} page={0} filters={filters} filteredIncome={totals.income_cents} filteredExpense={totals.expense_cents} onFilter={setFilters} onPage={noop} onNewEntry={()=>{setEditing(null);setOpen(true);}} onNewFund={noop} onEdit={onEdit} onLogin={()=>setRole('treasurer')} onLogout={()=>setRole('public')} onShare={noop} onRefresh={noop} workflow={role!=='public'?<TreasuryWorkflow admin={role==='admin'} managedFunds={[FUND]} funds={funds} fundId={selected} onEdit={onEdit}/>:null}/>
 {role!=='public'&&<TreasuryEntryDialog admin={role==='admin'} open={open} onOpenChange={setOpen} funds={role==='admin'?funds:[funds[0]]} initialFundId={FUND} entry={editing}/>}
 </Context.Provider>;
}
createRoot(document.getElementById('root')).render(<App/>);
