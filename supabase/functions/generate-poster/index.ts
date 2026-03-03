import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { type, style, title, date, time, location, details, colorScheme } = await req.json();

    const typeLabels: Record<string, string> = {
      evento: "um evento/culto da igreja",
      anuncio: "um anúncio geral da igreja",
      convite: "um convite especial da igreja",
      campanha: "uma campanha/arrecadação da igreja",
    };

    const styleLabels: Record<string, string> = {
      minimalista: "estilo minimalista e elegante, com muito espaço em branco, tipografia moderna e limpa, poucos elementos decorativos",
      colorido: "estilo colorido e chamativo, com cores vibrantes, formas geométricas, visual impactante e alegre",
      jovem: "estilo jovem e divertido, com elementos modernos, emojis estilizados, visual descontraído e dinâmico",
      institucional: "estilo sóbrio e institucional, com visual profissional, cores sóbrias, layout formal e respeitoso",
    };

    const colorInstruction = colorScheme && colorScheme !== "livre"
      ? `Use a cor principal ${colorScheme} como destaque no design.`
      : "Escolha cores que combinem com o estilo pedido.";

    const contentParts = [];
    if (title) contentParts.push(`Título principal: "${title}"`);
    if (date) contentParts.push(`Data: ${date}`);
    if (time) contentParts.push(`Horário: ${time}`);
    if (location) contentParts.push(`Local: ${location}`);
    if (details) contentParts.push(`Informações adicionais: ${details}`);

    const prompt = `Crie um cartaz/flyer vertical (proporção 9:16, como um story do Instagram) para divulgação no WhatsApp.

Este é ${typeLabels[type] || "um evento da igreja"}.

Visual: ${styleLabels[style] || styleLabels.minimalista}

${colorInstruction}

Conteúdo que DEVE aparecer no cartaz:
${contentParts.join("\n")}

Instruções importantes:
- O texto deve ser em português brasileiro
- O cartaz deve ser visualmente atraente e profissional
- Todas as informações fornecidas devem estar legíveis no cartaz
- Use tipografia clara e bem hierarquizada
- O cartaz deve funcionar bem quando visto em tela de celular
- NÃO inclua fotos de pessoas reais
- Pode usar ícones, ilustrações ou elementos gráficos decorativos`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao gerar o cartaz. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "A IA não conseguiu gerar uma imagem. Tente novamente com instruções diferentes." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-poster error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
