import { aiChat as openAIChat } from "../_shared/ai-chat.ts";
import { serverLimiter } from "../_shared/server-limiter.ts";
import { resolveAiActor } from "../_shared/ai-actor.ts";
import { canSummarizeStudy } from "../_shared/ai-auth-policy.ts";
import { formatStudySummaryForWhatsApp, splitStudyNotes } from "./study-whatsapp.ts";
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
    const { content: notes, instructions } = splitStudyNotes(study.notes);
    if (!notes) {
      return Response.json({ error: "Inclua o conteúdo do estudo fora dos parênteses." }, { status: 400, headers: corsHeaders });
    }

    const rate = await serverLimiter(corsHeaders).aiGeneration({ actor: `user:${actor.userId}` });
    if (!rate.allowed) return rate.response;
    const aiResponse = await openAIChat({

        messages: [
          {
            role: "system",
            content: `Transforme anotações de estudos bíblicos em uma mensagem pronta para colar no WhatsApp. Responda em português.

Use o campo "anotacoes" como fonte do conteúdo. O campo "orientacoes" contém o que a pessoa escreveu entre parênteses. Interprete essas orientações como pedidos de edição, mesmo se estiverem em forma de pergunta ou comentário. Aplique os pedidos em ordem e não os reproduza no resumo. Uma anotação antiga que comece com "Instrução:" também é um pedido de edição. Quando alguém pedir "meu modelo", "o modelo de sempre" ou perguntar pelos emojis, use o modelo padrão abaixo. Mantenha as partes do modelo que a orientação não pediu para alterar.

Modelo padrão para o WhatsApp:
📖 *Estudo Bíblico: [tema]*
📅 *Data:* [data do estudo fornecida]

[Breve introdução ao texto bíblico, quando mencionado]

[Pontos principais em lista com hífen e espaço ou numeração. Use subtítulos em negrito quando úteis e emojis pertinentes como 💡, ✝️, 🙏 ou 📝.]

🙏 *Reflexão:* [reflexão breve ou versículo citado nas anotações]

🧠 *Para meditar na semana*
[Duas ou três perguntas práticas e pessoais para os jovens]

Retorne apenas a mensagem final, com até 350 palavras por padrão. Use *um asterisco de cada lado* para negrito e _um sublinhado de cada lado_ para itálico. Não use asteriscos duplos, cabeçalhos com #, linhas separadoras, blocos de código ou preâmbulo. Preserve o sentido das anotações e não invente fatos, citações ou versículos.`
          },
          {
            role: "user",
            content: JSON.stringify({
              tema: study.title,
              data: study.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1'),
              anotacoes: notes,
              orientacoes: instructions,
            }),
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
