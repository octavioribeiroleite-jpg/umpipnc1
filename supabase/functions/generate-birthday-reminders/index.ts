import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Aniversariante {
  id: string;
  nome: string;
  dia: number;
  mes: number;
  ativo: boolean;
}

function getTodayBRT(): { day: number; month: number; date: Date } {
  const now = new Date();
  // Convert to BRT
  const brt = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return { day: brt.getDate(), month: brt.getMonth() + 1, date: brt };
}

function getDayOfWeek(): number {
  const { date } = getTodayBRT();
  return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
}

function getNext7Days(): { day: number; month: number }[] {
  const { date } = getTodayBRT();
  const days: { day: number; month: number }[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    days.push({ day: d.getDate(), month: d.getMonth() + 1 });
  }
  return days;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { day, month, date } = getTodayBRT();
    const todayStr = date.toISOString().split("T")[0];

    // Fetch active birthdays
    const { data: aniversariantes, error: fetchError } = await supabase
      .from("aniversariantes")
      .select("id, nome, dia, mes, ativo")
      .eq("ativo", true);

    if (fetchError) throw fetchError;

    const results: string[] = [];

    // Daily reminder: check if today has birthdays
    const todayBirthdays = (aniversariantes as Aniversariante[]).filter(
      (a) => a.dia === day && a.mes === month
    );

    if (todayBirthdays.length > 0) {
      // Check if we already have a notification for today (diario)
      const { data: existing } = await supabase
        .from("notificacoes_aniversarios")
        .select("id")
        .eq("referencia_data", todayStr)
        .eq("tipo", "diario")
        .maybeSingle();

      if (!existing) {
        const names = todayBirthdays.map((b) => b.nome).join(", ");
        const mensagem =
          todayBirthdays.length === 1
            ? `Hoje é aniversário de ${todayBirthdays[0].nome}.`
            : `Hoje é aniversário de: ${names}.`;

        await supabase.from("notificacoes_aniversarios").insert({
          titulo: "🎉 Aniversário de hoje",
          mensagem,
          tipo: "diario",
          referencia_data: todayStr,
          payload: { ids: todayBirthdays.map((b) => b.id) },
        });
        results.push(`Daily: ${todayBirthdays.length} birthday(s)`);
      }
    }

    // Weekly reminder: only on Monday (day 1)
    const dayOfWeek = getDayOfWeek();
    if (dayOfWeek === 1) {
      // Check if we already created weekly for this date
      const { data: existingWeekly } = await supabase
        .from("notificacoes_aniversarios")
        .select("id")
        .eq("referencia_data", todayStr)
        .eq("tipo", "semanal")
        .maybeSingle();

      if (!existingWeekly) {
        const next7 = getNext7Days();
        const weekBirthdays = (aniversariantes as Aniversariante[]).filter((a) =>
          next7.some((d) => d.day === a.dia && d.month === a.mes)
        );

        if (weekBirthdays.length > 0) {
          const lines = weekBirthdays
            .sort((x, y) => {
              const idxX = next7.findIndex(
                (d) => d.day === x.dia && d.month === x.mes
              );
              const idxY = next7.findIndex(
                (d) => d.day === y.dia && d.month === y.mes
              );
              return idxX - idxY;
            })
            .map((b) => {
              const dateStr = `${String(b.dia).padStart(2, "0")}/${String(
                b.mes
              ).padStart(2, "0")}`;
              return `${dateStr} — ${b.nome}`;
            });

          await supabase.from("notificacoes_aniversarios").insert({
            titulo: "🎂 Aniversariantes da semana",
            mensagem: lines.join("\n"),
            tipo: "semanal",
            referencia_data: todayStr,
            payload: { ids: weekBirthdays.map((b) => b.id) },
          });
          results.push(`Weekly: ${weekBirthdays.length} birthday(s)`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        today: todayStr,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
