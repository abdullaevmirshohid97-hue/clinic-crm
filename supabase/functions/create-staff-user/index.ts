// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get the admin/owner's clinic_id from their JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const clinicId = user.user_metadata?.clinic_id
    if (!clinicId) throw new Error("Admin has no clinic_id")

    // 2. Setup Admin Client with Service Role
    const adminClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, fullName, role } = await req.json()

    // 3. Create the Auth User
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        clinic_id: clinicId,
        fullName,
        role: role || 'staff'
      },
      email_confirm: true
    })

    if (createError) throw createError

    // 4. Create the Database Record in 'staff' table
    const { error: dbError } = await adminClient
      .from('staff')
      .insert([
        {
          fullName,
          role: role || 'staff',
          clinic_id: clinicId,
          auth_user_id: authData.user.id,
          isActive: 1
        }
      ])

    if (dbError) {
      // Cleanup: delete the auth user if DB record fails to keep them in sync
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw dbError
    }

    return new Response(JSON.stringify({ user: authData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
