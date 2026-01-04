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

    // Auth check
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check management role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);

    const isManagement = (roles || []).some((r: any) => r.role === 'admin' || r.role === 'diretoria');
    if (!isManagement) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch meeting with final_minutes
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error('Reunião não encontrada.');
    }

    if (!meeting.final_minutes) {
      throw new Error('A ata final ainda não foi gerada. Gere a ata primeiro.');
    }

    // System prompt for WhatsApp message
    const systemPrompt = `Você é um assistente que gera mensagens de comunicação para membros de igreja.

Você receberá uma ATA DE REUNIÃO da diretoria da Igreja Presbiteriana de Nova Carapina (IPNC).

SUA FUNÇÃO:
Transformar a ata em uma mensagem clara, objetiva e acolhedora para enviar aos membros da igreja via WhatsApp.

REGRAS OBRIGATÓRIAS:
- Use emojis com moderação (máximo 1-2 por seção)
- Organize por tópicos claros
- Destaque datas e prazos importantes
- Linguagem acolhedora mas objetiva
- Máximo 2000 caracteres
- NÃO use markdown (sem asteriscos, sem sublinhados)
- Use apenas quebras de linha e emojis para formatação
- Não inclua informações internas ou sensíveis da diretoria

ESTRUTURA SUGERIDA:
1. Saudação calorosa
2. Breve contexto (reunião de X data)
3. Principais decisões/informes para os membros
4. Próximos eventos ou datas importantes
5. Encerramento com bênção ou palavra de ânimo

IMPORTANTE:
- Foque apenas no que é RELEVANTE para os MEMBROS (não detalhes administrativos)
- Seja breve e direto
- Tom pastoral e acolhedor`;

    const userPrompt = `Gere uma mensagem de WhatsApp para os membros da igreja baseada nesta ata:

${meeting.final_minutes}

Gere apenas a mensagem, sem explicações adicionais.`;

    console.log('Calling Lovable AI Gateway for WhatsApp message...');

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
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const message = aiResponse.choices?.[0]?.message?.content;

    if (!message) {
      throw new Error('Resposta vazia da IA.');
    }

    console.log('WhatsApp message generated successfully');

    return new Response(
      JSON.stringify({ success: true, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-whatsapp-message:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
