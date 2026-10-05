import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const source = await transform(readFileSync(new URL('../supabase/functions/treasury-pin-login/index.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
const code=source.code.replace(/^import .*;$/gm,'');
const fund='11111111-1111-4111-8111-111111111111';
function fixture(options={}) {
 let handler;const calls=[];
 const Deno={env:{get:()=> 'test-only-config'},serve:fn=>{handler=fn;}};
 const createClient=()=>({rpc:async(name,args)=>{calls.push({kind:'verify',name,args});return options.database??{data:{version:'test-version',name:'Fixture'},error:null};}});
 const serverLimiter=()=>({pinAttempt:async input=>{calls.push({kind:'limit',input});return options.rate??{allowed:true};}});
 const portalSession=async input=>{calls.push({kind:'session',input});return {access_token:'fixture-access',refresh_token:'fixture-refresh'};};
 new Function('Deno','createClient','serverLimiter','portalSession',code)(Deno,createClient,serverLimiter,portalSession);
 return {calls,request:body=>handler(new Request('https://fixture.test/login',{method:'POST',body:JSON.stringify(body)}))};
}
test('PIN endpoint rejects malformed requests before any lookup or session',async()=>{
 const f=fixture(); for(const body of [{fund_id:fund,pin:'12345'},{fund_id:'another society',pin:'123456'},{fund_id:fund,pin:123456}]) assert.equal((await f.request(body)).status,400);
 assert.equal(f.calls.length,0);
});
test('rate limit blocks PIN verification and session minting',async()=>{
 const f=fixture({rate:{allowed:false,response:new Response('limited',{status:429})}});
 assert.equal((await f.request({fund_id:fund,pin:'123456'})).status,429);assert.deepEqual(f.calls.map(c=>c.kind),['limit']);
 assert.equal(f.calls[0].input.identifier,`treasury:${fund}`);
});
test('incorrect PIN and database failure cannot mint a session or disclose secrets',async()=>{
 for(const database of [{data:null,error:null},{data:null,error:{message:'private database detail'}}]) {
  const f=fixture({database});const res=await f.request({fund_id:fund,pin:'123456'});
  assert.equal(res.status,database.error?503:401);assert.deepEqual(f.calls.map(c=>c.kind),['limit','verify']);assert.doesNotMatch(await res.text(),/123456|private database detail/);
 }
});
test('valid PIN creates only a treasury session using the credential version, never the PIN',async()=>{
 const f=fixture();const res=await f.request({fund_id:fund,pin:'123456',role:'admin',namespace:'diretoria'});
 assert.equal(res.status,200);assert.deepEqual(f.calls.map(c=>c.kind),['limit','verify','session']);
 assert.deepEqual(f.calls[2].input,{namespace:'treasury',id:fund,name:'Tesouraria · Fixture',credential:'test-version',role:'visualizador'});
 assert.deepEqual(Object.keys(await res.json()),['session']);
});
