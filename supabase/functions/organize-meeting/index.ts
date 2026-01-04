import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;
    if (!meeting.contributions_revealed) {
      throw new Error('Contributions must be revealed before AI organization');
    }

    // Fetch revealed contributions
    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('*, profiles:user_id(full_name)')
      .eq('meeting_id', meetingId)
      .eq('status', 'revealed');

    if (contribError) throw contribError;

    // Fetch agenda items
    const { data: agendaItems } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('order_index');

    // Build context for AI
    const agendaContext = (agendaItems || []).map((item, i) => 
      `${i + 1}. ${item.title}${item.description ? `: ${item.description}` : ''}`
    ).join('\n');

    const contributionsContext = (contributions || []).map(c => {
      const userName = c.profiles?.full_name || 'Anônimo';
      const agendaItem = agendaItems?.find(a => a.id === c.agenda_item_id);
      const context = agendaItem ? ` (sobre: ${agendaItem.title})` : ' (contribuição geral)';
      return `- ${userName}${context}: ${c.content}`;
    }).join('\n');

    const systemPrompt = `Você é um assistente especializado em analisar atas de reuniões de diretoria de igrejas. 
Sua tarefa é organizar as contribuições dos participantes em categorias estruturadas.

Para cada item identificado, retorne um objeto JSON com:
- category: uma das categorias abaixo
- content: o texto extraído/resumido
- event_title: (opcional) se for um evento, o título sugerido
- event_date: (opcional) se uma data foi mencionada, no formato YYYY-MM-DD

Categorias válidas:
- "pauta": Temas da pauta identificados
- "ponto_discutido": Pontos importantes discutidos
- "decisao": Decisões tomadas pelo grupo
- "tarefa": Tarefas definidas para membros
- "pendencia": Assuntos pendentes para próximas reuniões
- "divergencia": Pontos de discordância ou debate
- "observacao": Observações gerais
- "evento": Eventos ou datas mencionadas

Retorne APENAS um array JSON válido com os itens identificados. Não inclua markdown, explicações ou texto adicional.`;

    const userPrompt = `Analise as seguintes contribuições de uma reunião de diretoria e extraia os itens relevantes:

PAUTA DA REUNIÃO:
${agendaContext || 'Sem pauta definida'}

CONTRIBUIÇÕES DOS PARTICIPANTES:
${contributionsContext || 'Sem contribuições'}

Retorne um array JSON com os itens identificados.`;

    console.log('Calling Lovable AI Gateway...');
    
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
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;
    
    console.log('AI Response:', aiContent);

    if (!aiContent) {
      throw new Error('Empty AI response');
    }

    // Parse AI response
    let items: Array<{
      category: string;
      content: string;
      event_title?: string;
      event_date?: string;
    }> = [];

    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      } else {
        items = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Create a single observation with the raw content
      items = [{
        category: 'observacao',
        content: 'Não foi possível processar automaticamente. Conteúdo bruto: ' + aiContent.substring(0, 500)
      }];
    }

    // Delete existing suggestions for this meeting
    await supabase
      .from('ai_suggestions')
      .delete()
      .eq('meeting_id', meetingId);

    // Insert new suggestions
    const suggestions = items.map(item => ({
      meeting_id: meetingId,
      category: item.category || 'observacao',
      original_content: item.content,
      status: 'pending',
      suggested_event_title: item.event_title || null,
      suggested_event_date: item.event_date || null,
    }));

    if (suggestions.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_suggestions')
        .insert(suggestions);

      if (insertError) {
        console.error('Error inserting suggestions:', insertError);
        throw insertError;
      }
    }

    // Update meeting
    await supabase
      .from('meetings')
      .update({ ai_organized: true })
      .eq('id', meetingId);

    console.log(`Successfully processed ${suggestions.length} suggestions for meeting ${meetingId}`);

    return new Response(
      JSON.stringify({ success: true, count: suggestions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in organize-meeting:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
