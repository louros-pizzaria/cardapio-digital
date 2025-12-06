import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, details?: any) {
  console.log(`[EXPIRE-ORDERS] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting order expiration process');

    // Create Supabase service client (bypasses RLS)
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Calculate expiration time (30 minutes ago)
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 1);
    
    logStep('Expiration cutoff time', { cutoff: thirtyMinutesAgo.toISOString() });

    // Find pending orders older than 30 minutes
    const { data: expiredOrders, error: findError } = await supabaseService
      .from('orders')
      .select('id, created_at, total_amount, user_id')
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .lt('created_at', thirtyMinutesAgo.toISOString());

    if (findError) {
      throw new Error(`Failed to find expired orders: ${findError.message}`);
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      logStep('No expired orders found');
      return new Response('No expired orders', { 
        headers: corsHeaders,
        status: 200 
      });
    }

    logStep('Found expired orders', { count: expiredOrders.length });

    // Mark orders as expired
    const orderIds = expiredOrders.map(order => order.id);
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds);

    if (updateError) {
      throw new Error(`Failed to expire orders: ${updateError.message}`);
    }

    logStep('Orders marked as expired', { orderIds });

    // Clean up expired PIX transactions
    const { data: expiredTransactions, error: pixError } = await supabaseService
      .from('pix_transactions')
      .select('id, order_id')
      .in('order_id', orderIds);

    if (pixError) {
      logStep('Warning: Could not find PIX transactions', { error: pixError.message });
    } else if (expiredTransactions && expiredTransactions.length > 0) {
      const { error: deletePixError } = await supabaseService
        .from('pix_transactions')
        .delete()
        .in('order_id', orderIds);

      if (deletePixError) {
        logStep('Warning: Could not delete PIX transactions', { error: deletePixError.message });
      } else {
        logStep('PIX transactions cleaned up', { count: expiredTransactions.length });
      }
    }

    const result = {
      expiredOrders: expiredOrders.length,
      cleanedTransactions: expiredTransactions?.length || 0,
      timestamp: new Date().toISOString()
    };

    logStep('Order expiration completed', result);

    return new Response(JSON.stringify(result), { 
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Error during order expiration', { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500 
    });
  }
});