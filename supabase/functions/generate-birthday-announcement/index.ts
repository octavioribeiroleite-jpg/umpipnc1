import { aiChat as openAIChat } from "../_shared/ai-chat.ts";
import { serverLimiter } from "../_shared/server-limiter.ts";
import { createEbdBirthdayTokens } from "../_shared/ebd-birthday-token.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { birthdays, ebd_ai_token } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);
    const tokens = createEbdBirthdayTokens({
      issuer: supabaseUrl,
      secret: Deno.env.get('EBD_AI_SIGNING_SECRET') ?? serviceKey,
    });
    const claims = await tokens.verify(ebd_ai_token, async principal => {
      if (principal.kind === 'admin') {
        const { data, error } = await admin.from('settings').select('value')
          .eq('key', 'secretaria_admin_password').maybeSingle();
        return !error && data?.value ? data.value : null;
      }
      const { data, error } = await admin.from('ebd_class_passwords').select('pin_hash')
        .eq('class_id', principal.id).eq('active', true).maybeSingle();
      return !error && data?.pin_hash ? data.pin_hash : null;
    });
    if (!claims) {
      return Response.json({ error: 'Confirme seu PIN para gerar a mensagem.', code: 'ebd_ai_session_expired_or_invalid' },
        { status: 401, headers: corsHeaders });
    }

    if (!Array.isArray(birthdays) || birthdays.length === 0 || birthdays.length > 100 || birthdays.some(b =>
      !b || typeof b.nome !== 'string' || !b.nome.trim() || b.nome.length > 180 ||
      !Number.isInteger(b.dia) || b.dia < 1 || b.dia > 31 || !Number.isInteger(b.mes) || b.mes < 1 || b.mes > 12)) {
      return new Response(
        JSON.stringify({ error: 'Nenhum aniversariante informado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const listText = birthdays
      .map((b: { nome: string; dia: number; mes: number }) => `${String(b.dia).padStart(2, '0')}/${String(b.mes).padStart(2, '0')} - ${b.nome}`)
      .join('\n');

    const systemPrompt = `Você é o responsável por comunicar os aniversariantes da semana na Igreja Presbiteriana de Nova Carapina (IPNC).

Sua tarefa é gerar uma mensagem de WhatsApp para enviar ao responsável por anunciar os aniversariantes no púlpito durante o culto de domingo.

TOM: Pastoral, acolhedor, alegre mas respeitoso. A mensagem será lida no culto.

ESTRUTURA:
1. Saudação breve ao responsável (ex: "Olá! Segue a lista dos aniversariantes da semana")
2. Lista formatada com nome e data (DD/MM)
3. Sugestão de frase para o anúncio no púlpito (curta, para ser lida em voz alta)
4. Encerramento cordial

REGRAS:
- Use *asterisco único* para negrito (formato WhatsApp)
- Máximo 200 palavras
- Não invente nomes, use apenas os fornecidos
- Inclua emojis com moderação (🎂🙏)
- A frase para o púlpito deve ser genérica o suficiente para funcionar com qualquer quantidade de nomes`;

    const userPrompt = `Gere a mensagem de WhatsApp para os seguintes aniversariantes da semana:\n\n${listText}`;

    const rate = await serverLimiter(corsHeaders).aiGeneration({
      actor: claims.principal.kind === 'admin' ? 'ebd-admin:secretaria' : `ebd-class:${claims.principal.id}`,
    });
    if (!rate.allowed) return rate.response;
    const response = await openAIChat({

        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
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

    return new Response(
      JSON.stringify({ success: true, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-birthday-announcement:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
