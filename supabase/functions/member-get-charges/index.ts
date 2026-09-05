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
    .select('id, name, society_id, active')
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
    const { member } = await getMember(req, adminClient)

    const { data, error } = await adminClient
      .from('charges')
      .select('id, amount, competence, type, status, due_date, paid_at, paid_amount, payment_method, notes')
      .eq('member_id', member.id)
      .eq('society_id', member.society_id)
      .neq('status', 'cancelado')
      .order('due_date', { ascending: true })

    if (error) throw error

    return new Response(JSON.stringify({ charges: data || [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
