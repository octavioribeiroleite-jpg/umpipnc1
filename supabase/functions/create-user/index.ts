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

    // Verify caller is admin
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
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas admins podem criar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { full_name, username, password, role } = await req.json()

    if (!full_name || !username || !password || !role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: full_name, username, password, role' }), {
        status: 400,
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
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update profile with username and plain_password (trigger creates the profile)
    await adminClient.from('profiles').update({
      username: username.toLowerCase(),
      plain_password: password,
    }).eq('user_id', newUser.user.id)

    // Assign role
    await adminClient.from('user_roles').insert({
      user_id: newUser.user.id,
      role,
    })

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
