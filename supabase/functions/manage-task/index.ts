import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { resolveAiActor } from '../_shared/ai-actor.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const authorization = req.headers.get('Authorization');
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const actor = await resolveAiActor(admin, authorization);
    if (!actor) return reply({ error: 'Sessão inválida' }, 401);
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization! } } });
    const { action, task_id, updates } = await req.json();
    if (typeof task_id !== 'string') return reply({ error: 'Tarefa inválida' }, 400);
    const { data: task, error: readError } = await client.from('tasks').select('id,society_id,assignee_id').eq('id',task_id).maybeSingle();
    if (readError || !task) return reply({ error: 'Tarefa não encontrada' }, 404);
    const management = actor.roles.includes('admin') || (actor.roles.includes('diretoria') && !!task.society_id && task.society_id === actor.societyId);
    if (!management && task.assignee_id !== actor.userId) return reply({ error: 'Sem permissão' }, 403);
    if (action === 'delete') {
      if (!management) return reply({ error: 'Sem permissão' }, 403);
      const { data, error } = await client.from('tasks').delete().eq('id',task_id).select('id').single();
      return error || !data ? reply({ error: 'Não foi possível excluir' }, 400) : reply({ success: true });
    }
    if (!['update','update_status'].includes(action) || !updates || typeof updates !== 'object' || Array.isArray(updates)) return reply({ error: 'Ação inválida' }, 400);
    const allowed = action === 'update_status' ? ['status'] : ['title','description','status','priority','due_date', ...(management ? ['assignee_id','meeting_id'] : [])];
    if (Object.keys(updates).length === 0 || Object.keys(updates).some(k=>!allowed.includes(k))) return reply({ error: 'Alteração inválida' }, 400);
    const { data, error } = await client.from('tasks').update(updates).eq('id',task_id).select('*').single();
    return error || !data ? reply({ error: 'Não foi possível atualizar a tarefa' }, 400) : reply(data);
  } catch { return reply({ error: 'Não foi possível processar a tarefa' }, 400); }
});
