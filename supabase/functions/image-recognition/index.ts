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
    const { image, analysis_type } = await req.json();

    // Mock image recognition results
    if (analysis_type === 'food_detection') {
      return new Response(JSON.stringify({
        detected_foods: ['pizza', 'mussarela', 'tomate'],
        confidence: 0.92,
        suggested_menu_items: [
          {
            id: '1',
            name: 'Pizza Margherita',
            price: 35.90,
            similarity: 0.95
          },
          {
            id: '2',
            name: 'Pizza Napolitana',
            price: 38.90,
            similarity: 0.87
          }
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (analysis_type === 'ingredient_detection') {
      return new Response(JSON.stringify({
        ingredients: ['tomate', 'mussarela', 'manjericão', 'azeitona']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      detected_foods: [],
      confidence: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in image recognition:', error);
    return new Response(
      JSON.stringify({ error: 'Image recognition failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});