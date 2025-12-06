import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { errors } = await req.json()

    if (!errors || !Array.isArray(errors)) {
      throw new Error('Invalid error reports data')
    }

    // Remove id field to let database generate UUID automatically
    const errorsToInsert = errors.map(({ id, ...errorReport }) => errorReport)

    // Store error reports in database
    const { error } = await supabaseClient
      .from('error_reports')
      .insert(errorsToInsert)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // For critical errors, also log to security system
    const criticalErrors = errors.filter(err => err.severity === 'critical')
    if (criticalErrors.length > 0) {
      await supabaseClient
        .from('security_logs')
        .insert(
          criticalErrors.map(err => ({
            action: 'CRITICAL_ERROR',
            details: {
              error_type: err.error_type,
              message: err.message,
              stack_trace: err.stack_trace,
              page_url: err.page_url
            },
            user_id: err.user_id
          }))
        )
    }

    return new Response(
      JSON.stringify({ success: true, stored: errors.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error storing error reports:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})