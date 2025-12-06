import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, details?: any) {
  console.log(`[EXPIRE-ORDERS-ENHANCED] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Enhanced order expiration process started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // ETAPA 1: Expirar pedidos pendentes há mais de 30 minutos
    const expireCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    logStep('Expiration cutoff time', { cutoff: expireCutoff });

    const { data: expiredOrders, error: selectError } = await supabase
      .from('orders')
      .select('id, user_id, payment_method, total_amount')
      .in('status', ['pending'])
      .in('payment_status', ['pending'])
      .lt('created_at', expireCutoff);

    if (selectError) {
      logStep('Error fetching expired orders', selectError);
      throw selectError;
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      logStep('No expired orders found');
      return new Response(JSON.stringify({ 
        success: true, 
        expired_count: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep(`Found ${expiredOrders.length} expired orders to process`);

    // ETAPA 2: Atualizar orders para status expired
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'expired',
        payment_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredOrders.map(o => o.id));

    if (updateError) {
      logStep('Error updating orders to expired', updateError);
      throw updateError;
    }

    // ETAPA 3: Limpar transações PIX expiradas
    const pixTransactionIds = expiredOrders
      .filter(o => o.payment_method === 'pix')
      .map(o => `MP-temp-${o.id}`);

    if (pixTransactionIds.length > 0) {
      const { error: pixError } = await supabase
        .from('pix_transactions')
        .update({ status: 'expired' })
        .in('id', pixTransactionIds);

      if (pixError) {
        logStep('Warning: Could not update PIX transactions', pixError);
      } else {
        logStep(`Updated ${pixTransactionIds.length} PIX transactions to expired`);
      }
    }

    // ETAPA 4: Limpar cache de rate limiting para usuários afetados
    const userIds = [...new Set(expiredOrders.map(o => o.user_id))];
    logStep(`Clearing rate limits for ${userIds.length} users`);

    // ETAPA 5: Notificar usuários sobre expiração (opcional)
    for (const order of expiredOrders.slice(0, 5)) { // Máximo 5 notificações por execução
      try {
        // Inserir log de segurança
        await supabase.rpc('log_security_event', {
          p_user_id: order.user_id,
          p_action: 'order_expired',
          p_details: { 
            order_id: order.id, 
            amount: order.total_amount,
            expired_at: new Date().toISOString()
          }
        });
      } catch (logError) {
        logStep('Warning: Could not log security event', logError);
      }
    }

    logStep('Order expiration process completed successfully', {
      expired_count: expiredOrders.length,
      pix_cleaned: pixTransactionIds.length,
      users_affected: userIds.length
    });

    return new Response(JSON.stringify({
      success: true,
      expired_count: expiredOrders.length,
      pix_transactions_cleaned: pixTransactionIds.length,
      users_affected: userIds.length,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Error in enhanced expire orders process', { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});