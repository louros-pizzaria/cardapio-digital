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
    const { user_id, preferences, mood_analysis, context } = await req.json();

    // Mock neural personalization logic
    const recommendations = [
      {
        id: '1',
        name: 'Pizza Margherita Premium',
        price: 35.90,
        confidence: 0.95,
        reason: 'Baseado no seu perfil de sabores clássicos'
      },
      {
        id: '2', 
        name: 'Pizza Pepperoni Artesanal',
        price: 42.90,
        confidence: 0.87,
        reason: 'Recomendado para o horário atual'
      }
    ];

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in neural personalization:', error);
    return new Response(
      JSON.stringify({ error: 'Neural personalization failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});