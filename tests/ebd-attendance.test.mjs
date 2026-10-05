import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the actual persistence helper with a backend double that enforces the
// production UUID column. Names were previously accepted by our loose UI fixture.
const actor='00000000-0000-0000-0000-000000000099';
let userId=actor, calls=[], notifications=0, backendError=null;
const supabase={auth:{getSession:async()=>({data:{session:userId?{user:{id:userId}}:null},error:null})},from(table){
 const chain={update(payload){calls.push({table,operation:'update',payload,filters:[]});return chain;},upsert(payload,options){calls.push({table,operation:'upsert',payload,options,filters:[]});return chain;},eq(key,value){calls.at(-1).filters.push([key,value]);return chain;},select(){return chain;},async single(){
  const payload=calls.at(-1).payload;
  if(!/^[0-9a-f-]{36}$/i.test(payload.marked_by))return {data:null,error:new Error('invalid input syntax for type uuid')};
  return backendError?{data:null,error:backendError}:{data:{id:'saved',...payload},error:null};
 }};return chain;
}};
globalThis.__attendanceTest={supabase,ensureEbdSession:async()=>{},notifyEbdChange:()=>notifications++};
const source=readFileSync(new URL('../src/lib/ebd-day.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const compiled=ts.transpileModule('const {supabase,ensureEbdSession,notifyEbdChange}=globalThis.__attendanceTest;\n'+source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {saveEbdAttendance}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const student={id:'student',class_id:'class'};
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
