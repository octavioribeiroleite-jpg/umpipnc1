import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function getMember(req: Request, adminClient: any) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Sessão expirada')

  const { data: userData, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !userData?.user) throw new Error('Sessão inválida')
  const { data: profile, error: profileError } = await adminClient.from('profiles').select('active').eq('user_id',userData.user.id).maybeSingle()
  if (profileError || !profile?.active) throw new Error('Acesso indisponível')

  const { data: member, error: memberError } = await adminClient
    .from('members')
    .select('id, society_id, active')
    .eq('user_id', userData.user.id)
    .eq('active', true)
    .single()

  if (memberError || !member) throw new Error('Membro não encontrado')
  return { user: userData.user, member }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { user, member } = await getMember(req, adminClient)
    const { charge_id, amount, payment_date, payment_method, receipt_url, receipt_path, notes } = await req.json()

    if (!charge_id || !amount || !payment_date || !payment_method || !receipt_url) {
      return new Response(JSON.stringify({ error: 'Informe cobrança, valor, data, método e comprovante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const paymentAmount = Number(amount)
    if (typeof receipt_path !== 'string' || !new RegExp('^' + member.society_id + '/[0-9]{4}/member-submissions/' + member.id + '/[^/]+$').test(receipt_path)
        || receipt_path.includes('..') || receipt_url !== 'storage://receipts/' + receipt_path) {
      return Response.json({ error: 'Comprovante inválido para este membro' }, { status: 400, headers: corsHeaders })
    }
    const { data: receiptObjects, error: receiptError } = await adminClient.storage.from('receipts').list(receipt_path.slice(0, receipt_path.lastIndexOf('/')), { search: receipt_path.split('/').pop(), limit: 10 })
    if (receiptError || !receiptObjects?.some((o: any) => o.name === receipt_path.split('/').pop() && o.id)) {
      return Response.json({ error: 'Envie o comprovante antes de continuar' }, { status: 400, headers: corsHeaders })
    }
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Valor do pagamento inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: charge, error: chargeError } = await adminClient
      .from('charges')
      .select('id, member_id, society_id, amount, paid_amount, competence, type, status')
      .eq('id', charge_id)
      .eq('member_id', member.id)
      .eq('society_id', member.society_id)
      .single()

    if (chargeError || !charge) {
      return new Response(JSON.stringify({ error: 'Cobrança não encontrada para este membro' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (['pago', 'isento', 'cancelado'].includes(charge.status)) {
      return new Response(JSON.stringify({ error: 'Essa cobrança não está aberta para comprovante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const paid = Number(charge.paid_amount || 0)
    const remaining = Math.max(Number(charge.amount || 0) - paid, 0)
    if (paymentAmount > remaining) {
      return new Response(JSON.stringify({ error: 'O valor informado é maior que o restante da cobrança' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: submission, error: insertError } = await adminClient
      .from('member_payment_submissions')
      .insert({
        member_id: member.id,
        user_id: user.id,
        society_id: member.society_id,
        charge_id: charge.id,
        competence: charge.competence,
        type: charge.type,
        amount: paymentAmount,
        payment_date,
        payment_method,
        receipt_url,
        receipt_path: receipt_path || null,
        notes: notes || null,
        status: 'pendente',
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    return new Response(JSON.stringify({ submission }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
