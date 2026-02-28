import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { year, society_id } = await req.json();
    if (!year) throw new Error("year is required");
    if (!society_id) throw new Error("society_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data: studies, error } = await supabase
      .from("study_notes")
      .select("*")
      .eq("society_id", society_id)
      .gte("date", startDate)
      .lte("date", endDate)
      .neq("notes", "")
      .order("date", { ascending: true });

    if (error) throw new Error("Erro ao buscar estudos: " + error.message);
    if (!studies || studies.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum estudo encontrado para o ano " + year }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studiesList = studies.map((s: any) => `Tema: ${s.title}\nData: ${s.date}\nAnotações:\n${s.notes}\n`).join("\n---\n\n");

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
            content: `Você é um assistente que cria relatórios anuais consolidados de estudos bíblicos para compartilhar no WhatsApp.

Regras:
- Crie um relatório completo e organizado do ano inteiro
- Use emojis relevantes (📖✝️🙏💡📝📊🗓️⭐) para tornar a leitura agradável
- Use formatação compatível com WhatsApp (*negrito*, _itálico_)
- Estruture o relatório assim:
  1. *Cabeçalho* com título do relatório e ano
  2. *Estatísticas gerais*: total de estudos, meses com mais atividade
  3. *Lista cronológica* de todos os temas estudados com suas datas
  4. *Temas recorrentes e padrões* identificados nos estudos
  5. *Versículos e reflexões mais marcantes* extraídos das anotações
  6. *Principais aprendizados e destaques* do ano
  7. *🧠 Para meditar*: 3-5 perguntas reflexivas consolidadas baseadas nos principais temas do ano, para os jovens refletirem sobre o crescimento espiritual ao longo do período
  8. *Mensagem de encerramento* com reflexão e gratidão
- Seja fiel ao conteúdo original das anotações
- Mantenha o relatório completo mas legível (máximo ~800 palavras)`
          },
          {
            role: "user",
            content: `Gere o relatório anual de ${year} com ${studies.length} estudos bíblicos:\n\n${studiesList}`
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
      throw new Error("Erro ao gerar relatório com IA");
    }

    const aiData = await aiResponse.json();
    const report = aiData.choices?.[0]?.message?.content;
    if (!report) throw new Error("IA não retornou relatório");

    return new Response(JSON.stringify({ report, totalStudies: studies.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-yearly-studies error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
