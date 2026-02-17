import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')!
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isPastor } = await callerClient.rpc('has_role', { _user_id: user.id, _role: 'pastor' })
    const { data: isManagement } = await callerClient.rpc('has_management_role', { _user_id: user.id })
    
    if (!isPastor && !isManagement) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    // Check for force parameter
    let forceRefresh = false
    try {
      const body = await req.json()
      forceRefresh = body?.force === true
    } catch { /* no body or not JSON */ }

    // Check cache first
    if (!forceRefresh) {
      const { data: cached } = await serviceClient
        .from('pastor_summaries')
        .select('*')
        .eq('invalidated', false)
        .is('society_id', null)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      if (cached) {
        return new Response(JSON.stringify({
          summaries: cached.summaries,
          stats: cached.stats,
          meetings: cached.meetings_data,
          events: cached.events_data,
          plenaries: cached.plenaries_data,
          generated_at: cached.generated_at,
          from_cache: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Fetch all data for summary
    const [meetingsRes, tasksRes, transactionsRes, paymentsRes, membersRes, eventsRes, plenariesRes] = await Promise.all([
      serviceClient.from('meetings').select('id, title, date, status, meeting_notes').order('date', { ascending: false }).limit(5),
      serviceClient.from('tasks').select('id, title, status, priority, due_date'),
      serviceClient.from('transactions').select('amount, type, description, date').order('date', { ascending: false }).limit(20),
      serviceClient.from('membership_payments').select('amount, status, competence'),
      serviceClient.from('members').select('id, name, active'),
      serviceClient.from('events').select('id, title, start_date, status, location').order('start_date', { ascending: true }).gte('start_date', new Date().toISOString()).limit(10),
      serviceClient.from('plenaries').select('id, title, date, quorum_required').order('date', { ascending: false }).limit(3),
    ])

    const transactions = transactionsRes.data || []
    const payments = paymentsRes.data || []
    const totalEntradas = transactions.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0)
    const totalSaidas = transactions.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0)
    const totalMensalidades = payments.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0)
    const saldo = totalMensalidades + totalEntradas - totalSaidas

    const tasks = tasksRes.data || []
    const tasksDone = tasks.filter(t => t.status === 'done').length
    const tasksPending = tasks.filter(t => t.status !== 'done').length
    const membersActive = (membersRes.data || []).filter(m => m.active).length

    const stats = { saldo, totalEntradas, totalSaidas, totalMensalidades, membersActive, tasksDone, tasksPending }
    const meetingsData = meetingsRes.data || []
    const eventsData = eventsRes.data || []
    const plenariesData = plenariesRes.data || []

    const dataContext = `
DADOS DA DIRETORIA - IPNC:

REUNIÕES RECENTES:
${meetingsData.map(m => `- "${m.title}" em ${m.date} (${m.status})${m.meeting_notes ? ` - Notas: ${m.meeting_notes.substring(0, 200)}` : ''}`).join('\n')}

TAREFAS:
- Concluídas: ${tasksDone}
- Pendentes: ${tasksPending}
- Total: ${tasks.length}
${tasks.filter(t => t.status !== 'done').slice(0, 5).map(t => `- [${t.priority}] "${t.title}" (${t.status})`).join('\n')}

FINANÇAS:
- Saldo atual: R$ ${saldo.toFixed(2)}
- Total mensalidades pagas: R$ ${totalMensalidades.toFixed(2)}
- Entradas (transações): R$ ${totalEntradas.toFixed(2)}
- Saídas (transações): R$ ${totalSaidas.toFixed(2)}

MEMBROS: ${membersActive} ativos

PRÓXIMOS EVENTOS:
${eventsData.map(e => `- "${e.title}" em ${e.start_date}${e.location ? ` (${e.location})` : ''} - ${e.status}`).join('\n')}

PLENÁRIAS RECENTES:
${plenariesData.map(p => `- "${p.title}" em ${p.date} (quórum mínimo: ${p.quorum_required}%)`).join('\n')}
`

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que resume informações da diretoria da IPNC para o pastor da igreja. 
Gere um resumo claro, organizado e pastoral de cada seção. Use linguagem respeitosa e profissional.
Retorne o resumo em formato JSON com as seguintes chaves:
- reunioes: resumo das reuniões recentes (2-3 frases)
- financas: resumo financeiro (2-3 frases)
- tarefas: resumo das tarefas (2-3 frases)
- eventos: resumo dos próximos eventos (2-3 frases)
- plenarias: resumo das plenárias (2-3 frases)
- geral: uma visão geral pastoral do progresso da diretoria (3-4 frases)
Retorne APENAS o JSON válido, sem markdown.`
          },
          { role: 'user', content: dataContext }
        ],
      }),
    })

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw new Error('AI gateway error')
    }

    const aiData = await aiResponse.json()
    const content = aiData.choices?.[0]?.message?.content || '{}'
    
    let summaries
    try {
      summaries = JSON.parse(content)
    } catch {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      summaries = match ? JSON.parse(match[1]) : { geral: content }
    }

    const generatedAt = new Date().toISOString()

    // Save to cache using upsert
    const { data: existing } = await serviceClient
      .from('pastor_summaries')
      .select('id')
      .is('society_id', null)
      .limit(1)
      .single()

    if (existing) {
      await serviceClient.from('pastor_summaries').update({
        summaries,
        stats,
        meetings_data: meetingsData,
        events_data: eventsData,
        plenaries_data: plenariesData,
        generated_at: generatedAt,
        invalidated: false,
      }).eq('id', existing.id)
    } else {
      await serviceClient.from('pastor_summaries').insert({
        summaries,
        stats,
        meetings_data: meetingsData,
        events_data: eventsData,
        plenaries_data: plenariesData,
        generated_at: generatedAt,
        invalidated: false,
      })
    }

    return new Response(JSON.stringify({
      summaries,
      stats,
      meetings: meetingsData,
      events: eventsData,
      plenaries: plenariesData,
      generated_at: generatedAt,
      from_cache: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('summarize-for-pastor error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
