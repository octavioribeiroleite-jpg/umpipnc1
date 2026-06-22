import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { society_id, society_slug } = await req.json()
    if (!society_id && !society_slug) {
      return new Response(JSON.stringify({ error: 'society_id ou society_slug é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    let societyId = society_id
    if (!societyId) {
      const { data: society, error: societyError } = await adminClient
        .from('societies')
        .select('id')
        .eq('slug', society_slug)
        .eq('active', true)
        .single()

      if (societyError || !society) {
        return new Response(JSON.stringify({ error: 'Sociedade não encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      societyId = society.id
    }

    const { data, error } = await adminClient
      .from('members')
      .select('id, name, society_id')
      .eq('society_id', societyId)
      .eq('active', true)
      .order('name')

    if (error) throw error

    return new Response(JSON.stringify({ members: data || [] }), {
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
