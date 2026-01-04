import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId } = await req.json();
    
    if (!meetingId) {
      throw new Error('meetingId is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check management role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isManagement = (roles || []).some((r: any) => r.role === 'admin' || r.role === 'diretoria');
    if (!isManagement) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Fetch revealed contributions
    const { data: contributions } = await supabase
      .from('contributions')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('status', 'revealed');

    // Fetch agenda items
    const { data: agendaItems } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('order_index');

    // Fetch profiles
    const uniqueUserIds = Array.from(
      new Set((contributions || []).map((c: any) => c.user_id).filter(Boolean))
    );

    const { data: profiles } = uniqueUserIds.length
      ? await supabase.from('profiles').select('user_id, full_name').in('user_id', uniqueUserIds)
      : { data: [] };

    const nameByUserId = new Map(
      (profiles || []).map((p: any) => [p.user_id, p.full_name] as const)
    );

    // Build context
    const agendaContext = (agendaItems || []).map((item, i) =>
      `${i + 1}. ${item.title}${item.description ? `: ${item.description}` : ''}`
    ).join('\n');

    const contributionsContext = (contributions || []).map((c: any) => {
      const userName = nameByUserId.get(c.user_id) || 'Anônimo';
      const agendaItem = (agendaItems || []).find((a: any) => a.id === c.agenda_item_id);
      const context = agendaItem ? ` (sobre: ${agendaItem.title})` : '';
      return `- ${userName}${context}: ${c.content}`;
    }).join('\n');

    const systemPrompt = `Você é um assistente de secretaria de reuniões da Igreja Presbiteriana de Nova Carapina (IPNC).

Sua tarefa é RESUMIR as contribuições recebidas de forma clara e consolidada.

REGRAS:
- Agrupe ideias semelhantes
- Elimine redundâncias
- Mantenha os pontos principais
- Use linguagem formal e objetiva
- Preserve nomes de responsáveis e datas mencionadas
- NÃO classifique em categorias, apenas resuma o conteúdo
- Formato: texto corrido com parágrafos

Retorne um resumo consolidado das contribuições em formato de texto.`;

    const userPrompt = `Resuma as seguintes contribuições da reunião "${meeting.title}":

PAUTA:
${agendaContext || 'Sem pauta definida'}

CONTRIBUIÇÕES:
${contributionsContext || 'Sem contribuições'}

Gere um resumo consolidado.`;

    console.log('Calling Lovable AI for summary...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content || '';

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in summarize-contributions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
