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

  const { data: member, error: memberError } = await adminClient
    .from('members')
    .select('id, society_id, active')
    .eq('user_id', userData.user.id)
    .eq('active', true)
    .single()

  if (memberError || !member) throw new Error('Membro não encontrado')
  return { member }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { member } = await getMember(req, adminClient)
    const { submission_id } = await req.json()

    if (!submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await adminClient
      .from('member_payment_submissions')
      .update({ status: 'cancelado', rejection_reason: 'Cancelado pelo membro' })
      .eq('id', submission_id)
      .eq('member_id', member.id)
      .eq('society_id', member.society_id)
      .eq('status', 'pendente')
      .select('id, status')
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ submission: data }), {
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
