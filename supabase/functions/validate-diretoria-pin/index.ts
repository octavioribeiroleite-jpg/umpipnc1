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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { society_slug, pin, validate_only } = await req.json()

    if (!pin) {
      return new Response(JSON.stringify({ error: 'pin é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 1: validate_only mode — just check the general PIN
    if (validate_only) {
      const { data: setting, error: settingError } = await adminClient
        .from('settings')
        .select('value')
        .eq('key', 'diretoria_pin_geral')
        .single()

      if (settingError || !setting) {
        return new Response(JSON.stringify({ error: 'PIN geral não configurado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (setting.value !== pin) {
        return new Response(JSON.stringify({ error: 'PIN incorreto' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, validated: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 2: full login — validate general PIN + create session for society
    if (!society_slug) {
      return new Response(JSON.stringify({ error: 'society_slug é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate general PIN
    const { data: generalSetting, error: generalError } = await adminClient
      .from('settings')
      .select('value')
      .eq('key', 'diretoria_pin_geral')
      .single()

    if (generalError || !generalSetting || generalSetting.value !== pin) {
      return new Response(JSON.stringify({ error: 'PIN incorreto' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create/find service account
    const isPastor = society_slug === 'pastor'
    const serviceEmail = `diretoria-${society_slug}@ipnc.local`
    const servicePassword = `svc_dir_${society_slug}_2025!`

    // Try to sign in first
    const { data: signInData } = await adminClient.auth.signInWithPassword({
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

    // Account doesn't exist, create it
    let societyId: string | null = null
    let societyName = 'Pastor'

    if (!isPastor) {
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
      societyId = society.id
      societyName = society.name
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: serviceEmail,
      password: servicePassword,
      email_confirm: true,
      user_metadata: {
        full_name: isPastor ? 'Pastor' : `Diretoria ${societyName}`,
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

    // Update profile
    const profileUpdate: Record<string, any> = { username: `diretoria-${society_slug}` }
    if (societyId) profileUpdate.society_id = societyId
    await adminClient.from('profiles').update(profileUpdate).eq('user_id', newUser.user.id)

    // Assign role
    await adminClient.from('user_roles').insert({
      user_id: newUser.user.id,
      role: isPastor ? 'pastor' : 'diretoria',
    })

    // Now sign in
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
