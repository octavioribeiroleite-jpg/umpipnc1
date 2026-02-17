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
      return new Response(JSON.stringify({ error: 'Apenas admins podem alterar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user_id, new_password, new_full_name, new_username } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Campo obrigatório: user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!new_password && !new_full_name && !new_username) {
      return new Response(JSON.stringify({ error: 'Envie pelo menos um campo para alterar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Build auth update payload
    const authUpdate: Record<string, any> = {}
    const profileUpdate: Record<string, any> = {}
    const metadataUpdate: Record<string, any> = {}

    if (new_password) {
      authUpdate.password = new_password
      profileUpdate.plain_password = new_password
    }

    if (new_full_name) {
      profileUpdate.full_name = new_full_name
      metadataUpdate.full_name = new_full_name
    }

    if (new_username) {
      const newEmail = `${new_username}@ipnc.local`
      authUpdate.email = newEmail
      profileUpdate.username = new_username
      profileUpdate.email = newEmail
      metadataUpdate.username = new_username
    }

    if (Object.keys(metadataUpdate).length > 0) {
      authUpdate.user_metadata = metadataUpdate
    }

    // Update auth if needed
    if (Object.keys(authUpdate).length > 0) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, authUpdate)
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Update profiles if needed
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await adminClient.from('profiles').update(profileUpdate).eq('user_id', user_id)
      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
