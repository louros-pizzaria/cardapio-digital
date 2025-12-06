import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurar Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_type } = await req.json().catch(() => ({}));
    const workerId = `bg-worker-${crypto.randomUUID()}`;
    
    console.log(`[BACKGROUND-WORKER] Worker ${workerId} iniciado para tipo: ${job_type || 'todos'}`);

    // Buscar jobs pendentes
    let query = supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (job_type) {
      query = query.eq('job_type', job_type);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('[BACKGROUND-WORKER] Erro ao buscar jobs:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!jobs || jobs.length === 0) {
      console.log('[BACKGROUND-WORKER] Nenhum job pendente encontrado');
      return new Response(JSON.stringify({
        success: true,
        worker_id: workerId,
        processed_count: 0,
        message: 'Nenhum job para processar'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const processedJobs = [];

    // Processar jobs em paralelo
    const jobPromises = jobs.map(job => processBackgroundJob(job, workerId));
    const results = await Promise.allSettled(jobPromises);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const job = jobs[i];

      if (result.status === 'fulfilled') {
        processedJobs.push({
          job_id: job.id,
          job_type: job.job_type,
          status: 'completed',
          result: result.value
        });
      } else {
        processedJobs.push({
          job_id: job.id,
          job_type: job.job_type,
          status: 'failed',
          error: result.reason?.message || 'Erro desconhecido'
        });
      }
    }

    console.log(`[BACKGROUND-WORKER] Worker ${workerId} processou ${processedJobs.length} jobs`);

    return new Response(JSON.stringify({
      success: true,
      worker_id: workerId,
      processed_count: processedJobs.length,
      jobs: processedJobs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BACKGROUND-WORKER] Erro geral:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Processar um job individual
async function processBackgroundJob(job: any, workerId: string): Promise<any> {
  const { id: jobId, job_type, job_data, timeout_seconds } = job;
  
  console.log(`[BACKGROUND-WORKER] Processando job ${jobId} do tipo ${job_type}`);

  try {
    // Marcar job como processando
    const { error: updateError } = await supabase
      .from('background_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        worker_id: workerId,
        attempts: job.attempts + 1
      })
      .eq('id', jobId)
      .eq('status', 'pending'); // Apenas se ainda estiver pendente

    if (updateError) {
      throw new Error(`Erro ao marcar job como processando: ${updateError.message}`);
    }

    // Configurar timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout do job')), (timeout_seconds || 300) * 1000);
    });

    // Processar job com timeout
    const result = await Promise.race([
      executeJobByType(job_type, job_data),
      timeoutPromise
    ]);

    // Marcar como completado
    await supabase
      .from('background_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: result
      })
      .eq('id', jobId);

    console.log(`[BACKGROUND-WORKER] Job ${jobId} completado com sucesso`);
    return result;

  } catch (error) {
    console.error(`[BACKGROUND-WORKER] Erro no job ${jobId}:`, error);

    // Determinar se deve reagendar ou falhar permanentemente
    const maxAttempts = job.max_attempts || 5;
    const currentAttempts = job.attempts + 1;
    
    if (currentAttempts >= maxAttempts) {
      // Falhar permanentemente
      await supabase
        .from('background_jobs')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
          error_details: { stack: error instanceof Error ? error.stack : String(error) }
        })
        .eq('id', jobId);
    } else {
      // Reagendar com backoff exponencial
      const delay = Math.pow(2, currentAttempts) * 60; // Em segundos
      const scheduledAt = new Date(Date.now() + delay * 1000);
      
      await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          scheduled_at: scheduledAt.toISOString(),
          started_at: null,
          worker_id: null,
          error_message: error instanceof Error ? error.message : String(error),
          error_details: { stack: error instanceof Error ? error.stack : String(error) }
        })
        .eq('id', jobId);
    }

    throw error;
  }
}

