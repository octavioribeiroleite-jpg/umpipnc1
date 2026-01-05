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
- Gerar a ata em TEXTO LIMPO.
- NÃO utilizar markdown técnico (#, listas com traços, blocos de código).
- NÃO utilizar asteriscos soltos ou símbolos decorativos.
- Os títulos das seções devem estar em **NEGRITO**.
- O conteúdo de cada seção deve ser apresentado em parágrafos separados.
- Usar frases curtas e objetivas.
- Separar seções apenas com linhas em branco.
- Não numerar itens, exceto quando absolutamente necessário.
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
      finalMinutes = `**ATA DE REUNIÃO**\n\n${rawContent}\n\n*Ata gerada automaticamente pelo sistema.*`;
    }

    // ===== STEP 4: Generate WhatsApp Message =====
    const whatsappSystemPrompt = `Você é um assistente de comunicação de uma igreja evangélica.
Sua tarefa é transformar a ata de uma reunião em uma mensagem de WhatsApp para os membros.

REGRAS:
1. Seja acolhedor e fraterno
2. Use linguagem simples e direta
3. Destaque as decisões e próximos passos
4. Máximo 300 palavras
5. Use emojis com moderação (máximo 5)
6. Comece com saudação apropriada
7. Termine com bênção ou palavra de encorajamento
8. NÃO inclua detalhes administrativos internos

FORMATO:
- Use quebras de linha para separar seções
- Use bullet points (•) para listas
- Destaque datas e eventos importantes`;

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

    // ===== STEP 5: Save everything =====
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
