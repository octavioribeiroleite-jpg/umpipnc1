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
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { pin, name } = await req.json()

    if (!pin || typeof pin !== 'string' || !/^[0-9]{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'Senha inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Informe o nome' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const teacherName = name.trim().slice(0, 120)
    const pinHash = await hashPin(pin)

    const { data: row, error } = await adminClient
      .from('ebd_class_passwords')
      .select('class_id, active, ebd_classes(name)')
      .eq('pin_hash', pinHash)
      .eq('active', true)
      .maybeSingle()

    if (error || !row) {
      return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const className = (row as any).ebd_classes?.name ?? null

    // Register the access
    await adminClient.from('ebd_class_logins').insert({
      class_id: row.class_id,
      teacher_name: teacherName,
    })

    return new Response(
      JSON.stringify({
        success: true,
        teacher: { name: teacherName, class_id: row.class_id, class_name: className },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('ebd-class-login error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})