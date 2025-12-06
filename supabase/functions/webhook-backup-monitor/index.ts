// ===== SISTEMA DE BACKUP E MONITORAMENTO DE WEBHOOKS =====

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
    console.log('[WEBHOOK-MONITOR] 🔄 Iniciando monitoramento de webhooks');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, params } = await req.json();

    switch (action) {
      case 'monitor_failed':
        return await monitorFailedWebhooks(supabaseClient);
      
      case 'retry_failed':
        return await retryFailedWebhooks(supabaseClient, params);
      
      case 'backup_check':
        return await backupSubscriptionCheck(supabaseClient);
      
      case 'cleanup_old':
        return await cleanupOldLogs(supabaseClient, params);
      
      case 'health_check':
        return await healthCheck(supabaseClient);
      
      default:
        throw new Error(`Ação não reconhecida: ${action}`);
    }

  } catch (error) {
    console.error('[WEBHOOK-MONITOR] ❌ Erro:', error);
    
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

// ===== MONITORAR WEBHOOKS FALHADOS =====
async function monitorFailedWebhooks(supabaseClient: any) {
  console.log('[WEBHOOK-MONITOR] 🔍 Monitorando webhooks falhados');

  // Buscar webhooks falhados nas últimas 24 horas
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: failedLogs, error } = await supabaseClient
    .from('webhook_logs')
    .select('*')
    .eq('status', 'failed')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar logs falhados: ${error.message}`);
  }

  const criticalFailures = failedLogs.filter((log: any) => 
    log.platform === 'stripe' || 
    log.event_type.includes('payment') ||
    log.event_type.includes('subscription')
  );

  // Agrupar por tipo de erro
  const errorGroups = failedLogs.reduce((groups: any, log: any) => {
    const errorKey = log.error_message?.substring(0, 50) || 'unknown';
    if (!groups[errorKey]) {
      groups[errorKey] = [];
    }
    groups[errorKey].push(log);
    return groups;
  }, {});

  // Log de auditoria
  await supabaseClient
    .from('security_logs')
    .insert({
      action: 'webhook_monitoring_report',
      details: {
        total_failed: failedLogs.length,
        critical_failures: criticalFailures.length,
        error_groups: Object.keys(errorGroups).length,
        period: '24h'
      }
    });

  // Enviar alertas para falhas críticas
  if (criticalFailures.length > 0) {
    await sendCriticalAlert(supabaseClient, criticalFailures);
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        total_failed: failedLogs.length,
        critical_failures: criticalFailures.length,
        error_groups: errorGroups,
        alert_sent: criticalFailures.length > 0
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ===== RETRY AUTOMÁTICO DE WEBHOOKS FALHADOS =====
async function retryFailedWebhooks(supabaseClient: any, params: any = {}) {
  console.log('[WEBHOOK-MONITOR] 🔄 Iniciando retry de webhooks falhados');

  const maxRetries = params.maxRetries || 3;
  const olderThan = params.olderThan || 5; // minutos
  
  const cutoffTime = new Date(Date.now() - olderThan * 60 * 1000).toISOString();

  // Buscar webhooks elegíveis para retry
  const { data: retryableLogs, error } = await supabaseClient
    .from('webhook_logs')
    .select('*')
    .eq('status', 'failed')
    .lt('created_at', cutoffTime)
    .is('processed_at', null)
    .limit(50);

  if (error) {
    throw new Error(`Erro ao buscar logs para retry: ${error.message}`);
  }

  let successCount = 0;
  let failureCount = 0;

  for (const log of retryableLogs) {
    try {
      console.log(`[WEBHOOK-MONITOR] 🔄 Tentando reprocessar webhook: ${log.id}`);

      // Marcar como tentando novamente
      await supabaseClient
        .from('webhook_logs')
        .update({ status: 'retrying' })
        .eq('id', log.id);

      // Simular reprocessamento (aqui você chamaria a lógica real do webhook)
      const success = await reprocessWebhook(log, supabaseClient);

      if (success) {
        await supabaseClient
          .from('webhook_logs')
          .update({ 
            status: 'success',
            processed_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', log.id);
        
        successCount++;
        console.log(`[WEBHOOK-MONITOR] ✅ Webhook reprocessado com sucesso: ${log.id}`);
      } else {
        await supabaseClient
          .from('webhook_logs')
          .update({ 
            status: 'failed',
            error_message: 'Falha no reprocessamento automático'
          })
          .eq('id', log.id);
        
        failureCount++;
      }

    } catch (error) {
      console.error(`[WEBHOOK-MONITOR] ❌ Erro ao reprocessar ${log.id}:`, error);
      
      await supabaseClient
        .from('webhook_logs')
        .update({ 
          status: 'failed',
          error_message: `Erro no retry: ${error instanceof Error ? error.message : String(error)}`
        })
        .eq('id', log.id);
      
      failureCount++;
    }
  }

  // Log do resultado
  await supabaseClient
    .from('security_logs')
    .insert({
      action: 'webhook_retry_batch',
      details: {
        total_attempted: retryableLogs.length,
        success_count: successCount,
        failure_count: failureCount
      }
    });

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        total_attempted: retryableLogs.length,
        success_count: successCount,
        failure_count: failureCount
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ===== BACKUP: VERIFICAÇÃO DE ASSINATURAS =====
async function backupSubscriptionCheck(supabaseClient: any) {
  console.log('[WEBHOOK-MONITOR] 🔍 Executando verificação backup de assinaturas');

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key não configurada');
  }

  // Buscar assinaturas que podem estar desatualizadas
  const { data: subscriptions, error } = await supabaseClient
    .from('subscriptions')
    .select('*, profiles(email)')
    .eq('status', 'active')
    .or('sync_status.eq.manual,sync_status.eq.pending')
    .limit(100);

  if (error) {
    throw new Error(`Erro ao buscar assinaturas: ${error.message}`);
  }

  let updatedCount = 0;
  let inconsistenciesFound = 0;

  for (const subscription of subscriptions) {
    try {
      // Verificar no Stripe
      const stripeData = await checkStripeSubscription(subscription.profiles.email, stripeSecretKey);
      
      if (stripeData.isActive !== (subscription.status === 'active')) {
        console.log(`[WEBHOOK-MONITOR] ⚠️ Inconsistência encontrada para usuário: ${subscription.user_id}`);
        
        // Atualizar status
        await supabaseClient
          .from('subscriptions')
          .update({
            status: stripeData.isActive ? 'active' : 'cancelled',
            sync_status: 'backup_sync',
            expires_at: stripeData.expiresAt
          })
          .eq('id', subscription.id);

        inconsistenciesFound++;
        updatedCount++;
      }

    } catch (error) {
      console.warn(`[WEBHOOK-MONITOR] ⚠️ Erro ao verificar ${subscription.user_id}:`, error);
    }
  }

  // Log da verificação
  await supabaseClient
    .from('security_logs')
    .insert({
      action: 'backup_subscription_check',
      details: {
        total_checked: subscriptions.length,
        inconsistencies_found: inconsistenciesFound,
        updated_count: updatedCount
      }
    });

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        total_checked: subscriptions.length,
        inconsistencies_found: inconsistenciesFound,
        updated_count: updatedCount
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ===== LIMPEZA DE LOGS ANTIGOS =====
async function cleanupOldLogs(supabaseClient: any, params: any = {}) {
  const daysToKeep = params.daysToKeep || 30;
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseClient
    .from('webhook_logs')
    .delete()
    .lt('created_at', cutoffDate)
    .neq('status', 'failed'); // Manter logs falhados por mais tempo

  if (error) {
    throw new Error(`Erro na limpeza: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Logs antigos removidos' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ===== HEALTH CHECK =====
async function healthCheck(supabaseClient: any) {
  const checks = {
    database: false,
    stripe: false,
    webhooks: false
  };

  try {
    // Teste de banco
    const { error: dbError } = await supabaseClient
      .from('webhook_logs')
      .select('id')
      .limit(1);
    checks.database = !dbError;

    // Teste Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (stripeKey) {
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      checks.stripe = response.ok;
    }

    // Teste de webhooks recentes
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentWebhooks } = await supabaseClient
      .from('webhook_logs')
      .select('id')
      .gte('created_at', oneHourAgo)
      .limit(1);
    checks.webhooks = !!recentWebhooks?.length;

  } catch (error) {
    console.error('[WEBHOOK-MONITOR] Health check error:', error);
  }

  const isHealthy = Object.values(checks).every(check => check);

  return new Response(
    JSON.stringify({
      success: true,
      healthy: isHealthy,
      checks,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ===== FUNÇÕES AUXILIARES =====
async function reprocessWebhook(log: any, supabaseClient: any): Promise<boolean> {
  // Implementar lógica específica baseada no tipo de webhook
  switch (log.platform) {
    case 'stripe':
      return await reprocessStripeWebhook(log, supabaseClient);
    case 'mercadopago':
      return await reprocessMercadoPagoWebhook(log, supabaseClient);
    default:
      return false;
  }
}

async function reprocessStripeWebhook(log: any, supabaseClient: any): Promise<boolean> {
  // Lógica específica para reprocessar webhooks do Stripe
  // Por exemplo, verificar status do pagamento no Stripe
  return Math.random() > 0.5; // Simulação
}

async function reprocessMercadoPagoWebhook(log: any, supabaseClient: any): Promise<boolean> {
  // Lógica específica para reprocessar webhooks do MercadoPago
  return Math.random() > 0.5; // Simulação
}

async function checkStripeSubscription(email: string, stripeKey: string) {
  const response = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` }
  });

  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    return { isActive: false };
  }

  const customerId = data.data[0].id;
  const subsResponse = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` }
  });

  const subsData = await subsResponse.json();
  
  return {
    isActive: subsData.data && subsData.data.length > 0,
    expiresAt: subsData.data?.[0]?.current_period_end ? 
      new Date(subsData.data[0].current_period_end * 1000).toISOString() : null
  };
}

async function sendCriticalAlert(supabaseClient: any, criticalFailures: any[]) {
  await supabaseClient
    .from('security_logs')
    .insert({
      action: 'critical_webhook_alert',
      details: {
        failure_count: criticalFailures.length,
        failures: criticalFailures.map(f => ({
          id: f.id,
          platform: f.platform,
          event_type: f.event_type,
          error: f.error_message
        })),
        severity: 'HIGH',
        requires_attention: true
      }
    });
}