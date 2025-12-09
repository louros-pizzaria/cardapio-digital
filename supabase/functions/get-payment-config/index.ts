import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[GET-PAYMENT-CONFIG] Request received');
    
    const mercadopagoPublicKey = Deno.env.get('MERCADOPAGO_PUBLIC_KEY_PROD');
    
    if (!mercadopagoPublicKey) {
      console.error('[GET-PAYMENT-CONFIG] MERCADOPAGO_PUBLIC_KEY_PROD not configured');
      console.error('[GET-PAYMENT-CONFIG] Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('MERCADOPAGO')));
      
      return new Response(
        JSON.stringify({
          error: 'MercadoPago public key not configured. Please configure MERCADOPAGO_PUBLIC_KEY_PROD in Supabase Edge Functions secrets.',
          details: 'Configure em: Supabase Dashboard → Settings → Edge Functions → Secrets'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('[GET-PAYMENT-CONFIG] Successfully retrieved public key');
    
    return new Response(
      JSON.stringify({
        mercadopago_public_key: mercadopagoPublicKey
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[GET-PAYMENT-CONFIG] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error getting payment configuration',
        details: 'Verifique os logs da Edge Function para mais detalhes'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});