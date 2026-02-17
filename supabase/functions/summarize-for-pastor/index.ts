import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function computeHash(stats: Record<string, any>): string {
  return JSON.stringify(stats)
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isPastor } = await callerClient.rpc('has_role', { _user_id: user.id, _role: 'pastor' })
    const { data: isManagement } = await callerClient.rpc('has_management_role', { _user_id: user.id })
    
    if (!isPastor && !isManagement) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    // Parse body
    let forceRefresh = false
    let societyId: string | null = null
    try {
      const body = await req.json()
      forceRefresh = body?.force === true
      societyId = body?.society_id || null
    } catch { /* no body */ }

    // Build queries with optional society filter
    const addFilter = (query: any) => societyId ? query.eq('society_id', societyId) : query

    // Fetch all societies for per-society grouping
    const { data: allSocieties } = await serviceClient
      .from('societies')
      .select('id, name, slug')
      .eq('active', true)
      .order('name')

    const societies = allSocieties || []

    // Fetch raw data
    const [tasksRes, transactionsRes, paymentsRes, membersRes, meetingsRes, eventsRes, plenariesRes] = await Promise.all([
      addFilter(serviceClient.from('tasks').select('id, title, status, priority, due_date, society_id')),
      addFilter(serviceClient.from('transactions').select('amount, type, description, date, society_id').order('date', { ascending: false }).limit(50)),
      serviceClient.from('membership_payments').select('amount, status, competence, member_id'),
      addFilter(serviceClient.from('members').select('id, name, active, society_id')),
      addFilter(serviceClient.from('meetings').select('id, title, date, status, meeting_notes, society_id').order('date', { ascending: false }).limit(10)),
      serviceClient.from('events').select('id, title, start_date, status, location').order('start_date', { ascending: true }).gte('start_date', new Date().toISOString()).limit(10),
      serviceClient.from('plenaries').select('id, title, date, quorum_required').order('date', { ascending: false }).limit(3),
    ])

    const members = membersRes.data || []
    const tasks = tasksRes.data || []
    const transactions = transactionsRes.data || []
    const payments = paymentsRes.data || []
    const meetingsData = meetingsRes.data || []
    const eventsData = eventsRes.data || []
    const plenariesData = plenariesRes.data || []

    // Compute per-society stats
    const societyStats: Record<string, { membersActive: number; tasksDone: number; tasksPending: number; saldo: number; totalEntradas: number; totalSaidas: number; totalMensalidades: number }> = {}
    
    for (const soc of societies) {
      const socMembers = members.filter(m => m.society_id === soc.id)
      const socMemberIds = new Set(socMembers.map(m => m.id))
      const socTasks = tasks.filter(t => t.society_id === soc.id)
      const socTrans = transactions.filter(t => t.society_id === soc.id)
      const socPayments = payments.filter(p => p.status === 'pago' && socMemberIds.has(p.member_id))
      
      const totalEntradas = socTrans.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0)
      const totalSaidas = socTrans.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0)
      const totalMensalidades = socPayments.reduce((s, p) => s + Number(p.amount), 0)
      
      societyStats[soc.id] = {
        membersActive: socMembers.filter(m => m.active).length,
        tasksDone: socTasks.filter(t => t.status === 'done').length,
        tasksPending: socTasks.filter(t => t.status !== 'done').length,
        saldo: totalMensalidades + totalEntradas - totalSaidas,
        totalEntradas,
        totalSaidas,
        totalMensalidades,
      }
    }

    // Global stats (sum of all societies)
    const globalStats = {
      membersActive: Object.values(societyStats).reduce((s, v) => s + v.membersActive, 0),
      tasksDone: Object.values(societyStats).reduce((s, v) => s + v.tasksDone, 0),
      tasksPending: Object.values(societyStats).reduce((s, v) => s + v.tasksPending, 0),
      saldo: Object.values(societyStats).reduce((s, v) => s + v.saldo, 0),
      totalEntradas: Object.values(societyStats).reduce((s, v) => s + v.totalEntradas, 0),
      totalSaidas: Object.values(societyStats).reduce((s, v) => s + v.totalSaidas, 0),
      totalMensalidades: Object.values(societyStats).reduce((s, v) => s + v.totalMensalidades, 0),
    }

    const stats = societyId ? (societyStats[societyId] || globalStats) : globalStats

    // Compute data hash for cache comparison
    const currentHash = computeHash({ globalStats, societyStats })

    // Check cache (with hash comparison)
    if (!forceRefresh) {
      const cacheQuery = serviceClient
        .from('pastor_summaries')
        .select('*')
        .eq('invalidated', false)
        .order('generated_at', { ascending: false })
        .limit(1)

      if (societyId) {
        cacheQuery.eq('society_id', societyId)
      } else {
        cacheQuery.is('society_id', null)
      }

      const { data: cached } = await cacheQuery.single()

      if (cached) {
        // If data hash matches, return cached without calling AI
        if (cached.data_hash === currentHash) {
          return new Response(JSON.stringify({
            summaries: cached.summaries,
            stats,
            society_stats: societyStats,
            meetings: cached.meetings_data,
            events: cached.events_data,
            plenaries: cached.plenaries_data,
            generated_at: cached.generated_at,
            from_cache: true,
            hash_match: true,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        // Hash changed but cache exists - return cache but mark as stale
        return new Response(JSON.stringify({
          summaries: cached.summaries,
          stats,
          society_stats: societyStats,
          meetings: cached.meetings_data,
          events: cached.events_data,
          plenaries: cached.plenaries_data,
          generated_at: cached.generated_at,
          from_cache: true,
          hash_match: false,
          data_changed: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Build per-society context for AI
    const perSocietyContext = societies.map(soc => {
      const s = societyStats[soc.id]
      const socMeetings = meetingsData.filter(m => m.society_id === soc.id)
      const socTasks = tasks.filter(t => t.society_id === soc.id && t.status !== 'done')
      return `
${soc.name}:
- Membros ativos: ${s.membersActive}
- Tarefas: ${s.tasksDone} concluídas, ${s.tasksPending} pendentes
- Saldo: R$ ${s.saldo.toFixed(2)} (Entradas: R$ ${s.totalEntradas.toFixed(2)}, Saídas: R$ ${s.totalSaidas.toFixed(2)}, Mensalidades: R$ ${s.totalMensalidades.toFixed(2)})
- Últimas reuniões: ${socMeetings.length > 0 ? socMeetings.slice(0, 2).map(m => `"${m.title}" (${m.date})`).join(', ') : 'Nenhuma'}
- Tarefas pendentes: ${socTasks.slice(0, 3).map(t => `"${t.title}" [${t.priority}]`).join(', ') || 'Nenhuma'}`
    }).join('\n')

    const dataContext = `
DADOS DA IGREJA PRESBITERIANA NOVA CIDADE (IPNC):

RESUMO POR SOCIEDADE:
${perSocietyContext}

TOTAIS GLOBAIS:
- Membros ativos: ${globalStats.membersActive}
- Tarefas concluídas: ${globalStats.tasksDone}, pendentes: ${globalStats.tasksPending}
- Saldo total: R$ ${globalStats.saldo.toFixed(2)}

PRÓXIMOS EVENTOS:
${eventsData.map(e => `- "${e.title}" em ${e.start_date}${e.location ? ` (${e.location})` : ''} - ${e.status}`).join('\n') || 'Nenhum evento próximo'}

PLENÁRIAS RECENTES:
${plenariesData.map(p => `- "${p.title}" em ${p.date} (quórum mínimo: ${p.quorum_required}%)`).join('\n') || 'Nenhuma plenária recente'}
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
            content: `Você é um assistente pastoral que resume dados da IPNC para o pastor.
Analise os dados de CADA sociedade e compare-as. Destaque:
- Quais sociedades estão mais ativas e quais precisam de atenção
- Pontos positivos e preocupações financeiras
- Tarefas atrasadas ou sociedades sem movimentação

Retorne JSON com estas chaves:
- geral: visão pastoral comparativa de todas as sociedades (4-5 frases, mencionando cada uma pelo nome)
- financas: análise financeira consolidada comparando as sociedades (2-3 frases)
- tarefas: resumo de produtividade das sociedades (2-3 frases)
- destaques: 2-3 pontos de atenção específicos para o pastor agir

Retorne APENAS JSON válido, sem markdown.`
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

    // Upsert cache
    const cacheFilter = serviceClient
      .from('pastor_summaries')
      .select('id')
      .limit(1)

    if (societyId) {
      cacheFilter.eq('society_id', societyId)
    } else {
      cacheFilter.is('society_id', null)
    }

    const { data: existing } = await cacheFilter.single()

    const cacheData = {
      summaries,
      stats,
      meetings_data: meetingsData,
      events_data: eventsData,
      plenaries_data: plenariesData,
      generated_at: generatedAt,
      invalidated: false,
      society_id: societyId,
      data_hash: currentHash,
    }

    if (existing) {
      await serviceClient.from('pastor_summaries').update(cacheData).eq('id', existing.id)
    } else {
      await serviceClient.from('pastor_summaries').insert(cacheData)
    }

    return new Response(JSON.stringify({
      summaries,
      stats,
      society_stats: societyStats,
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
