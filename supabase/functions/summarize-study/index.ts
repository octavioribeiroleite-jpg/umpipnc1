import { aiChat as openAIChat } from "../_shared/ai-chat.ts";
import { serverLimiter } from "../_shared/server-limiter.ts";
import { resolveAiActor } from "../_shared/ai-actor.ts";
import { canSummarizeStudy } from "../_shared/ai-auth-policy.ts";
import { formatStudySummaryForWhatsApp } from "./study-whatsapp.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { studyId } = await req.json();
    if (!studyId) throw new Error("studyId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const actor = await resolveAiActor(supabase, req.headers.get("Authorization"));
    if (!actor) return Response.json({ error: "Faça login novamente." }, { status: 401, headers: corsHeaders });

    const { data: study, error } = await supabase
      .from("study_notes")
      .select("*")
      .eq("id", studyId)
      .single();

    if (error || !study) throw new Error("Estudo não encontrado");
    if (!canSummarizeStudy(actor, study.society_id)) {
      return Response.json({ error: "Sem permissão para este estudo." }, { status: 403, headers: corsHeaders });
    }
    if (!study.notes || study.notes.trim() === "") throw new Error("Sem anotações para resumir");

    const rate = await serverLimiter(corsHeaders).aiGeneration({ actor: `user:${actor.userId}` });
    if (!rate.allowed) return rate.response;
    const aiResponse = await openAIChat({

        messages: [
          {
            role: "system",
            content: `Transforme anotações de estudos bíblicos em uma mensagem pronta para colar no WhatsApp. Responda em português.

Nas anotações, diferencie o conteúdo do estudo das instruções sobre como escrever o resumo. Siga os pedidos de edição que a pessoa escreveu ali, inclusive em linguagem natural, entre parênteses ou com o prefixo "Instrução:". Por exemplo, "(faça em três tópicos, sem emojis)" define o formato, e "(acerte os dois asteriscos)" pede negrito no formato do WhatsApp. Aplique o pedido sem repeti-lo na mensagem. Parênteses que fazem parte do conteúdo, como uma referência bíblica, continuam sendo conteúdo.

Retorne apenas a mensagem final. Comece direto com o título ou o tema. Se mencionar a data, use exatamente a data do estudo fornecida. No WhatsApp, escreva *negrito* com exatamente um asterisco de cada lado e _itálico_ com um sublinhado de cada lado. Use hífen e espaço para listas. Não use asteriscos duplos, cabeçalhos com #, linhas separadoras, blocos de código, introduções como "Aqui está o resumo" ou comentários sobre seu trabalho. Se pedirem texto sem negrito, não use asteriscos.

Por padrão, escreva um resumo claro e fiel de até 350 palavras, com tópicos e poucos emojis relevantes. Inclua uma reflexão breve ou um versículo citado e termine com "🧠 *Para meditar na semana*", com duas ou três perguntas práticas. Adapte a estrutura, o tamanho, o tom e a presença de emojis e perguntas aos pedidos nas anotações. Preserve o sentido do que foi estudado e não invente fatos, citações ou versículos.`
          },
          {
            role: "user",
            content: `Tema: ${study.title}\nData: ${study.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')}\n\nAnotações e eventuais instruções de edição:\n${study.notes}`
          }
        ],
      });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // The shared adapter returns only sanitized, actionable error codes.
      return new Response(await aiResponse.text(), {
        status: aiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const summary = typeof content === "string" ? formatStudySummaryForWhatsApp(content) : "";
    if (!summary) throw new Error("IA não retornou resumo");

    const { error: updateError } = await supabase
      .from("study_notes")
      .update({ ai_summary: summary })
      .eq("id", studyId);

    if (updateError) throw new Error("Erro ao salvar resumo: " + updateError.message);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-study error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
