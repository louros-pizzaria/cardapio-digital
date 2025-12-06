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
    const { user_id, current_time, interaction_data } = await req.json();

    // Mock mood analysis based on time and interactions
    const hour = new Date(current_time).getHours();
    let current_mood = 'neutral';
    let confidence = 0.7;
    
    if (hour < 10) {
      current_mood = 'energetic';
      confidence = 0.8;
    } else if (hour > 18) {
      current_mood = 'relaxed';
      confidence = 0.75;
    }

    const recommended_categories = ['pizzas', 'bebidas'];
    const suggested_items = [
      {
        id: '1',
        name: 'Pizza Comfort',
        match_score: 0.9
      }
    ];

    return new Response(JSON.stringify({
      current_mood,
      confidence,
      recommended_categories,
      suggested_items
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in mood analysis:', error);
    return new Response(
      JSON.stringify({ error: 'Mood analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});