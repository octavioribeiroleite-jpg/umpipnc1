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

    const systemPrompt = `Você é um assistente de secretaria de reuniões da diretoria da Igreja Presbiteriana de Nova Carapina (IPNC).

Você receberá TEXTO LIVRE contendo contribuições escritas por participantes de uma reunião já revelada.

SUA FUNÇÃO:
Organizar o conteúdo em categorias estruturadas, SEM inventar informações, SEM interpretar além do que está escrito.

REGRAS OBRIGATÓRIAS:
- NÃO crie decisões, prazos, valores ou responsáveis.
- Classifique como DECISÃO apenas se houver linguagem explícita (ex.: "ficou decidido", "foi aprovado", "vamos fazer").
- Se algo estiver implícito ou indefinido, classifique como DISCUSSÃO ou SUGESTÃO.
- Opiniões conflitantes devem ser classificadas como DIVERGÊNCIA, sem tomar partido.
- Linguagem formal, objetiva e institucional.
- Cada item deve ter no máximo 3 linhas.
- Não misture categorias.

ORGANIZE A SAÍDA EXATAMENTE NESTA ESTRUTURA:
1) Pauta identificada
2) Pontos discutidos
3) Decisões explícitas
4) Tarefas explícitas
5) Pendências
6) Divergências
7) Observações gerais

FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
{
  "pauta": [],
  "pontos_discutidos": [],
  "decisoes": [],
  "tarefas": [],
  "pendencias": [],
  "divergencias": [],
  "observacoes": []
}

Cada item das listas deve seguir o formato:
{
  "id": "string_unica",
  "texto": "Descrição objetiva do item."
}

IMPORTANTE:
- Se uma categoria não tiver conteúdo, retorne uma lista vazia.
- Não gere ata final.
- Não resuma além do necessário.`;

    const userPrompt = `Analise as seguintes contribuições de uma reunião de diretoria:

PAUTA DA REUNIÃO:
${agendaContext || 'Sem pauta definida'}

CONTRIBUIÇÕES DOS PARTICIPANTES:
${contributionsContext || 'Sem contribuições'}

Retorne o JSON estruturado conforme instruído.`;

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

    // Parse AI response - expecting structured JSON object
    let items: Array<{
      category: string;
      content: string;
    }> = [];

    try {
      // Try to extract JSON object from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Convert structured object to flat items array
        const categoryMap: Record<string, string> = {
          'pauta': 'pauta',
          'pontos_discutidos': 'pontos_discutidos',
          'decisoes': 'decisoes',
          'tarefas': 'tarefas',
          'pendencias': 'pendencias',
          'divergencias': 'divergencias',
          'observacoes': 'observacoes',
        };

        for (const [key, category] of Object.entries(categoryMap)) {
          if (parsed[key] && Array.isArray(parsed[key])) {
            for (const item of parsed[key]) {
              items.push({
                category,
                content: item.texto || item.content || String(item),
              });
            }
          }
        }
      } else {
        // Fallback: try parsing as array
        const arrayMatch = aiContent.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          const arr = JSON.parse(arrayMatch[0]);
          items = arr.map((item: any) => ({
            category: item.category || 'observacoes',
            content: item.texto || item.content || String(item),
          }));
        }
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      items = [{
        category: 'observacoes',
        content: 'Não foi possível processar automaticamente. Conteúdo bruto: ' + aiContent.substring(0, 500)
      }];
    }

    console.log(`Parsed ${items.length} items from AI response`);

    // Delete existing suggestions for this meeting
    await supabase
      .from('ai_suggestions')
      .delete()
      .eq('meeting_id', meetingId);

    // Insert new suggestions
    const suggestions = items.map(item => ({
      meeting_id: meetingId,
      category: item.category || 'observacoes',
      original_content: item.content,
      status: 'pending',
      suggested_event_title: null,
      suggested_event_date: null,
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
