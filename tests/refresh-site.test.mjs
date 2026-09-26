import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../src/lib/refresh-site.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function setup({online=true,ok=true,worker=false,waiting=false,updateFails=false}={}) {
 let navigated=null, messages=[], updates=0;
 const events=new EventTarget();
 const registration={update:async()=>{updates++;if(updateFails)throw Error('failed')},waiting:waiting?{postMessage:message=>{messages.push(message.type);events.dispatchEvent(new Event('controllerchange'))}}:null};
 const device={onLine:online,...(worker?{serviceWorker:Object.assign(events,{getRegistration:async()=>registration})}:{})};
 const page={location:{href:'https://renovo.test/auth?return=home#login',replace:value=>{navigated=value}}};
 const exports={};
 vm.runInNewContext(code,{exports,URL,AbortSignal,setTimeout,clearTimeout,fetch:async()=>({ok})});
 return {run:()=>exports.refreshSite(page,device),result:()=>({navigated,messages,updates})};
}
test('offline returns an error without navigating',async()=>{const s=setup({online:false});await assert.rejects(s.run(),/internet/);assert.equal(s.result().navigated,null)});
test('failed server response preserves the current page',async()=>{const s=setup({ok:false});await assert.rejects(s.run(),/não respondeu/);assert.equal(s.result().navigated,null)});
test('online refresh preserves route, parameters and fragment',async()=>{const s=setup();await s.run();const url=new URL(s.result().navigated);assert.equal(url.pathname,'/auth');assert.equal(url.searchParams.get('return'),'home');assert.equal(url.hash,'#login');assert.ok(url.searchParams.has('__refresh'))});
test('waiting worker is activated without unregistering or deleting caches',async()=>{const s=setup({worker:true,waiting:true});await s.run();assert.deepEqual(s.result().messages,['SKIP_WAITING']);assert.equal(s.result().updates,0);assert.ok(s.result().navigated)});
test('worker update failure still permits fresh online navigation',async()=>{const s=setup({worker:true,updateFails:true});await s.run();assert.equal(s.result().updates,1);assert.ok(s.result().navigated)});
