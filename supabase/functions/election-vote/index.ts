import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { computeElectedIds } from '../_shared/election-rounds.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const reply = (body: unknown, status=200) => Response.json(body,{status,headers:cors});
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response(null,{headers:cors});
 if(req.method!=='POST') return reply({error:'Método inválido'},405);
 try {
  const raw=await req.text(); if(raw.length>8192) return reply({error:'Dados inválidos'},400);
  const body=JSON.parse(raw);
  const {action,election_id,token,device_id}=body;
  if(!uuid(election_id) || (token && !uuid(token)) || (device_id && !uuid(device_id))) return reply({error:'Dados inválidos'},400);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:election,error}=await admin.from('elections').select('*').eq('id',election_id).single();
  if(error || !election) return reply({error:'Eleição não encontrada'},404);
  let device=null;
  if(token) {
   const result=await admin.from('election_devices').select('id,label,activated').eq('election_id',election_id).eq('token',token).maybeSingle();
   if(result.error || !result.data) return reply({error:'Urna inválida'},403);
   device=result.data;
  }
  if(action==='device') {
   if(!device) return reply({error:'Urna inválida'},403);
   const updated=await admin.from('election_devices').update({activated:true}).eq('id',device.id);
   if(updated.error) return reply({error:'Não foi possível ativar a urna'},400);
   return reply({device:{id:device.id,label:device.label,activated:true}});
  }
  if(action==='already') {
   if(!device_id) return reply({error:'Dispositivo inválido'},400);
   const {count,error}=await admin.from('election_votes').select('id',{count:'exact',head:true}).eq('election_id',election_id).eq('device_id',device_id).eq('round_number',election.current_round||1);
   return error ? reply({error:'Não foi possível conferir o voto'},400) : reply({count:count||0});
  }
  // Retrieve every page: previous ballots determine the same runoff rules as the UI.
  let votes: any[]=[];
  for(let start=0;;start+=1000) {
   const result=await admin.from('election_votes').select('id,candidate_id,ballot_id,is_blank,round_number').eq('election_id',election_id).order('id').range(start,start+999);
   if(result.error) return reply({error:'Não foi possível consultar a votação'},400);
   votes.push(...(result.data||[])); if((result.data?.length||0)<1000) break;
  }
  if(action==='history') return reply({votes:votes.filter(v=>election.show_result || (v.round_number||1)<(election.current_round||1))});
  if(action!=='cast') return reply({error:'Ação inválida'},400);
  if(!uuid(body.ballot_id) || !Number.isInteger(body.round_number) || !Array.isArray(body.choices) || body.choices.length>100 || !body.choices.every(uuid) || new Set(body.choices).size!==body.choices.length || !Number.isInteger(body.blanks) || body.blanks<0 || body.blanks>100) return reply({error:'Cédula inválida'},400);
  const {data:candidates,error:ce}=await admin.from('election_candidates').select('id,birth_date').eq('election_id',election_id);
  if(ce || !candidates) return reply({error:'Candidatos indisponíveis'},400);
  const elected=computeElectedIds(votes,election.seats_count||1,election.current_round||1,election.majority_rule||'simple',candidates);
  const limit=election.type==='camisa' ? 1 : Math.max(1,Math.min(election.max_choices_per_ballot||1,Math.max(1,(election.seats_count||1)-elected.length)));
  if(body.choices.length+body.blanks!==limit || body.choices.some((id:string)=>!candidates.some(c=>c.id===id) || elected.includes(id) || ((election.current_round||1)>1 && election.round2_candidate_ids?.length && !election.round2_candidate_ids.includes(id)))) return reply({error:'Confira os candidatos desta rodada'},400);
  const result=await admin.rpc('cast_ipnc_ballot',{p_election:election_id,p_token:token||null,p_device:device_id||null,p_round:body.round_number,p_ballot:body.ballot_id,p_choices:body.choices,p_blanks:body.blanks,p_limit:limit});
  return result.error ? reply({error:'Votação encerrada, voto já registrado ou cédula inválida'},409) : reply({success:true});
 } catch {return reply({error:'Não foi possível processar o voto'},400);}
});
