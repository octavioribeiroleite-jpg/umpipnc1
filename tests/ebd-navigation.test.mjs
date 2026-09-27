import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEbdNavigation, EBD_NAVIGATION_KEY } from '../src/lib/ebd-navigation.ts';
import { loadStoredEbdSession, saveStoredEbdSession, clearStoredEbdSession, migrateEbdAuthStorage } from '../src/lib/ebd-session-storage.ts';
const storage = () => { const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}; };
function host() {
  let index=0; const entries=[{state:{idx:0},url:'/secretaria'}];const listeners=new Set();
  return {location:{pathname:'/secretaria'},history:{get state(){return entries[index].state;},pushState(state,_,url){entries.splice(index+1);entries.push({state:structuredClone(state),url});index++;},replaceState(state,_,url){entries[index]={state:structuredClone(state),url};},go(delta){const next=index+delta;if(next<0||next>=entries.length)return;index=next;for(const listener of listeners)listener({state:entries[index].state});}},addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn),get length(){return entries.length;}};
}
test('native back visits class, editing list, encounter, history, home; only then asks to exit',()=>{
  const win=host(), store=storage();let screen,exits=0;
  const nav=createEbdNavigation(win,[store],'admin',{change:s=>screen=s,exit:()=>exits++});nav.start();
  const steps=[{view:'historico'},{view:'historico',day:'2026-09-20'},{view:'historico',day:'2026-09-20',editing:true},{view:'historico',day:'2026-09-20',editing:true,classId:'a'}];
  steps.forEach(s=>nav.open(s));
  for(const expected of [...steps.slice(0,-1).reverse(),{view:'home'}]){win.history.go(-1);assert.deepEqual(screen,expected);assert.equal(exits,0);}
  win.history.go(-1);assert.equal(exits,1);assert.equal(screen.view,'home');assert.equal(win.history.state.ebdFloor,false);
  win.history.go(-1);assert.equal(exits,2);assert.equal(screen.view,'home');
});
test('reload restores exact screen without adding entries; new launch rebuilds safe back path',()=>{
  const win=host(),store=storage();let screen;
  let nav=createEbdNavigation(win,[store],'admin',{change:s=>screen=s,exit:()=>{}});nav.start();nav.open({view:'chamada'});nav.open({view:'chamada',classId:'room'});const count=win.length;nav.stop();
  nav=createEbdNavigation(win,[store],'admin',{change:s=>screen=s,exit:()=>{}});nav.start();assert.equal(win.length,count);assert.equal(screen.classId,'room');
  const reopened=host();nav=createEbdNavigation(reopened,[store],'admin',{change:s=>screen=s,exit:()=>{}});nav.start();assert.equal(screen.classId,'room');nav.back();assert.deepEqual(screen,{view:'chamada'});
});
test('back dismisses exit popup without changing underlying screen; explicit logout clears saved trail',()=>{
  const win=host(),store=storage();let screen,dialog=false;
  const nav=createEbdNavigation(win,[store],'admin',{change:s=>screen=s,exit:()=>dialog=true,intercept:()=>{if(dialog){dialog=false;return true;}return false;}});nav.start();win.history.go(-1);assert.equal(dialog,true);win.history.go(-1);assert.equal(dialog,false);assert.equal(screen.view,'home');nav.clear();assert.equal(store.getItem(EBD_NAVIGATION_KEY),null);
  const fresh=createEbdNavigation(win,[store],'admin',{change:s=>screen=s,exit:()=>{}});fresh.start();assert.deepEqual(screen,{view:'home'});
});
test('another access profile cannot inherit the previous administrator screen',()=>{
  const win=host(),store=storage();let screen;
  const admin=createEbdNavigation(win,[store],'admin',{change:s=>screen=s,exit:()=>{}});admin.start();admin.open({view:'configuracoes'});admin.stop();
  const teacher=createEbdNavigation(win,[store],'professor:class',{change:s=>screen=s,exit:()=>{}});teacher.start();assert.deepEqual(screen,{view:'home'});
});
test('explicit parent return skips class list and forward restores the editing path',()=>{
  const win=host(),store=storage();let screen;
  const nav=createEbdNavigation(win,[store],'admin',{change:s=>screen=s,exit:()=>{}});nav.start();nav.open({view:'historico'});nav.open({view:'historico',day:'2026-09-20'});nav.open({view:'historico',day:'2026-09-20',editing:true});nav.open({view:'historico',day:'2026-09-20',editing:true,classId:'a'});
  nav.backTo(s=>s.view==='historico'&&s.day&&!s.editing);assert.deepEqual(screen,{view:'historico',day:'2026-09-20'});win.history.go(1);assert.equal(screen.editing,true);
});
test('legacy session migration persists server tokens and drops PIN; explicit logout clears both stores',t=>{
  const local=storage(),session=storage();Object.defineProperty(globalThis,'localStorage',{value:local,configurable:true});Object.defineProperty(globalThis,'sessionStorage',{value:session,configurable:true});t.after(()=>{delete globalThis.localStorage;delete globalThis.sessionStorage;});
  session.setItem('ebd_session',JSON.stringify({accessLevel:'admin',adminPin:'test-pin',birthdayAiToken:'synthetic-token',birthdayAiExpiresAt:'2026-09-27T23:00:00Z'}));session.setItem('ipnc-ebd-auth','synthetic-auth-session');
  migrateEbdAuthStorage();assert.equal(local.getItem('ipnc-ebd-auth'),'synthetic-auth-session');assert.equal(session.getItem('ipnc-ebd-auth'),null);
  const loaded=loadStoredEbdSession();assert.equal(loaded.accessLevel,'admin');assert.equal(loaded.adminPin,undefined);assert.equal(JSON.parse(local.getItem('ebd_session')).adminPin,undefined);
  saveStoredEbdSession({...loaded,professorNome:'Synthetic'});assert.equal(loadStoredEbdSession().birthdayAiExpiresAt,loaded.birthdayAiExpiresAt);
  clearStoredEbdSession();assert.equal(loadStoredEbdSession(),null);assert.equal(local.getItem('ipnc-ebd-auth'),null);
});
