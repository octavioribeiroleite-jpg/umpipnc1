interface Row {id:string;student_id:string;class_id:string;date:string;present:boolean;marked_by?:string}
const settings=new URLSearchParams(location.search);
const milliseconds=(name:string,fallback:number)=>Math.max(0,Math.min(30000,Number(settings.get(name)??fallback)||0));
export const fixture={classes:[] as Array<{id:string;name:string;order_index:number}>,students:[] as Array<{id:string;class_id:string;name:string}>,statuses:{'class-a':'aberta'} as Record<string,string>,sessionDelayMs:milliseconds('sessiondelay',150),saveDelayMs:milliseconds('savedelay',450),readDelayMs:milliseconds('readdelay',450),accessToken:'synthetic-fixture-token-0',mode:'success',offline:false,closed:false,rows:[] as Row[],requests:[] as Array<Record<string,unknown>>,onRequest:()=>{},onConfirm:()=>{}};
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export const supabase={
 auth:{getSession:async()=>({data:{session:{user:{id:'00000000-0000-0000-0000-000000000099'},access_token:fixture.accessToken}},error:null})},
 async rpc(name:string){const start=performance.now();await delay(fixture.sessionDelayMs);fixture.requests.push({kind:'session',ms:performance.now()-start});fixture.onRequest();return {data:fixture.mode!=='expired',error:fixture.offline?{message:'Conexão indisponível'}:null}},
 from(table:string){let body:Partial<Row>|undefined;const filters:Record<string,unknown>={};const values=()=>{
  const rows=table==='ebd_classes'?fixture.classes:table==='ebd_students'?fixture.students:table==='ebd_call_status'?Object.entries(fixture.statuses).map(([class_id,status])=>({class_id,status,date:'2026-10-05'})):table==='ebd_day_closures'?(fixture.closed?[{id:'fixture-closure',date:'2026-10-05'}]:[]):table==='ebd_attendance'?fixture.rows:[];
  return rows.filter(r=>Object.entries(filters).every(([k,v])=>(r as Record<string,unknown>)[k]===v));
 };const chain={
 update(data:Partial<Row>){body=data;return chain},upsert(data:Partial<Row>){body=data;return chain},eq(k:string,v:unknown){filters[k]=v;return chain},select(){return chain},order(){return chain},
 async single(){const start=performance.now();const mode=fixture.mode;fixture.mode='success';const wait=body?fixture.saveDelayMs:fixture.readDelayMs;await delay(wait);fixture.requests.push({kind:body?'write':'read',ms:performance.now()-start});fixture.onRequest();
 if(body&&(mode==='rejected'||fixture.closed))return {data:null,error:{code:'42501',message:'Operação recusada: dia fechado ou acesso inválido.'},status:403};
 if(mode==='unavailable'){fixture.offline=true;return {data:null,error:{code:'',message:'Failed to fetch'},status:0};}
 if(body){const old=fixture.rows.find(r=>r.student_id===(body.student_id||filters.student_id)&&r.date===(body.date||filters.date));const row={...old,...body,...filters,id:old?.id||crypto.randomUUID()} as Row;fixture.rows=fixture.rows.filter(r=>r.id!==old?.id).concat(row);fixture.onConfirm();
 if(mode==='lost')return {data:null,error:{code:'',message:'Failed to fetch'},status:0};return {data:row,error:null,status:200};}
 return {data:values()[0]||null,error:null,status:200};},
 maybeSingle(){return chain.single()},then(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown){const data=values();return delay(fixture.readDelayMs).then(()=>({data,error:fixture.offline?{message:'Conexão indisponível'}:null})).then(resolve,reject)}
 };return chain}
};
