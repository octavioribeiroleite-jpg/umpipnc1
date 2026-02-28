import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated and admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admins podem executar esta função" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Admin user for created_by
    const ADMIN_USER_ID = caller.id;

    const events = [
      // === JANEIRO 2026 ===
      { title: "Ceia do Senhor na Sede", start_date: "2026-01-04", all_day: true, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "EBD Especial", start_date: "2026-01-04T09:00:00", all_day: false, color: "#6b7280", description: "Responsável: EBD" },
      { title: "Plenária UCP / Momento de Oração", start_date: "2026-01-04T18:45:00", all_day: false, color: "#8b5cf6", description: "Responsável: UCP" },
      { title: "Semana de Intercessão", start_date: "2026-01-05", end_date: "2026-01-09", all_day: true, color: "#6b7280", description: "Responsável: Sociedades Internas" },
      { title: "Abertura da Congregação", start_date: "2026-01-09T19:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Folga Família", start_date: "2026-01-10", all_day: true, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Momento de Oração", start_date: "2026-01-11T18:45:00", all_day: false, color: "#f97316", description: "Responsável: UPA" },
      { title: "Momento de Oração UMP", start_date: "2026-01-18T18:45:00", all_day: false, color: "#3b82f6", description: "Responsável: UMP" },
      { title: "Momento de Oração / Plenária SAF", start_date: "2026-01-25T18:45:00", all_day: false, color: "#ec4899", description: "Responsável: SAF" },
      { title: "Plenária UPH", start_date: "2026-01-25T18:45:00", all_day: false, color: "#10b981", description: "Responsável: UPH" },
      // === FEVEREIRO 2026 ===
      { title: "Plenária da UMP", start_date: "2026-02-01T18:45:00", all_day: false, color: "#3b82f6", description: "Responsável: UMP" },
      { title: "Plenária da UPA", start_date: "2026-02-01T18:45:00", all_day: false, color: "#f97316", description: "Responsável: UPA" },
      { title: "Abertura UPA", start_date: "2026-02-06T19:00:00", all_day: false, color: "#f97316", description: "Responsável: UPA" },
      { title: "Departamental da SAF", start_date: "2026-02-06T19:00:00", all_day: false, color: "#ec4899", description: "Responsável: SAF" },
      { title: "Abertura FEDUPA", start_date: "2026-02-07T09:00:00", all_day: false, color: "#f97316", description: "Responsável: UPA" },
      { title: "Momento de Oração", start_date: "2026-02-08T18:45:00", all_day: false, color: "#10b981", description: "Responsável: UPH" },
      { title: "Dia do Homem Presbiteriano", start_date: "2026-02-08", all_day: true, color: "#ec4899", description: "Responsável: SAF" },
      { title: "Culto de Ação de Graças (Izabel)", start_date: "2026-02-14T19:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Dia da Mulher Presbiteriana", start_date: "2026-02-15", all_day: true, color: "#10b981", description: "Responsável: UPH" },
      { title: "Ceia do Senhor na Sede", start_date: "2026-02-15", all_day: true, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Reunião Ordinária do PRCC", start_date: "2026-02-21T19:00:00", all_day: false, color: "#6b7280", description: "Responsável: Conselho (19h–21h)" },
      { title: "Abertura das Programações UMP", start_date: "2026-02-21T09:00:00", all_day: false, color: "#3b82f6", description: "Responsável: UMP" },
      { title: "Abertura das Programações UCP", start_date: "2026-02-21T09:00:00", all_day: false, color: "#8b5cf6", description: "Responsável: UCP" },
      { title: "Ceia do Senhor na Congregação", start_date: "2026-02-22", all_day: true, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Retorno do PG", start_date: "2026-02-24T19:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Estudo UMP", start_date: "2026-02-27T19:00:00", all_day: false, color: "#3b82f6", description: "Responsável: UMP" },
      { title: "Abertura das Programações UPH", start_date: "2026-02-28T09:00:00", all_day: false, color: "#10b981", description: "Responsável: UPH" },
      // === MARÇO 2026 ===
      { title: "Almoço", start_date: "2026-03-01T12:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Ceia do Senhor na Sede", start_date: "2026-03-01", all_day: true, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Dia Internacional da Mulher", start_date: "2026-03-07", all_day: true, color: "#ec4899", description: "Responsável: SAF" },
      { title: "Aniversário da Igreja", start_date: "2026-03-07T09:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Aniversário da Igreja", start_date: "2026-03-08T09:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Folga Família", start_date: "2026-03-14", all_day: true, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Estudo da UMP", start_date: "2026-03-20T19:00:00", all_day: false, color: "#3b82f6", description: "Responsável: UMP" },
      { title: "Aniversário da UPA", start_date: "2026-03-21T09:00:00", all_day: false, color: "#f97316", description: "Responsável: UPA" },
      { title: "Almoço da Congregação", start_date: "2026-03-22T12:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Aniversário da Congregação", start_date: "2026-03-28T09:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
      { title: "Ceia do Senhor EBD Congregação", start_date: "2026-03-29T09:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC / EBD" },
      { title: "Aniversário da Congregação", start_date: "2026-03-29T09:00:00", all_day: false, color: "#6b7280", description: "Responsável: IPNC" },
    ];

    // Check existing events to avoid duplicates
    const { data: existing } = await supabase
      .from("events")
      .select("title, start_date")
      .gte("start_date", "2026-01-01")
      .lte("start_date", "2026-03-31T23:59:59");

    const existingSet = new Set(
      (existing || []).map((e: any) => `${e.title}|${e.start_date.split("T")[0]}`)
    );

    const toInsert = events
      .filter((e) => {
        const dateKey = e.start_date.split("T")[0];
        return !existingSet.has(`${e.title}|${dateKey}`);
      })
      .map((e) => ({
        title: e.title,
        start_date: e.start_date,
        end_date: (e as any).end_date || null,
        all_day: e.all_day,
        color: e.color,
        description: e.description,
        status: "confirmado" as const,
        origem: "manual" as const,
        created_by: ADMIN_USER_ID,
      }));

    let inserted = 0;
    if (toInsert.length > 0) {
      const { error } = await supabase.from("events").insert(toInsert);
      if (error) throw error;
      inserted = toInsert.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        skipped: events.length - inserted,
        total: events.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
