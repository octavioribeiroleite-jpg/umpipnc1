import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Actual identity hook with isolated sessions/transports. No real tokens/network.
const code = ts.transpileModule(readFileSync('src/hooks/useTreasuryIdentity.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function identity({ directory = true, session = true, loading = false, admin = false, fund = 'ump', funds = ['ump'], error = null } = {}) {
  const calls=[];
  const independent={auth:{ onAuthStateChange(callback) { callback('INITIAL_SESSION',{ user:{id:'old-saf'} }); }, signOut:async()=>{calls.push('independent-out');return{};} },rpc:()=>{calls.push('independent-rpc');return{abortSignal:async()=>({data:{admin:false,fund_ids:['saf']}})};}};
  const main={rpc:()=>{calls.push('main-rpc');return{abortSignal:async()=>({data:{admin,fund_ids:funds,directory_fund_id:fund}})};}};
  const connection = directory ? {client:main,session:session?{user:{id:'directory-ump'}}:null,loading,signOut:async()=>calls.push('main-out')} : null;
  let query;
  const module={exports:{}};
  vm.runInNewContext(code,{exports:module.exports,require(name) {
    if(name==='react')return{useSyncExternalStore:(_subscribe,get)=>get()};
    if(name==='@tanstack/react-query')return{useQuery:options=>{query=options;return {data:{admin,fund_ids:funds,directory_fund_id:fund},error,isPending:false};}};
    if(name==='@/integrations/supabase/treasury-client')return{treasuryClient:independent};
    if(name==='@/contexts/TreasuryConnectionContext')return{useTreasuryConnection:()=>connection};
    if(name==='@/lib/treasury')return{treasuryError:e=>e};
    throw new Error(name);
  }});
  return {result:module.exports.useTreasuryIdentity(),query,calls};
}
test('Diretoria uses the existing main transport and session, never a stale SAF Treasury session',async()=>{
  const h=identity(); assert.equal(h.result.user.id,'directory-ump');assert.equal(h.result.canAccess,true);
  await h.query.queryFn({signal:new AbortController().signal});assert.deepEqual(h.calls,['main-rpc']);
  await h.result.signOut();assert.deepEqual(h.calls,['main-rpc','main-out']);
});
test('directory entry fails closed without main authentication or its own server-confirmed fund',()=>{
  for(const options of [{session:false},{loading:true},{fund:null,funds:['saf']},{fund:'ump',funds:['saf']},{error:new Error('denied')}]) {
    assert.equal(identity(options).result.canAccess,false,JSON.stringify(options));
  }
  assert.equal(identity({admin:true,fund:null,funds:[]}).result.canAccess,true);
});
test('independent Home finance access keeps its separate session, transport and cache scope',async()=>{
  const h=identity({directory:false});assert.equal(h.result.user.id,'old-saf');
  await h.query.queryFn({signal:new AbortController().signal});assert.deepEqual(h.calls,['independent-rpc']);
  assert.notEqual(h.query.queryKey[2],identity().query.queryKey[2]);
});
