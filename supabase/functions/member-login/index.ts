import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { society_slug } = await req.json()

    if (!society_slug) {
      return new Response(JSON.stringify({ error: 'society_slug é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Reuse the same service account as diretoria
    const serviceEmail = `diretoria-${society_slug}@ipnc.local`
    const servicePassword = `svc_dir_${society_slug}_2025!`

    // Try to sign in
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: serviceEmail,
      password: servicePassword,
    })

    if (signInData?.session) {
      return new Response(JSON.stringify({
        success: true,
        session: signInData.session,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Account doesn't exist, create it (same logic as validate-diretoria-pin)
    const { data: society } = await adminClient
      .from('societies')
      .select('id, name')
      .eq('slug', society_slug)
      .single()

    if (!society) {
      return new Response(JSON.stringify({ error: 'Sociedade não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: serviceEmail,
      password: servicePassword,
      email_confirm: true,
      user_metadata: {
        full_name: `Diretoria ${society.name}`,
        username: `diretoria-${society_slug}`,
      },
    })

    if (createError) {
      console.error('Error creating service account:', createError)
      return new Response(JSON.stringify({ error: 'Erro ao criar conta de serviço' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await adminClient.from('profiles').update({
      society_id: society.id,
      username: `diretoria-${society_slug}`,
    }).eq('user_id', newUser.user.id)

    await adminClient.from('user_roles').insert({
      user_id: newUser.user.id,
      role: 'diretoria',
    })

    const { data: loginData, error: loginError } = await adminClient.auth.signInWithPassword({
      email: serviceEmail,
      password: servicePassword,
    })

    if (loginError || !loginData?.session) {
      return new Response(JSON.stringify({ error: 'Erro ao fazer login' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      session: loginData.session,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
