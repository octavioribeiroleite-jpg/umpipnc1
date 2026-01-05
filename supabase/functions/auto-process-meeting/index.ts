import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId } = await req.json();
    console.log('Auto-processing meeting:', meetingId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create admin client for full access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has management role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasManagement = roles?.some(r => ['admin', 'diretoria'].includes(r.role));
    if (!hasManagement) {
      return new Response(JSON.stringify({ error: 'Apenas diretoria pode processar reuniões.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== STEP 1: Fetch meeting data =====
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error('Meeting not found');
    }

    console.log('Meeting found:', meeting.title);

    // Fetch agenda items
    const { data: agendaItems } = await supabaseAdmin
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('order_index');

    // Fetch profiles for names
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name');

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    // Fetch participants
    const { data: participants } = await supabaseAdmin
      .from('meeting_participants')
      .select('user_id')
      .eq('meeting_id', meetingId);

    const participantNames = (participants || [])
      .map(p => profileMap.get(p.user_id))
      .filter(Boolean);

    const moderatorName = profileMap.get(meeting.moderator_id) || 'Desconhecido';

    // Get content to process - prefer meeting_notes (new flow) over contributions (old flow)
    let contentToProcess = '';
    
    if (meeting.meeting_notes && meeting.meeting_notes.trim()) {
      // New flow: use meeting_notes directly
      contentToProcess = meeting.meeting_notes;
      console.log('Using meeting_notes for processing');
    } else {
      // Old flow: use contributions
      const { data: contributions } = await supabaseAdmin
        .from('contributions')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('status', 'revealed');

      contentToProcess = (contributions || []).map(c => {
        const name = profileMap.get(c.user_id) || 'Anônimo';
        return `[${name}]: ${c.content}`;
      }).join('\n');
      console.log(`Using ${contributions?.length || 0} contributions for processing`);
    }

    console.log(`Content length: ${contentToProcess.length} characters`);

    // ===== STEP 2: Organize with AI =====
    const organizeSystemPrompt = `Você é um assistente para organizar reuniões de igreja. 
Analise o texto da reunião e organize em categorias.

REGRAS:
1. Mantenha a essência mas melhore a redação
2. Agrupe itens semelhantes
3. Seja objetivo e claro
4. Identifique títulos/seções escritos pelo usuário e use-os

CATEGORIAS DISPONÍVEIS (use exatamente estes valores):
- decisoes: Decisões tomadas
- tarefas: Ações a serem feitas
- pendencias: Itens pendentes
- datas_prazos: Datas e prazos importantes
- observacoes: Observações gerais

Retorne um JSON assim:
{
  "items": [
    {"category": "decisoes", "content": "Texto da decisão"},
    {"category": "tarefas", "content": "Texto da tarefa"}
  ]
}`;

    const pautaText = (agendaItems || []).map((item, i) => `${i + 1}. ${item.title}`).join('\n');
    
    const organizeUserPrompt = `PAUTA:\n${pautaText || 'Sem pauta definida'}\n\nREGISTRO DA REUNIÃO:\n${contentToProcess || 'Sem conteúdo'}`;

    console.log('Calling AI to organize content...');
    
    const organizeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: organizeSystemPrompt },
          { role: "user", content: organizeUserPrompt }
        ],
      }),
    });

    if (!organizeResponse.ok) {
      const status = organizeResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA insuficientes.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI organize error: ${status}`);
    }

    const organizeData = await organizeResponse.json();
    const organizeContent = organizeData.choices?.[0]?.message?.content || '';
    console.log('AI organize response received');

    // Parse organized items
    let organizedItems: Array<{category: string, content: string}> = [];
    try {
      const jsonMatch = organizeContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        organizedItems = parsed.items || [];
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
      organizedItems = [];
    }

    console.log(`Organized into ${organizedItems.length} items`);

    // Save to ai_suggestions
    await supabaseAdmin.from('ai_suggestions').delete().eq('meeting_id', meetingId);
    
    if (organizedItems.length > 0) {
      const suggestions = organizedItems.map(item => ({
        meeting_id: meetingId,
        category: item.category,
        original_content: item.content,
        status: 'accepted',
      }));

      await supabaseAdmin.from('ai_suggestions').insert(suggestions);
    }

    // Mark as AI organized
    await supabaseAdmin.from('meetings').update({ ai_organized: true }).eq('id', meetingId);

    // ===== STEP 3: Generate Final Minutes with AI Formatting =====
    const categoryMapping: Record<string, string> = {
      'decisoes': 'DELIBERAÇÕES',
      'tarefas': 'ENCAMINHAMENTOS',
      'pendencias': 'PENDÊNCIAS',
      'datas_prazos': 'ENCAMINHAMENTOS',
      'observacoes': 'OBSERVAÇÕES',
    };

    const grouped = organizedItems.reduce((acc, item) => {
      const mappedCategory = categoryMapping[item.category] || 'OBSERVAÇÕES';
      if (!acc[mappedCategory]) acc[mappedCategory] = [];
      acc[mappedCategory].push(item.content);
      return acc;
    }, {} as Record<string, string[]>);

    // Build raw content for formatting
    const rawLines: string[] = [
      `Reunião: ${meeting.title}`,
      `Data: ${new Date(meeting.date).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      `Moderador: ${moderatorName}`,
      `Participantes: ${participantNames.join(', ') || 'Não informado'}`,
      '',
    ];

    if (agendaItems && agendaItems.length > 0) {
      rawLines.push('PAUTA:');
      agendaItems.forEach((item) => {
        rawLines.push(`${item.title}${item.description ? ' - ' + item.description : ''}`);
      });
      rawLines.push('');
    }

    // Add organized items by mapped category
    const categoryOrder = ['DELIBERAÇÕES', 'ENCAMINHAMENTOS', 'PENDÊNCIAS', 'OBSERVAÇÕES'];
    categoryOrder.forEach(cat => {
      if (grouped[cat] && grouped[cat].length > 0) {
        rawLines.push(`${cat}:`);
        grouped[cat].forEach(item => {
          rawLines.push(item);
        });
        rawLines.push('');
      }
    });

    const rawContent = rawLines.join('\n');

    // Format with AI
    const formatSystemPrompt = `Organize o conteúdo recebido em formato de ATA FORMAL, mantendo exatamente as informações apresentadas, sem alterar, interpretar ou acrescentar conteúdo.

OBJETIVO:
Apenas FORMATAR o texto de forma clara, organizada e institucional.

REGRAS GERAIS:
- NÃO alterar o conteúdo.
- NÃO criar, remover ou reinterpretar informações.
- NÃO resumir.
- Apenas reorganizar visualmente.

ESTRUTURA FIXA DA ATA (NESTA ORDEM):
PAUTA
DELIBERAÇÕES
ENCAMINHAMENTOS
PENDÊNCIAS
OBSERVAÇÕES

REGRAS DE FORMATAÇÃO (OBRIGATÓRIAS):
- Gerar a ata em TEXTO PURO, SEM qualquer formatação markdown.
- NÃO usar asteriscos (*), hashtags (#), traços (-) ou qualquer símbolo de formatação.
- Títulos das seções devem estar em CAIXA ALTA (ex: PAUTA, DELIBERAÇÕES).
- O conteúdo de cada seção deve ser apresentado em parágrafos separados.
- Usar frases curtas e objetivas.
- Separar seções com UMA linha em branco.
- Separar itens dentro de uma seção com quebra de linha simples.
- Manter linguagem formal e institucional.

FORMATO DE SAÍDA:
- Retornar apenas o texto final da ata.
- Não incluir comentários, explicações ou observações adicionais.`;

    console.log('Calling AI to format minutes...');

    const formatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: formatSystemPrompt },
          { role: "user", content: rawContent }
        ],
      }),
    });

    let finalMinutes = '';
    if (formatResponse.ok) {
      const formatData = await formatResponse.json();
      finalMinutes = formatData.choices?.[0]?.message?.content || '';
      console.log('Minutes formatted by AI');
    } else {
      // Fallback: use raw content if formatting fails
      console.error('Formatting failed, using raw content');
      finalMinutes = `ATA DE REUNIÃO\n\n${rawContent}\n\nAta gerada automaticamente pelo sistema.`;
    }

    // ===== STEP 4: Generate WhatsApp Message =====
    const whatsappSystemPrompt = `Você é o comunicador oficial da UMP (União de Mocidade Presbiteriana) da IPNC.
Sua tarefa é transformar a ata da reunião em uma mensagem de WhatsApp ANIMADA e ORGANIZADA.

TOM E LINGUAGEM:
- Fale como jovem para jovens (informal mas respeitoso)
- Use expressões como "Fala, galera!", "Bora!", "Partiu!", "Cola com a gente!"
- Seja animado e convidativo
- Emojis são bem-vindos (mas sem exagero)

ESTRUTURA OBRIGATÓRIA (nesta ordem):
═══════════════════════════════════
1. SAUDAÇÃO
   Ex: "Fala, galera da UMP! 🙌"

2. RESUMO RÁPIDO (1-2 frases)
   Ex: "Passando pra deixar vocês por dentro do que rolou na nossa última reunião!"

3. AGENDA - PRÓXIMOS EVENTOS
   Título: *📅 AGENDA DA GALERA:*
   
   Formato OBRIGATÓRIO para cada evento:
   DD/MM/AAAA: NOME DO EVENTO
   📍 Local | ⏰ Horário
   → Descrição curta e animada

4. INFORMES IMPORTANTES (se houver)
   Título: *📢 FICA LIGADO:*

5. ENCERRAMENTO ANIMADO
   Ex: "Contamos com vocês! Bora fazer acontecer! 🔥"
═══════════════════════════════════

EXEMPLO DE MENSAGEM IDEAL:
---
Fala, galera da UMP! 🙌

Passando pra deixar vocês ligados no que vem por aí!

*📅 AGENDA DA GALERA:*

18/05/2026: LUAL DA UMP 🌙
📍 Jardim Camburi | ⏰ 20h
→ Cola com a gente pra um momento de comunhão à beira-mar!

19/05/2026: ESTUDO BÍBLICO 📖
📍 Casa do irmão Octávio | ⏰ 19h30
→ Série especial sobre fé e propósito. Não perde!

25/05/2026: EVANGELIZAÇÃO 🙏
📍 Praça Central | ⏰ 15h
→ Dia de compartilhar o amor de Cristo!

*📢 FICA LIGADO:*
• Confirma presença no grupo!
• Traga um amigo pro lual!

Contamos com vocês! Bora fazer acontecer! 🔥

Paz do Senhor! ✝️
---

REGRAS TÉCNICAS:
- Use *asterisco único* para negrito (não use **)
- Máximo 400 palavras
- DATA SEMPRE PRIMEIRO no formato DD/MM/AAAA
- Separe seções com quebra de linha
- NÃO inclua detalhes administrativos internos`;

    const whatsappUserPrompt = `Transforme esta ata em mensagem de WhatsApp para os membros:\n\n${finalMinutes}`;

    console.log('Calling AI to generate WhatsApp message...');

    const whatsappResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: whatsappSystemPrompt },
          { role: "user", content: whatsappUserPrompt }
        ],
      }),
    });

    if (!whatsappResponse.ok) {
      console.error('WhatsApp generation failed, continuing without it');
    }

    let whatsappMessage = '';
    if (whatsappResponse.ok) {
      const whatsappData = await whatsappResponse.json();
      whatsappMessage = whatsappData.choices?.[0]?.message?.content || '';
      console.log('WhatsApp message generated');
    }

    // ===== STEP 5: Extract and create calendar events =====
    console.log('Extracting events from meeting content...');
    
    const eventsSystemPrompt = `Você é um assistente que extrai eventos e compromissos de atas de reunião.
Analise o conteúdo e extraia APENAS decisões confirmadas com datas objetivas.

REGRAS IMPORTANTES:
- Extraia apenas eventos CONFIRMADOS com datas DEFINIDAS
- NÃO extraia ideias soltas, sugestões ou eventos sem data
- Para cada evento, identifique: título, data, horário (se disponível), local (se disponível)
- Se não houver hora específica, use 09:00 como padrão
- Formato de data deve ser ISO 8601 (YYYY-MM-DDTHH:mm:ss)
- Se o ano não for especificado, assuma ${new Date().getFullYear()}
- Eventos devem ser FUTUROS (ignore eventos passados)

Você DEVE responder APENAS com a chamada da função extract_events.`;

    const eventsUserPrompt = `Extraia os eventos desta ata de reunião:\n\n${finalMinutes}`;

    const eventsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: eventsSystemPrompt },
          { role: "user", content: eventsUserPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_events",
            description: "Extrair eventos do texto da ata de reunião",
            parameters: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Nome do evento" },
                      start_date: { type: "string", description: "Data e hora de início no formato ISO 8601" },
                      end_date: { type: "string", description: "Data e hora de término no formato ISO 8601 (opcional)" },
                      location: { type: "string", description: "Local do evento (opcional)" },
                      description: { type: "string", description: "Descrição breve do evento" },
                      all_day: { type: "boolean", description: "Se é evento de dia inteiro" }
                    },
                    required: ["title", "start_date"]
                  }
                }
              },
              required: ["events"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_events" } }
      }),
    });

    let eventsCreated = 0;
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      const toolCall = eventsData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          const extractedEvents = parsed.events || [];
          
          console.log(`Extracted ${extractedEvents.length} events from meeting`);
          
          for (const event of extractedEvents) {
            // Validate the date is valid
            const startDate = new Date(event.start_date);
            if (isNaN(startDate.getTime())) {
              console.log(`Skipping event with invalid date: ${event.title}`);
              continue;
            }
            
            // Skip events in the past
            if (startDate < new Date()) {
              console.log(`Skipping past event: ${event.title}`);
              continue;
            }
            
            // Check if event on same date already exists for this meeting (by date, not title)
            const eventDate = new Date(event.start_date);
            const startOfDay = new Date(eventDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(eventDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            const { data: existingEvent } = await supabaseAdmin
              .from('events')
              .select('id')
              .eq('reuniao_id', meetingId)
              .gte('start_date', startOfDay.toISOString())
              .lte('start_date', endOfDay.toISOString())
              .maybeSingle();
            
            if (existingEvent) {
              console.log(`Event already exists for this date, skipping: ${event.title}`);
              continue;
            }
            
            const { error: eventError } = await supabaseAdmin
              .from('events')
              .insert({
                title: event.title,
                start_date: event.start_date,
                end_date: event.end_date || null,
                location: event.location || null,
                description: event.description || `Evento criado automaticamente da reunião: ${meeting.title}`,
                all_day: event.all_day || false,
                created_by: user.id,
                color: '#8b5cf6', // Purple color for auto-created events
                status: 'confirmado',
                origem: 'reuniao',
                reuniao_id: meetingId
              });
            
            if (eventError) {
              console.error(`Error creating event ${event.title}:`, eventError);
            } else {
              eventsCreated++;
              console.log(`Created event: ${event.title}`);
            }
          }
        } catch (parseError) {
          console.error('Error parsing events:', parseError);
        }
      }
    } else {
      console.error('Events extraction failed, continuing without it');
    }
    
    console.log(`Total events created: ${eventsCreated}`);

    // ===== STEP 6: Extract and create tasks =====
    console.log('Extracting tasks from meeting content...');
    
    // Build a list of available assignees for the AI
    const activeProfiles = profiles?.filter(p => p.full_name) || [];
    const assigneeList = activeProfiles.map(p => `- "${p.full_name}" (ID: ${p.user_id})`).join('\n');
    
    const tasksSystemPrompt = `Você é um assistente que extrai tarefas e encaminhamentos de atas de reunião.
Analise o conteúdo e extraia APENAS tarefas que foram claramente atribuídas ou decididas.

REGRAS IMPORTANTES:
- Extraia tarefas com responsável identificado (pessoa ficou de fazer algo)
- Identifique: título da tarefa, responsável (se mencionado), prazo (se mencionado), prioridade
- Prioridade: "low" (rotineira), "medium" (normal), "high" (urgente ou importante)
- Se uma data limite for mencionada, extraia-a no formato YYYY-MM-DD
- NÃO extraia tarefas genéricas sem ação clara
- Se não conseguir identificar quem vai fazer, deixe assignee_id vazio

MEMBROS DISPONÍVEIS PARA ATRIBUIÇÃO:
${assigneeList || 'Nenhum membro cadastrado'}

IMPORTANTE: Use EXATAMENTE o ID listado acima para o campo assignee_id.
Se o nome mencionado não estiver na lista ou for ambíguo, deixe assignee_id vazio.

Você DEVE responder APENAS com a chamada da função extract_tasks.`;

    const tasksUserPrompt = `Extraia as tarefas e encaminhamentos desta ata de reunião:\n\n${finalMinutes}\n\nRegistro original:\n${contentToProcess}`;

    const tasksResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: tasksSystemPrompt },
          { role: "user", content: tasksUserPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_tasks",
            description: "Extrair tarefas do texto da ata de reunião",
            parameters: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Título da tarefa (ação a ser feita)" },
                      description: { type: "string", description: "Descrição adicional da tarefa (opcional)" },
                      assignee_id: { type: "string", description: "UUID do responsável (da lista de membros)" },
                      assignee_name: { type: "string", description: "Nome do responsável mencionado (para log)" },
                      due_date: { type: "string", description: "Data limite no formato YYYY-MM-DD (opcional)" },
                      priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioridade da tarefa" }
                    },
                    required: ["title", "priority"]
                  }
                }
              },
              required: ["tasks"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_tasks" } }
      }),
    });

    let tasksCreated = 0;
    if (tasksResponse.ok) {
      const tasksData = await tasksResponse.json();
      const toolCall = tasksData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          const extractedTasks = parsed.tasks || [];
          
          console.log(`Extracted ${extractedTasks.length} tasks from meeting`);
          
          for (const task of extractedTasks) {
            // Validate assignee_id if provided
            let validAssigneeId = null;
            if (task.assignee_id) {
              const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.assignee_id);
              const assigneeExists = activeProfiles.some(p => p.user_id === task.assignee_id);
              if (isValidUUID && assigneeExists) {
                validAssigneeId = task.assignee_id;
              } else {
                console.log(`Invalid assignee_id for task "${task.title}", setting to null. Mentioned: ${task.assignee_name || 'unknown'}`);
              }
            }
            
            // Validate due_date if provided
            let validDueDate = null;
            if (task.due_date) {
              const dateMatch = task.due_date.match(/^\d{4}-\d{2}-\d{2}$/);
              if (dateMatch) {
                const parsedDate = new Date(task.due_date);
                if (!isNaN(parsedDate.getTime())) {
                  validDueDate = task.due_date;
                }
              }
            }
            
            // Check if similar task already exists for this meeting (using ILIKE for case-insensitive match)
            const { data: existingTasks } = await supabaseAdmin
              .from('tasks')
              .select('id, title')
              .eq('meeting_id', meetingId);
            
            // Check for similar titles (normalize and compare)
            const normalizedNewTitle = task.title.toLowerCase().trim();
            const similarTask = existingTasks?.find(t => {
              const normalizedExisting = t.title.toLowerCase().trim();
              // Check if titles are very similar (contain same key words)
              return normalizedExisting === normalizedNewTitle || 
                     normalizedExisting.includes(normalizedNewTitle) ||
                     normalizedNewTitle.includes(normalizedExisting);
            });
            
            if (similarTask) {
              console.log(`Similar task already exists, skipping: "${task.title}" (matches: "${similarTask.title}")`);
              continue;
            }
            
            const { error: taskError } = await supabaseAdmin
              .from('tasks')
              .insert({
                title: task.title,
                description: task.description || null,
                status: 'todo',
                priority: task.priority || 'medium',
                due_date: validDueDate,
                assignee_id: validAssigneeId,
                meeting_id: meetingId,
                created_by: user.id,
              });
            
            if (taskError) {
              console.error(`Error creating task "${task.title}":`, taskError);
            } else {
              tasksCreated++;
              console.log(`Created task: "${task.title}" ${validAssigneeId ? `assigned to ${task.assignee_name}` : '(unassigned)'}`);
            }
          }
        } catch (parseError) {
          console.error('Error parsing tasks:', parseError);
        }
      }
    } else {
      console.error('Tasks extraction failed, continuing without it');
    }
    
    console.log(`Total tasks created: ${tasksCreated}`);

    // ===== STEP 7: Save everything =====
    const { error: updateError } = await supabaseAdmin
      .from('meetings')
      .update({
        ai_organized: true,
        contributions_revealed: true,
        final_minutes: finalMinutes,
        whatsapp_message: whatsappMessage || null,
      })
      .eq('id', meetingId);

    if (updateError) {
      console.error('Error updating meeting:', updateError);
      throw updateError;
    }

    console.log('Meeting fully processed successfully');

    return new Response(JSON.stringify({
      success: true,
      organizedItems: organizedItems.length,
      hasMinutes: true,
      hasWhatsApp: !!whatsappMessage,
      eventsCreated: eventsCreated,
      tasksCreated: tasksCreated,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in auto-process-meeting:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
