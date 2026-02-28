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

    const { data: study, error } = await supabase
      .from("study_notes")
      .select("*")
      .eq("id", studyId)
      .single();

    if (error || !study) throw new Error("Estudo não encontrado");
    if (!study.notes || study.notes.trim() === "") throw new Error("Sem anotações para resumir");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente que resume anotações de estudos bíblicos para compartilhar no WhatsApp.
Regras:
- Resuma de forma clara, organizada e fiel ao conteúdo original
- Use emojis relevantes (📖✝️🙏💡📝) para tornar a leitura agradável
- Use formatação leve compatível com WhatsApp (*negrito*, _itálico_)
- Comece com o título/tema do estudo e a data
- Organize em tópicos numerados ou com bullets
- Finalize com uma reflexão breve ou versículo-chave mencionado
- Mantenha conciso (máximo ~300 palavras)`
          },
          {
            role: "user",
            content: `Tema: ${study.title}\nData: ${study.date}\n\nAnotações:\n${study.notes}`
          }
        ],
      }),
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
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("Erro ao gerar resumo com IA");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content;
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
