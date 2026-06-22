import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const normalizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, '-')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { society_slug, member_id } = await req.json()

    if (!society_slug || !member_id) {
      return new Response(JSON.stringify({ error: 'society_slug e member_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id, name, society_id, active, user_id')
      .eq('id', member_id)
      .eq('society_id', society.id)
      .eq('active', true)
      .single()

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: 'Membro não encontrado nessa sociedade' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const memberKey = normalizeId(member.id)
    const serviceEmail = `membro-${memberKey}@ipnc.local`
    const servicePassword = `svc_member_${memberKey}_2026!`
    const username = `membro-${memberKey}`

    const signIn = async () => adminClient.auth.signInWithPassword({
      email: serviceEmail,
      password: servicePassword,
    })

    let authUserId = member.user_id as string | null

    if (authUserId) {
      const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(authUserId, {
        email: serviceEmail,
        password: servicePassword,
        user_metadata: {
          full_name: member.name,
          username,
          portal: 'membro',
        },
      })

      if (updatePasswordError) {
        console.error('Error updating member account:', updatePasswordError)
        authUserId = null
      }
    }

    if (!authUserId) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: serviceEmail,
        password: servicePassword,
        email_confirm: true,
        user_metadata: {
          full_name: member.name,
          username,
          portal: 'membro',
        },
      })

      if (createError) {
        console.error('Error creating member account:', createError)
        return new Response(JSON.stringify({ error: 'Erro ao criar acesso do membro' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      authUserId = newUser.user.id
    }

    await adminClient.from('profiles').update({
      full_name: member.name,
      society_id: society.id,
      username,
    }).eq('user_id', authUserId)

    await adminClient
      .from('members')
      .update({ user_id: authUserId })
      .eq('id', member.id)

    const { data: existingRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', authUserId)

    const roles = existingRoles?.map((item: { role: string }) => item.role) || []
    if (!roles.includes('visualizador') && !roles.includes('admin') && !roles.includes('diretoria') && !roles.includes('pastor')) {
      await adminClient.from('user_roles').insert({
        user_id: authUserId,
        role: 'visualizador',
      })
    }

    const { data: loginData, error: loginError } = await signIn()

    if (loginError || !loginData?.session) {
      console.error('Error signing in member account:', loginError)
      return new Response(JSON.stringify({ error: 'Erro ao fazer login' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      session: loginData.session,
      member: {
        id: member.id,
        name: member.name,
        society_id: society.id,
        society_name: society.name,
      },
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
