import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`ebd_class_pin:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()

    // Authorization: either an authenticated management user OR the correct
    // Secretaria admin PIN (the Secretaria screen logs in via an internal PIN,
    // not a backend session).
    let authorized = false

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (token && token !== anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        const { data: isMgmt } = await adminClient.rpc('has_management_role', { _user_id: user.id })
        if (isMgmt) authorized = true
      }
    }

    if (!authorized && typeof body.admin_pin === 'string' && body.admin_pin) {
      const { data: setting } = await adminClient
        .from('settings')
        .select('value')
        .eq('key', 'secretaria_admin_password')
        .maybeSingle()
      if (setting?.value && setting.value === body.admin_pin) authorized = true
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const action = body.action as string
    const validatePin = (pin: unknown) =>
      typeof pin === 'string' && /^[0-9]{6}$/.test(pin)

    if (action === 'list') {
      const { data, error } = await adminClient
        .from('ebd_class_passwords')
        .select('class_id')
        .eq('active', true)
      if (error) {
        return new Response(JSON.stringify({ error: 'Erro ao carregar senhas das salas' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true, class_ids: (data ?? []).map((r) => r.class_id) }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'set') {
      const { class_id, pin } = body
      if (!class_id || !validatePin(pin)) {
        return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await adminClient
        .from('ebd_class_passwords')
        .upsert(
          { class_id, pin_hash: await hashPin(pin), active: true, updated_at: new Date().toISOString() },
          { onConflict: 'class_id' },
        )
      if (error) {
        const isConflict = error.code === '23505'
        const msg = isConflict ? 'Esta senha já está em uso por outra sala' : 'Erro ao salvar a senha'
        return new Response(JSON.stringify({ error: msg }), {
          status: isConflict ? 409 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'clear') {
      const { class_id } = body
      if (!class_id) {
        return new Response(JSON.stringify({ error: 'Sala obrigatória' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await adminClient.from('ebd_class_passwords').delete().eq('class_id', class_id)
      if (error) {
        return new Response(JSON.stringify({ error: 'Erro ao remover a senha' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('manage-ebd-class-password error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})