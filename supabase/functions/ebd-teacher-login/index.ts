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
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { pin } = await req.json()

    if (!pin || typeof pin !== 'string' || !/^[0-9]{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'PIN inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pinHash = await hashPin(pin)

    const { data: teacher, error } = await adminClient
      .from('ebd_teachers')
      .select('id, name, class_id, active')
      .eq('pin_hash', pinHash)
      .eq('active', true)
      .maybeSingle()

    if (error || !teacher) {
      return new Response(JSON.stringify({ error: 'PIN incorreto' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        teacher: { id: teacher.id, name: teacher.name, class_id: teacher.class_id },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('ebd-teacher-login error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})