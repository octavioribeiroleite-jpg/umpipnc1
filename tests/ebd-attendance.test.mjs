import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createAttendanceQueue, assertAttendanceConfirmed, verifyUnconfirmedAttendance } from '../src/lib/ebd-attendance-queue.ts';

// Execute the actual persistence helper with a backend double that enforces the
// production UUID column. Names were previously accepted by our loose UI fixture.
const actor='00000000-0000-0000-0000-000000000099';
let userId=actor, accessToken='synthetic-token-before', calls=[], notifications=0, backendError=null, missingData=false;
let ensure=async()=>{};
const supabase={rpc:async(name,args)=>{calls.push({operation:'rpc',name,args});return {data:{id:'synthetic-closure'},error:null};},auth:{getSession:async()=>({data:{session:userId?{user:{id:userId},access_token:accessToken}:null},error:null})},from(table){
 const chain={update(payload){calls.push({table,operation:'update',payload,filters:[]});return chain;},upsert(payload,options){calls.push({table,operation:'upsert',payload,options,filters:[]});return chain;},eq(key,value){calls.at(-1).filters.push([key,value]);return chain;},select(){return chain;},async single(){
  const payload=calls.at(-1).payload;
  if(table==='ebd_attendance'&&!/^[0-9a-f-]{36}$/i.test(payload.marked_by))return {data:null,error:new Error('invalid input syntax for type uuid')};
  return backendError?{data:null,error:backendError}:{data:missingData?null:{id:'saved',...payload},error:null};
 }};return chain;
}};
globalThis.__attendanceTest={assertAttendanceConfirmed,verifyUnconfirmedAttendance,supabase,ensureEbdSession:()=>ensure(),notifyEbdChange:()=>notifications++};
const source=readFileSync(new URL('../src/lib/ebd-day.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const compiled=ts.transpileModule('const {supabase,ensureEbdSession,notifyEbdChange,assertAttendanceConfirmed,verifyUnconfirmedAttendance}=globalThis.__attendanceTest;\n'+source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {saveEbdAttendance,closeEbdDay,setEbdCallStatus}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const student={id:'student',class_id:'class'};
beforeEach(()=>{userId=actor;accessToken='synthetic-token-before';calls=[];notifications=0;backendError=null;missingData=false;ensure=async()=>{};});
test('new attendance uses the session UUID and preserves day/class and conflict key',async()=>{
 calls=[];notifications=0;const row=await saveEbdAttendance(student,'2026-09-27',true);
 assert.equal(row.marked_by,actor);assert.equal(row.present,true);
 assert.deepEqual(calls[0].payload,{student_id:'student',class_id:'class',date:'2026-09-27',present:true,marked_by:actor});
 assert.equal(calls[0].options.onConflict,'student_id,date');assert.equal(notifications,1);
});
test('unmarking an existing historical attendance retains all identity filters',async()=>{
 calls=[];await saveEbdAttendance(student,'2026-09-20',false,{id:'existing'});
 assert.deepEqual(calls[0].payload,{present:false,marked_by:actor});
 assert.deepEqual(calls[0].filters,[['id','existing'],['date','2026-09-20'],['class_id','class'],['student_id','student']]);
});
test('missing or textual identity never sends a database write',async()=>{
 for(const id of [null,'Administrador','Professor da turma']){userId=id;calls=[];await assert.rejects(saveEbdAttendance(student,'2026-09-27',true),/PIN/);assert.equal(calls.length,0);}userId=actor;
});
test('failed backend writes do not report success',async()=>{
 backendError=new Error('Dia fechado');notifications=0;
 await assert.rejects(saveEbdAttendance(student,'2026-09-27',true),/Dia fechado/);assert.equal(notifications,0);backendError=null;
});
test('session identity, token rotation and logout during validation reject before sending any write',async()=>{
 for(const change of [()=>{userId='00000000-0000-0000-0000-000000000098';},()=>{accessToken='synthetic-token-after';},()=>{userId=null;}]){
  userId=actor;accessToken='synthetic-token-before';calls=[];ensure=async()=>change();
  await assert.rejects(saveEbdAttendance(student,'2026-09-27',true),error=>error.attendanceRejected===true&&/acesso mudou/.test(error.message));
  assert.equal(calls.length,0);assert.equal(notifications,0);
 }
});
test('failed session validation is rejected locally because persistence never started',async()=>{
 for(const reason of ['Sessão expirada','Sem conexão para validar acesso']){
  ensure=async()=>{throw new Error(reason)};
  await assert.rejects(saveEbdAttendance(student,'2026-09-27',true),error=>error.attendanceRejected===true);
  assert.equal(calls.length,0);assert.equal(notifications,0);
 }
});
test('explicit database/auth rejection is distinguished from response loss and server uncertainty',async()=>{
 for(const code of ['42501','23505','23503','22023','P0001','PGRST301']){
  backendError={code,message:'Synthetic rejection'};
  await assert.rejects(saveEbdAttendance(student,'2026-09-27',true),error=>error.attendanceRejected===true);
 }
 for(const code of ['', '502', '57014', 'PGRST116']){
  backendError={code,message:'Synthetic unconfirmed result'};
  await assert.rejects(saveEbdAttendance(student,'2026-09-27',true),error=>error.attendanceRejected===false);
 }
 backendError=null;missingData=true;
 await assert.rejects(saveEbdAttendance(student,'2026-09-27',true),error=>error.attendanceRejected===false&&/confirmação/.test(error.message));
 assert.equal(notifications,0);
});


test('finalization and day closure recheck attendance accepted during asynchronous session validation',async()=>{
 for(const action of [()=>closeEbdDay('2026-09-27'),()=>setEbdCallStatus('2026-09-27','class','finalizada')]){
  let release;
  const queue=createAttendanceQueue({save:()=>new Promise(resolve=>{release=resolve;}),read:async()=>null,onConfirmed:()=>{}});
  ensure=async()=>{queue.submit(student,'2026-09-27',true);};calls=[];
  try {
   await assert.rejects(action,/aguardando confirmação/);
   assert.equal(calls.length,0,'No status or closure write may be sent while new attendance is pending');
  } finally {
   queue.dispose();release?.({id:'synthetic-presence',student_id:student.id,class_id:student.class_id,date:'2026-09-27',present:true});
   await new Promise(resolve=>setImmediate(resolve));
  }
 }
});
