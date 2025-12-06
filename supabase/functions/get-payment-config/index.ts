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
    const mercadopagoPublicKey = Deno.env.get('MERCADOPAGO_PUBLIC_KEY_PROD');
    
    if (!mercadopagoPublicKey) {
      throw new Error('MercadoPago public key not configured');
    }

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
    console.error('Error getting payment config:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error getting payment configuration'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});