// Executar job baseado no tipo
async function executeJobByType(jobType: string, jobData: any): Promise<any> {
  switch (jobType) {
    case 'email_notification':
      return await processEmailNotification(jobData);
    
    case 'analytics_tracking':
      return await processAnalyticsTracking(jobData);
    
    case 'kitchen_notification':
      return await processKitchenNotification(jobData);
    
    case 'order_cleanup':
      return await processOrderCleanup(jobData);
    
    case 'stock_reconciliation':
      return await processStockReconciliation(jobData);
    
    case 'payment_verification':
      return await processPaymentVerification(jobData);
    
    default:
      throw new Error(`Tipo de job não suportado: ${jobType}`);
  }
}

// Implementações específicas de cada tipo de job
async function processEmailNotification(data: any): Promise<any> {
  console.log('[EMAIL-JOB] Processando notificação por email:', data);
  
  // Simular envio de email (substituir por integração real)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    email_sent: true,
    recipient: data.email || 'unknown',
    template: data.type || 'generic',
    order_id: data.order_id
  };
}

async function processAnalyticsTracking(data: any): Promise<any> {
  console.log('[ANALYTICS-JOB] Registrando evento analytics:', data);
  
  // Buscar dados adicionais se necessário
  if (data.order_id) {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', data.order_id)
      .single();
    
    if (orderData) {
      // Enviar para sistema de analytics
      console.log('[ANALYTICS-JOB] Dados do pedido:', {
        order_id: orderData.id,
        value: orderData.total_amount,
        payment_method: orderData.payment_method
      });
    }
  }
  
  return {
    event_tracked: true,
    order_id: data.order_id,
    user_id: data.user_id
  };
}

async function processKitchenNotification(data: any): Promise<any> {
  console.log('[KITCHEN-JOB] Notificando cozinha:', data);
  
  // Simular notificação para cozinha (webhook, SMS, etc.)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    kitchen_notified: true,
    order_id: data.order_id,
    items_count: data.items?.length || 0
  };
}

async function processOrderCleanup(data: any): Promise<any> {
  console.log('[CLEANUP-JOB] Limpando dados antigos:', data);
  
  // Limpar logs antigos, cache, etc.
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias
  
  const { count } = await supabase
    .from('stock_audit_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString());
  
  return {
    cleanup_completed: true,
    records_deleted: count || 0
  };
}

async function processStockReconciliation(data: any): Promise<any> {
  console.log('[STOCK-JOB] Reconciliando estoque:', data);
  
  // Verificar inconsistências no estoque
  const { data: stockData } = await supabase
    .from('product_stock')
    .select('*');
  
  let reconciled = 0;
  for (const stock of stockData || []) {
    if (stock.available_quantity < 0) {
      // Corrigir estoque negativo
      await supabase
        .from('product_stock')
        .update({ available_quantity: 0 })
        .eq('id', stock.id);
      reconciled++;
    }
  }
  
  return {
    reconciliation_completed: true,
    items_reconciled: reconciled
  };
}

async function processPaymentVerification(data: any): Promise<any> {
  console.log('[PAYMENT-JOB] Verificando pagamento:', data);
  
  // Verificar status do pagamento com gateway
  const { data: orderData } = await supabase
    .from('orders')
    .select('*')
    .eq('id', data.order_id)
    .single();
  
  if (orderData && orderData.payment_status === 'pending') {
    // Simular verificação com gateway de pagamento
    const paymentConfirmed = Math.random() > 0.1; // 90% de chance de confirmação
    
    if (paymentConfirmed) {
      await supabase
        .from('orders')
        .update({ payment_status: 'completed' })
        .eq('id', data.order_id);
    }
    
    return {
      payment_verified: true,
      order_id: data.order_id,
      status: paymentConfirmed ? 'confirmed' : 'pending'
    };
  }
  
  return {
    payment_verified: true,
    order_id: data.order_id,
    status: 'already_processed'
  };
}