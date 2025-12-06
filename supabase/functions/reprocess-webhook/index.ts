// ===== REPROCESSAMENTO DE WEBHOOKS =====

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[REPROCESS] 🔄 Iniciando reprocessamento de webhook');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Autenticar usuário admin
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado: necessário ser admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { logId } = await req.json();

    // Buscar log do webhook
    const { data: webhookLog, error: logError } = await supabaseClient
      .from('webhook_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (logError || !webhookLog) {
      return new Response(
        JSON.stringify({ error: 'Log de webhook não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REPROCESS] 📋 Reprocessando webhook: ${webhookLog.platform} - ${webhookLog.event_type}`);

    // Marcar como processando
    await supabaseClient
      .from('webhook_logs')
      .update({ 
        status: 'retrying',
        error_message: null
      })
      .eq('id', logId);

    let result = { success: false, error: 'Tipo de webhook não suportado' };

    // Reprocessar baseado na plataforma
    switch (webhookLog.platform) {
      case 'stripe':
        result = await reprocessStripeWebhook(webhookLog, supabaseClient);
        break;
      case 'mercadopago':
        result = await reprocessMercadoPagoWebhook(webhookLog, supabaseClient);
        break;
      case 'delivery':
        result = await reprocessDeliveryWebhook(webhookLog, supabaseClient);
        break;
    }

    // Atualizar status final
    await supabaseClient
      .from('webhook_logs')
      .update({
        status: result.success ? 'success' : 'failed',
        processed_at: result.success ? new Date().toISOString() : null,
        error_message: result.success ? null : result.error
      })
      .eq('id', logId);

    // Log de auditoria
    await supabaseClient
      .from('security_logs')
      .insert({
        user_id: user.id,
        action: 'webhook_reprocessed',
        details: {
          webhook_id: logId,
          platform: webhookLog.platform,
          event_type: webhookLog.event_type,
          success: result.success,
          error: result.error
        }
      });

    console.log(`[REPROCESS] ${result.success ? '✅ Sucesso' : '❌ Falha'}: ${result.error || 'Reprocessado com sucesso'}`);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? 'Webhook reprocessado com sucesso' : result.error
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[REPROCESS] ❌ Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ===== REPROCESSADORES ESPECÍFICOS =====

async function reprocessStripeWebhook(webhookLog: any, supabaseClient: any) {
  try {
    const { event_type, payload } = webhookLog;
    
    switch (event_type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return await handleStripeSubscription(payload, supabaseClient);
      
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        return await handleStripeInvoice(payload, supabaseClient);
      
      case 'checkout.session.completed':
        return await handleStripeCheckout(payload, supabaseClient);
      
      default:
        return { success: false, error: `Tipo de evento Stripe não suportado: ${event_type}` };
    }
  } catch (error) {
    return { success: false, error: `Erro no reprocessamento Stripe: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function reprocessMercadoPagoWebhook(webhookLog: any, supabaseClient: any) {
  try {
    const { event_type, payload } = webhookLog;
    
    switch (event_type) {
      case 'payment':
        return await handleMercadoPagoPayment(payload, supabaseClient);
      
      default:
        return { success: false, error: `Tipo de evento MercadoPago não suportado: ${event_type}` };
    }
  } catch (error) {
    return { success: false, error: `Erro no reprocessamento MercadoPago: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function reprocessDeliveryWebhook(webhookLog: any, supabaseClient: any) {
  try {
    const { event_type, payload } = webhookLog;
    
    switch (event_type) {
      case 'order_status_changed':
        return await handleDeliveryStatusChange(payload, supabaseClient);
      
      default:
        return { success: false, error: `Tipo de evento Delivery não suportado: ${event_type}` };
    }
  } catch (error) {
    return { success: false, error: `Erro no reprocessamento Delivery: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===== HANDLERS ESPECÍFICOS =====

async function handleStripeSubscription(payload: any, supabaseClient: any) {
  const subscription = payload.data.object;
  const customerId = subscription.customer;
  
  // Buscar customer no Stripe para obter email
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const customerResponse = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
    headers: { 'Authorization': `Bearer ${stripeSecretKey}` }
  });
  
  const customer = await customerResponse.json();
  
  // Buscar usuário pelo email
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('email', customer.email)
    .single();
  
  if (!profile) {
    return { success: false, error: 'Usuário não encontrado' };
  }
  
  // Atualizar ou criar assinatura
  const subscriptionData = {
    user_id: profile.id,
    stripe_subscription_id: subscription.id,
    status: subscription.status === 'active' ? 'active' : 'cancelled',
    expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
    sync_status: 'webhook_reprocessed'
  };
  
  await supabaseClient
    .from('subscriptions')
    .upsert(subscriptionData, { onConflict: 'user_id' });
  
    return { success: true, error: '' };
}

async function handleStripeInvoice(payload: any, supabaseClient: any) {
  const invoice = payload.data.object;
  
  // Buscar assinatura relacionada
  const { data: subscription } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();
  
  if (!subscription) {
    return { success: false, error: 'Assinatura não encontrada' };
  }
  
  // Atualizar status baseado no pagamento
  const newStatus = invoice.status === 'paid' ? 'active' : 'past_due';
  
  await supabaseClient
    .from('subscriptions')
    .update({ 
      status: newStatus,
      sync_status: 'webhook_reprocessed'
    })
    .eq('id', subscription.id);
  
        return { success: true, error: '' };
}

async function handleStripeCheckout(payload: any, supabaseClient: any) {
  const session = payload.data.object;
  
  if (session.metadata?.order_id) {
    // Atualizar pedido
    await supabaseClient
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed'
      })
      .eq('id', session.metadata.order_id);
  }
  
        return { success: true, error: '' };
}

async function handleMercadoPagoPayment(payload: any, supabaseClient: any) {
  const paymentId = payload.data.id;
  
  // Buscar transação PIX
  const { data: pixTransaction } = await supabaseClient
    .from('pix_transactions')
    .select('*')
    .eq('mercadopago_payment_id', paymentId)
    .single();
  
  if (!pixTransaction) {
    return { success: false, error: 'Transação PIX não encontrada' };
  }
  
  // Buscar dados do pagamento no MercadoPago
  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${mpToken}` }
  });
  
  const payment = await paymentResponse.json();
  
  // Atualizar transação e pedido
  const newStatus = payment.status === 'approved' ? 'completed' : payment.status;
  
  await supabaseClient
    .from('pix_transactions')
    .update({ status: newStatus })
    .eq('id', pixTransaction.id);
  
  if (payment.status === 'approved') {
    await supabaseClient
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed'
      })
      .eq('id', pixTransaction.order_id);
  }
  
  return { success: true, error: '' };
}

async function handleDeliveryStatusChange(payload: any, supabaseClient: any) {
  const { order_id, new_status } = payload;
  
  await supabaseClient
    .from('orders')
    .update({ status: new_status })
    .eq('id', order_id);
  
  return { success: true, error: '' };
}