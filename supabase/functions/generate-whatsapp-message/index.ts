import { aiChat as openAIChat } from "../_shared/ai-chat.ts";
import { serverLimiter } from "../_shared/server-limiter.ts";
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
    const systemPrompt = `Você é o comunicador oficial da UMP (União de Mocidade Presbiteriana) da IPNC.
Sua tarefa é transformar a ata da reunião em uma mensagem de WhatsApp ANIMADA e ORGANIZADA.

TOM E LINGUAGEM:
- Fale como jovem para jovens (informal mas respeitoso)
- Use expressões como "Fala, galera!", "Bora!", "Partiu!", "Cola com a gente!"
- Seja animado e convidativo
- Emojis são bem-vindos (mas sem exagero)

ESTRUTURA OBRIGATÓRIA (nesta ordem):
═══════════════════════════════════
1. SAUDAÇÃO
   Ex: "Fala, galera da UMP! 🙌"

2. RESUMO RÁPIDO (1-2 frases)
   Ex: "Passando pra deixar vocês por dentro do que rolou na nossa última reunião!"

3. AGENDA - PRÓXIMOS EVENTOS
   Título: *📅 AGENDA DA GALERA:*

   Formato OBRIGATÓRIO para cada evento:
   DD/MM/AAAA: NOME DO EVENTO
   📍 Local | ⏰ Horário
   → Descrição curta e animada

4. INFORMES IMPORTANTES (se houver)
   Título: *📢 FICA LIGADO:*

5. ENCERRAMENTO ANIMADO
   Ex: "Contamos com vocês! Bora fazer acontecer! 🔥"
═══════════════════════════════════

EXEMPLO DE MENSAGEM IDEAL:
---
Fala, galera da UMP! 🙌

Passando pra deixar vocês ligados no que vem por aí!

*📅 AGENDA DA GALERA:*

18/05/2026: LUAL DA UMP 🌙
📍 Jardim Camburi | ⏰ 20h
→ Cola com a gente pra um momento de comunhão à beira-mar!

19/05/2026: ESTUDO BÍBLICO 📖
📍 Casa do irmão Octávio | ⏰ 19h30
→ Série especial sobre fé e propósito. Não perde!

25/05/2026: EVANGELIZAÇÃO 🙏
📍 Praça Central | ⏰ 15h
→ Dia de compartilhar o amor de Cristo!

*📢 FICA LIGADO:*
• Confirma presença no grupo!
• Traga um amigo pro lual!

Contamos com vocês! Bora fazer acontecer! 🔥

Paz do Senhor! ✝️
---

REGRAS TÉCNICAS:
- Use *asterisco único* para negrito (não use **)
- Máximo 400 palavras
- DATA SEMPRE PRIMEIRO no formato DD/MM/AAAA
- Separe seções com quebra de linha
- NÃO inclua detalhes administrativos internos`;

    const userPrompt = `Gere uma mensagem de WhatsApp para os membros da igreja baseada nesta ata:

${meeting.final_minutes}

Gere apenas a mensagem, sem explicações adicionais.`;

    console.log('Generating WhatsApp message...');

    const rate = await serverLimiter(corsHeaders).aiGeneration({ actor: `user:${userData.user.id}` });
    if (!rate.allowed) return rate.response;
    const response = await openAIChat({

        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
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
