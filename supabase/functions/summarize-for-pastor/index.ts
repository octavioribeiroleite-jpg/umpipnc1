import { aiChat as openAIChat } from "../_shared/ai-chat.ts";
import { serverLimiter } from "../_shared/server-limiter.ts";
import { resolveAiActor } from "../_shared/ai-actor.ts";
import { canSummarizeYear } from "../_shared/ai-auth-policy.ts";
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

    const actor = await resolveAiActor(serviceClient, authHeader)
    if (!actor) return Response.json({ error: 'Faça login novamente.' }, { status: 401, headers: corsHeaders })
    if (!actor.roles.includes('admin') && !actor.roles.includes('pastor')) {
      societyId = societyId || actor.societyId
      if (!societyId || !canSummarizeYear(actor, societyId)) {
        return Response.json({ error: 'Sem permissão para esta sociedade.' }, { status: 403, headers: corsHeaders })
      }
    }

    // ====== SOCIETY-SPECIFIC MODE ======
    if (societyId) {
      return await handleSocietySpecific(serviceClient, societyId, forceRefresh, corsHeaders, actor.userId)
    }

    // ====== GLOBAL MODE (all societies) ======
    return await handleGlobal(serviceClient, forceRefresh, corsHeaders, actor.userId)

  } catch (error) {
    console.error('summarize-for-pastor error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ========== SOCIETY-SPECIFIC: fetch only data for one society ==========
async function handleSocietySpecific(
  serviceClient: any, societyId: string, forceRefresh: boolean, corsHeaders: Record<string, string>, actorId: string
) {
  // Get society info
  const { data: society } = await serviceClient
    .from('societies').select('id, name, slug').eq('id', societyId).single()

  if (!society) {
    return new Response(JSON.stringify({ error: 'Sociedade não encontrada' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Fetch data filtered by this society
  const [tasksRes, transactionsRes, membersRes, meetingsRes, eventsRes] = await Promise.all([
    serviceClient.from('tasks').select('id, title, status, priority, due_date, society_id').eq('society_id', societyId),
    serviceClient.from('transactions').select('amount, type, description, date, society_id').eq('society_id', societyId).order('date', { ascending: false }).limit(50),
    serviceClient.from('members').select('id, name, active, society_id').eq('society_id', societyId),
    serviceClient.from('meetings').select('id, title, date, status, meeting_notes, society_id').eq('society_id', societyId).order('date', { ascending: false }).limit(10),
    serviceClient.from('events').select('id, title, start_date, status, location, society_id').or(`society_id.eq.${societyId},society_id.is.null`).order('start_date', { ascending: true }).gte('start_date', new Date().toISOString()).limit(10),
  ])

  const members = membersRes.data || []
  const tasks = tasksRes.data || []
  const transactions = transactionsRes.data || []
  const meetingsData = meetingsRes.data || []
  const eventsData = eventsRes.data || []

  // Fetch payments only for members of this society
  const memberIds = members.map((m: any) => m.id)
  let payments: any[] = []
  if (memberIds.length > 0) {
    const { data: paymentsData } = await serviceClient
      .from('membership_payments')
      .select('amount, status, competence, member_id')
      .in('member_id', memberIds)
      .eq('status', 'pago')
    payments = paymentsData || []
  }

  // Compute stats for this society only
  const totalEntradas = transactions.filter((t: any) => t.type === 'entrada').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const totalSaidas = transactions.filter((t: any) => t.type === 'saida').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const totalMensalidades = payments.reduce((s: number, p: any) => s + Number(p.amount), 0)

  const stats = {
    membersActive: members.filter((m: any) => m.active).length,
    tasksDone: tasks.filter((t: any) => t.status === 'done').length,
    tasksPending: tasks.filter((t: any) => t.status !== 'done').length,
    saldo: totalMensalidades + totalEntradas - totalSaidas,
    totalEntradas,
    totalSaidas,
    totalMensalidades,
  }

  const currentHash = computeHash(stats)

  // Check cache
  if (!forceRefresh) {
    const { data: cached } = await serviceClient
      .from('pastor_summaries')
      .select('*')
      .eq('invalidated', false)
      .eq('society_id', societyId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (cached) {
      if (cached.data_hash === currentHash) {
        return new Response(JSON.stringify({
          summaries: cached.summaries, stats, society_stats: { [societyId]: stats },
          meetings: cached.meetings_data, events: cached.events_data,
          plenaries: cached.plenaries_data, generated_at: cached.generated_at,
          from_cache: true, hash_match: true,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({
        summaries: cached.summaries, stats, society_stats: { [societyId]: stats },
        meetings: cached.meetings_data, events: cached.events_data,
        plenaries: cached.plenaries_data, generated_at: cached.generated_at,
        from_cache: true, hash_match: false, data_changed: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  // Build AI context for THIS society only
  const pendingTasks = tasks.filter((t: any) => t.status !== 'done')
  const dataContext = `
DADOS DA SOCIEDADE: ${society.name} (IPNC)

MEMBROS:
- Membros ativos: ${stats.membersActive}

FINANÇAS:
- Saldo: R$ ${stats.saldo.toFixed(2)}
- Entradas: R$ ${totalEntradas.toFixed(2)}
- Saídas: R$ ${totalSaidas.toFixed(2)}
- Mensalidades pagas: R$ ${totalMensalidades.toFixed(2)}

TAREFAS:
- Concluídas: ${stats.tasksDone}
- Pendentes: ${stats.tasksPending}
${pendingTasks.length > 0 ? '- Tarefas pendentes: ' + pendingTasks.slice(0, 5).map((t: any) => `"${t.title}" [${t.priority}]`).join(', ') : ''}

ÚLTIMAS REUNIÕES:
${meetingsData.length > 0 ? meetingsData.slice(0, 5).map((m: any) => `- "${m.title}" (${m.date}) - ${m.status}`).join('\n') : 'Nenhuma reunião registrada'}

PRÓXIMOS EVENTOS:
${eventsData.map((e: any) => `- "${e.title}" em ${e.start_date}${e.location ? ` (${e.location})` : ''} - ${e.status}${!e.society_id ? ' (evento geral da igreja)' : ''}`).join('\n') || 'Nenhum evento próximo'}
`

  const rate = await serverLimiter(corsHeaders).aiGeneration({ actor: `user:${actorId}` })
  if (!rate.allowed) return rate.response
  const aiResponse = await openAIChat({

      messages: [
        {
          role: 'system',
          content: `Você é um assistente pastoral que resume dados da sociedade ${society.name} da IPNC para o pastor.
Analise APENAS os dados desta sociedade específica. NÃO mencione outras sociedades.
Destaque:
- Situação financeira da sociedade
- Produtividade nas tarefas
- Frequência de reuniões
- Pontos que precisam de atenção pastoral

Retorne JSON com estas chaves:
- geral: visão pastoral da sociedade ${society.name} (3-4 frases)
- financas: análise financeira da sociedade (2-3 frases)
- tarefas: resumo de produtividade (2-3 frases)
- destaques: 2-3 pontos de atenção específicos para o pastor agir

Retorne APENAS JSON válido, sem markdown.`
        },
        { role: 'user', content: dataContext }
      ],
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
  const { data: existing } = await serviceClient
    .from('pastor_summaries').select('id').eq('society_id', societyId).limit(1).single()

  const cacheData = {
    summaries, stats, meetings_data: meetingsData, events_data: eventsData,
    plenaries_data: [], generated_at: generatedAt, invalidated: false,
    society_id: societyId, data_hash: currentHash,
  }

  if (existing) {
    await serviceClient.from('pastor_summaries').update(cacheData).eq('id', existing.id)
  } else {
    await serviceClient.from('pastor_summaries').insert(cacheData)
  }

  return new Response(JSON.stringify({
    summaries, stats, society_stats: { [societyId]: stats },
    meetings: meetingsData, events: eventsData, plenaries: [],
    generated_at: generatedAt, from_cache: false,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// ========== GLOBAL: fetch all societies, compare ==========
async function handleGlobal(
  serviceClient: any, forceRefresh: boolean, corsHeaders: Record<string, string>, actorId: string
) {
  const { data: allSocieties } = await serviceClient
    .from('societies').select('id, name, slug').eq('active', true).order('name')

  const societies = allSocieties || []

  const [tasksRes, transactionsRes, paymentsRes, membersRes, meetingsRes, eventsRes, plenariesRes] = await Promise.all([
    serviceClient.from('tasks').select('id, title, status, priority, due_date, society_id'),
    serviceClient.from('transactions').select('amount, type, description, date, society_id').order('date', { ascending: false }).limit(50),
    serviceClient.from('membership_payments').select('amount, status, competence, member_id'),
    serviceClient.from('members').select('id, name, active, society_id'),
    serviceClient.from('meetings').select('id, title, date, status, meeting_notes, society_id').order('date', { ascending: false }).limit(10),
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
  const societyStats: Record<string, any> = {}
  for (const soc of societies) {
    const socMembers = members.filter((m: any) => m.society_id === soc.id)
    const socMemberIds = new Set(socMembers.map((m: any) => m.id))
    const socTasks = tasks.filter((t: any) => t.society_id === soc.id)
    const socTrans = transactions.filter((t: any) => t.society_id === soc.id)
    const socPayments = payments.filter((p: any) => p.status === 'pago' && socMemberIds.has(p.member_id))

    const totalEntradas = socTrans.filter((t: any) => t.type === 'entrada').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const totalSaidas = socTrans.filter((t: any) => t.type === 'saida').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const totalMensalidades = socPayments.reduce((s: number, p: any) => s + Number(p.amount), 0)

    societyStats[soc.id] = {
      membersActive: socMembers.filter((m: any) => m.active).length,
      tasksDone: socTasks.filter((t: any) => t.status === 'done').length,
      tasksPending: socTasks.filter((t: any) => t.status !== 'done').length,
      saldo: totalMensalidades + totalEntradas - totalSaidas,
      totalEntradas, totalSaidas, totalMensalidades,
    }
  }

  const globalStats = {
    membersActive: Object.values(societyStats).reduce((s: number, v: any) => s + v.membersActive, 0),
    tasksDone: Object.values(societyStats).reduce((s: number, v: any) => s + v.tasksDone, 0),
    tasksPending: Object.values(societyStats).reduce((s: number, v: any) => s + v.tasksPending, 0),
    saldo: Object.values(societyStats).reduce((s: number, v: any) => s + v.saldo, 0),
    totalEntradas: Object.values(societyStats).reduce((s: number, v: any) => s + v.totalEntradas, 0),
    totalSaidas: Object.values(societyStats).reduce((s: number, v: any) => s + v.totalSaidas, 0),
    totalMensalidades: Object.values(societyStats).reduce((s: number, v: any) => s + v.totalMensalidades, 0),
  }

  const currentHash = computeHash({ globalStats, societyStats })

  // Check cache
  if (!forceRefresh) {
    const { data: cached } = await serviceClient
      .from('pastor_summaries').select('*').eq('invalidated', false)
      .is('society_id', null).order('generated_at', { ascending: false }).limit(1).single()

    if (cached) {
      if (cached.data_hash === currentHash) {
        return new Response(JSON.stringify({
          summaries: cached.summaries, stats: globalStats, society_stats: societyStats,
          meetings: cached.meetings_data, events: cached.events_data,
          plenaries: cached.plenaries_data, generated_at: cached.generated_at,
          from_cache: true, hash_match: true,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({
        summaries: cached.summaries, stats: globalStats, society_stats: societyStats,
        meetings: cached.meetings_data, events: cached.events_data,
        plenaries: cached.plenaries_data, generated_at: cached.generated_at,
        from_cache: true, hash_match: false, data_changed: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  // Build per-society context for AI
  const perSocietyContext = societies.map((soc: any) => {
    const s = societyStats[soc.id]
    const socMeetings = meetingsData.filter((m: any) => m.society_id === soc.id)
    const socTasks = tasks.filter((t: any) => t.society_id === soc.id && t.status !== 'done')
    return `
${soc.name}:
- Membros ativos: ${s.membersActive}
- Tarefas: ${s.tasksDone} concluídas, ${s.tasksPending} pendentes
- Saldo: R$ ${s.saldo.toFixed(2)} (Entradas: R$ ${s.totalEntradas.toFixed(2)}, Saídas: R$ ${s.totalSaidas.toFixed(2)}, Mensalidades: R$ ${s.totalMensalidades.toFixed(2)})
- Últimas reuniões: ${socMeetings.length > 0 ? socMeetings.slice(0, 2).map((m: any) => `"${m.title}" (${m.date})`).join(', ') : 'Nenhuma'}
- Tarefas pendentes: ${socTasks.slice(0, 3).map((t: any) => `"${t.title}" [${t.priority}]`).join(', ') || 'Nenhuma'}`
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
${eventsData.map((e: any) => `- "${e.title}" em ${e.start_date}${e.location ? ` (${e.location})` : ''} - ${e.status}`).join('\n') || 'Nenhum evento próximo'}

PLENÁRIAS RECENTES:
${plenariesData.map((p: any) => `- "${p.title}" em ${p.date} (quórum mínimo: ${p.quorum_required}%)`).join('\n') || 'Nenhuma plenária recente'}
`

  const rate = await serverLimiter(corsHeaders).aiGeneration({ actor: `user:${actorId}` })
  if (!rate.allowed) return rate.response
  const aiResponse = await openAIChat({

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
    })

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições excedido.' }), {
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

  const { data: existing } = await serviceClient
    .from('pastor_summaries').select('id').is('society_id', null).limit(1).single()

  const cacheData = {
    summaries, stats: globalStats, meetings_data: meetingsData, events_data: eventsData,
    plenaries_data: plenariesData, generated_at: generatedAt, invalidated: false,
    society_id: null, data_hash: currentHash,
  }

  if (existing) {
    await serviceClient.from('pastor_summaries').update(cacheData).eq('id', existing.id)
  } else {
    await serviceClient.from('pastor_summaries').insert(cacheData)
  }

  return new Response(JSON.stringify({
    summaries, stats: globalStats, society_stats: societyStats,
    meetings: meetingsData, events: eventsData, plenaries: plenariesData,
    generated_at: generatedAt, from_cache: false,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
