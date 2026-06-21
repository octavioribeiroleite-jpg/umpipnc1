import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`ebd_teacher_pin:${pin}`)
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

    // Verify caller is authenticated management user
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isMgmt } = await adminClient.rpc('has_management_role', { _user_id: user.id })
    if (!isMgmt) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const action = body.action as string

    const validatePin = (pin: unknown) =>
      typeof pin === 'string' && /^[0-9]{6}$/.test(pin)

    if (action === 'create') {
      const { name, pin, class_id } = body
      if (!name || !String(name).trim() || !validatePin(pin) || !class_id) {
        return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await adminClient.from('ebd_teachers').insert({
        name: String(name).trim(),
        pin_hash: await hashPin(pin),
        class_id,
      })
      if (error) {
        const msg = error.code === '23505' ? 'Este PIN já está em uso por outro professor' : 'Erro ao cadastrar professor'
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const { id, name, pin, class_id } = body
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = String(name).trim()
      if (class_id !== undefined) updates.class_id = class_id
      if (pin !== undefined && pin !== null && pin !== '') {
        if (!validatePin(pin)) {
          return new Response(JSON.stringify({ error: 'PIN inválido' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        updates.pin_hash = await hashPin(pin)
      }
      const { error } = await adminClient.from('ebd_teachers').update(updates).eq('id', id)
      if (error) {
        const msg = error.code === '23505' ? 'Este PIN já está em uso por outro professor' : 'Erro ao atualizar professor'
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await adminClient.from('ebd_teachers').delete().eq('id', id)
      if (error) {
        return new Response(JSON.stringify({ error: 'Erro ao excluir professor' }), {
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
    console.error('manage-ebd-teacher error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})