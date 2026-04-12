import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // Check management role
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: hasRole } = await adminClient.rpc("has_management_role", { _user_id: userId });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: corsHeaders });
    }

    const { plenaryId } = await req.json();
    if (!plenaryId) {
      return new Response(JSON.stringify({ error: "plenaryId required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch plenary
    const { data: plenary, error: pErr } = await adminClient
      .from("plenaries")
      .select("*")
      .eq("id", plenaryId)
      .maybeSingle();

    if (pErr || !plenary) {
      return new Response(JSON.stringify({ error: "Plenária não encontrada" }), { status: 404, headers: corsHeaders });
    }

    // Fetch attendance
    const { data: attendance } = await adminClient
      .from("plenary_attendance")
      .select("present, members(name)")
      .eq("plenary_id", plenaryId);

    const presentes = (attendance || []).filter((a: any) => a.present).map((a: any) => a.members?.name).filter(Boolean).sort();
    const ausentes = (attendance || []).filter((a: any) => !a.present).map((a: any) => a.members?.name).filter(Boolean).sort();

    const prompt = `Você é um secretário profissional de igreja. Organize as anotações abaixo em uma ATA formal e estruturada da plenária.

DADOS DA PLENÁRIA:
- Título: ${plenary.title}
- Data: ${plenary.date}
- Total de membros: ${(attendance || []).length}
- Presentes: ${presentes.length} (${presentes.join(", ") || "nenhum"})
- Ausentes: ${ausentes.length} (${ausentes.join(", ") || "nenhum"})
- Quórum: ${presentes.length >= Math.floor((attendance || []).length / 2) + 1 ? "Atingido" : "Não atingido"}

ANOTAÇÕES BRUTAS:
${plenary.notes || "(sem anotações)"}

INSTRUÇÕES:
1. Organize em seções claras: Abertura, Pauta, Deliberações, Informes, Encerramento
2. Use linguagem formal mas acessível
3. Mantenha todos os fatos e decisões mencionados nas anotações
4. Adicione estrutura e formatação onde necessário
5. NÃO invente informações que não estejam nas anotações
6. Responda APENAS com a ata organizada, sem comentários extras`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um assistente especializado em redação de atas de reuniões eclesiásticas." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), { status: 429, headers: corsHeaders });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: corsHeaders });
      }
      console.error("AI error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiResponse.json();
    const organizedText = aiData.choices?.[0]?.message?.content || "";

    if (!organizedText) {
      return new Response(JSON.stringify({ error: "IA não retornou conteúdo" }), { status: 500, headers: corsHeaders });
    }

    // Save to database
    const { error: updateErr } = await adminClient
      .from("plenaries")
      .update({ final_minutes: organizedText })
      .eq("id", plenaryId);

    if (updateErr) {
      console.error("Update error:", updateErr);
      return new Response(JSON.stringify({ error: "Erro ao salvar ata" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ final_minutes: organizedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("organize-plenary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
