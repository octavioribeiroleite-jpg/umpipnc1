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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller is admin or diretoria
    const authHeader = req.headers.get('Authorization')!
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isAdmin } = await callerClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin',
    })
    const { data: isDiretoria } = await callerClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'diretoria',
    })

    if (!isAdmin && !isDiretoria) {
      return new Response(JSON.stringify({ error: 'Sem permissão para criar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { full_name, username, password, role, society_id, member_id } = await req.json()

    if (!full_name || !username || !password || !role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: full_name, username, password, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Diretoria can only create visualizador
    if (!isAdmin && isDiretoria && role !== 'visualizador') {
      return new Response(JSON.stringify({ error: 'Diretoria só pode criar usuários visualizadores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = `${username.toLowerCase().replace(/\s+/g, '')}@ipnc.local`

    // Create user with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        username: username.toLowerCase(),
        plain_password: password,
      },
    })

    if (createError) {
      // If email already exists, try to link existing user to member
      const errMsg = createError.message || ''
      const isDuplicate = errMsg.includes('already been registered') || errMsg.includes('already exists')
      
      if (isDuplicate && member_id) {
        // Find existing user by email
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('user_id, username, plain_password')
          .eq('email', email)
          .maybeSingle()

        if (existingProfile?.user_id) {
          // Link member to existing user
          await adminClient.from('members').update({ user_id: existingProfile.user_id }).eq('id', member_id)

          // Update profile with society_id if provided
          if (society_id) {
            await adminClient.from('profiles').update({ society_id }).eq('user_id', existingProfile.user_id)
          }

          return new Response(JSON.stringify({
            success: true,
            user_id: existingProfile.user_id,
            linked_existing: true,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const userFriendlyError = isDuplicate
        ? `Já existe um usuário com o login '${username}'. Escolha outro nome de usuário.`
        : createError.message

      return new Response(JSON.stringify({ error: userFriendlyError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update profile with username, plain_password and society_id
    const profileUpdate: Record<string, unknown> = {
      username: username.toLowerCase(),
      plain_password: password,
    }
    if (society_id) {
      profileUpdate.society_id = society_id
    }

    await adminClient.from('profiles').update(profileUpdate).eq('user_id', newUser.user.id)

    // Assign role
    await adminClient.from('user_roles').insert({
      user_id: newUser.user.id,
      role,
    })

    // Link member_id if provided
    if (member_id) {
      await adminClient.from('members').update({ user_id: newUser.user.id }).eq('id', member_id)
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
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
