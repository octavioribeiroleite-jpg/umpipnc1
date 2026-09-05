import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_ROLES = ['admin', 'diretoria', 'visualizador', 'pastor']

function validateUsername(username: string): string | null {
  if (!username || username.length < 2 || username.length > 30) return 'Username deve ter entre 2 e 30 caracteres'
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) return 'Username deve conter apenas letras, números, pontos, hífens e underscores'
  return null
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 4) return 'Senha deve ter no mínimo 4 caracteres'
  if (password.length > 72) return 'Senha deve ter no máximo 72 caracteres'
  return null
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

    // Validate inputs
    if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.length > 100) {
      return new Response(JSON.stringify({ error: 'Nome deve ter entre 2 e 100 caracteres' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const usernameError = validateUsername(username)
    if (usernameError) {
      return new Response(JSON.stringify({ error: usernameError }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return new Response(JSON.stringify({ error: passwordError }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: `Role inválido. Valores aceitos: ${VALID_ROLES.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (society_id && !UUID_REGEX.test(society_id)) {
      return new Response(JSON.stringify({ error: 'society_id inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (member_id && !UUID_REGEX.test(member_id)) {
      return new Response(JSON.stringify({ error: 'member_id inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Diretoria can only create visualizador
    if (!isAdmin && isDiretoria && role !== 'visualizador') {
      return new Response(JSON.stringify({ error: 'Diretoria só pode criar usuários visualizadores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminScope = createClient(supabaseUrl, serviceRoleKey)
    const { data: callerProfile, error: profileError } = await adminScope.from('profiles').select('active,society_id').eq('user_id',caller.id).single()
    if (profileError || !callerProfile?.active || (!isAdmin && (!society_id || society_id !== callerProfile.society_id))) {
      return Response.json({ error: 'Sociedade não autorizada' }, { status: 403, headers: corsHeaders })
    }
    if (/^(portal-|diretoria-|membro-)/i.test(username)) return Response.json({ error: 'Escolha outro nome de usuário' }, { status: 400, headers: corsHeaders })
    if (member_id) {
      const { data: member, error } = await adminScope.from('members').select('id,user_id,society_id').eq('id',member_id).single()
      if (error || !member || member.user_id || member.society_id !== society_id) return Response.json({ error: 'Membro já vinculado ou de outra sociedade' }, { status: 400, headers: corsHeaders })
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
      },
    })

    if (createError) {
      const errMsg = createError.message || ''
      const isDuplicate = errMsg.includes('already been registered') || errMsg.includes('already exists')
      
      const userFriendlyError = isDuplicate
        ? `Já existe um usuário com o login '${username}'. Escolha outro nome de usuário.`
        : createError.message

      return new Response(JSON.stringify({ error: userFriendlyError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // One transaction locks any selected member and cannot overwrite an existing link.
    const { error: finalizeError } = await adminClient.rpc('finalize_ipnc_account', {
      p_user_id: newUser.user.id,
      p_username: username.toLowerCase(),
      p_role: role,
      p_society_id: society_id || null,
      p_member_id: member_id || null,
    })
    if (finalizeError) {
      // Only the account created by this request is rolled back; existing users are untouched.
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(newUser.user.id)
      if (cleanupError) console.error('[create-user] New account cleanup requires administrator review')
      return Response.json({ error: 'Não foi possível concluir o cadastro. Atualize a página e tente novamente.' }, { status: 409, headers: corsHeaders })
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
