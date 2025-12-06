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
    const workerId = `worker-${crypto.randomUUID()}`;
    console.log(`[QUEUE-PROCESSOR] Worker ${workerId} iniciado`);

    // Processar itens da fila em lote
    const batchSize = 3; // Processar até 3 pedidos simultaneamente
    const processedItems = [];

    while (processedItems.length < batchSize) {
      // Buscar próximo item da fila
      const { data: queueItems, error } = await supabase.rpc('dequeue_next_order', {
        p_worker_id: workerId,
        p_limit: 1
      });

      if (error) {
        console.error('[QUEUE-PROCESSOR] Erro ao buscar item da fila:', error);
        break;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log('[QUEUE-PROCESSOR] Nenhum item na fila');
        break;
      }

      const queueItem = queueItems[0];
      console.log(`[QUEUE-PROCESSOR] Processando item ${queueItem.queue_id}`);

      try {
        // Processar pedido usando Edge Function existente
        const result = await processOrderItem(queueItem);
        
        if (result.success) {
          // Marcar como completado
          await supabase.rpc('complete_queue_item', {
            p_queue_id: queueItem.queue_id,
            p_order_id: result.order_id,
            p_result_data: result.data
          });
          
          console.log(`[QUEUE-PROCESSOR] Item ${queueItem.queue_id} completado com sucesso`);
          processedItems.push({ queue_id: queueItem.queue_id, status: 'completed', order_id: result.order_id });
        } else {
          // Marcar como falhado
          await supabase.rpc('fail_queue_item', {
            p_queue_id: queueItem.queue_id,
            p_error_message: result.error || 'Erro desconhecido',
            p_error_details: { details: result.details }
          });
          
          console.error(`[QUEUE-PROCESSOR] Item ${queueItem.queue_id} falhou:`, result.error);
          processedItems.push({ queue_id: queueItem.queue_id, status: 'failed', error: result.error });
        }
      } catch (itemError) {
        console.error(`[QUEUE-PROCESSOR] Erro ao processar item ${queueItem.queue_id}:`, itemError);
        
        // Marcar como falhado
        await supabase.rpc('fail_queue_item', {
          p_queue_id: queueItem.queue_id,
          p_error_message: itemError instanceof Error ? itemError.message : String(itemError),
          p_error_details: { stack: itemError instanceof Error ? itemError.stack : String(itemError) }
        });
        
        processedItems.push({ queue_id: queueItem.queue_id, status: 'failed', error: itemError instanceof Error ? itemError.message : String(itemError) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      worker_id: workerId,
      processed_count: processedItems.length,
      items: processedItems
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[QUEUE-PROCESSOR] Erro geral:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Função para processar um item da fila
async function processOrderItem(queueItem: any): Promise<{ success: boolean; order_id?: string; data?: any; error?: string; details?: any }> {
  try {
    const { order_data, user_id, idempotency_key } = queueItem;
    
    console.log(`[QUEUE-PROCESSOR] Processando pedido para usuário ${user_id}`);

    // 1. Verificar disponibilidade de produtos usando sistema atômico
    const stockCheckResult = await checkProductAvailability(order_data.items);
    if (!stockCheckResult.success) {
      return {
        success: false,
        error: 'Produtos indisponíveis',
        details: stockCheckResult.errors
      };
    }

    // 2. Reservar estoque atomicamente
    const reservationResult = await reserveStockAtomically(order_data.items, user_id, idempotency_key);
    if (!reservationResult.success) {
      return {
        success: false,
        error: 'Falha na reserva de estoque',
        details: reservationResult.errors
      };
    }

    try {
      // 3. Criar pedido no banco
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id,
          total_amount: order_data.total_amount,
          delivery_fee: order_data.delivery_fee || 0,
          payment_method: order_data.payment_method,
          payment_status: 'pending',
          status: 'pending',
          customer_name: order_data.customer_name,
          customer_phone: order_data.customer_phone,
          address_id: order_data.address_id,
          notes: order_data.notes,
          delivery_method: order_data.delivery_method || 'delivery'
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      }

      // 4. Criar itens do pedido
      const orderItems = order_data.items.map((item: any) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        customizations: item.customizations
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // Rollback do pedido
        await supabase.from('orders').delete().eq('id', orderData.id);
        throw new Error(`Erro ao criar itens do pedido: ${itemsError.message}`);
      }

      // 5. Confirmar reservas de estoque
      const confirmResult = await confirmStockReservations(reservationResult.reservations, orderData.id);
      if (!confirmResult.success) {
        console.warn('[QUEUE-PROCESSOR] Falha ao confirmar reservas:', confirmResult.errors);
        // Não falhar o pedido por isso, apenas logar
      }

      // 6. Agendar jobs de background
      await scheduleBackgroundJobs(orderData.id, user_id, order_data);

      return {
        success: true,
        order_id: orderData.id,
        data: orderData
      };

    } catch (error) {
      // Liberar reservas em caso de erro
      if (reservationResult.reservations?.length > 0) {
        await releaseStockReservations(reservationResult.reservations, 'Erro na criação do pedido via fila');
      }
      throw error;
    }

  } catch (error) {
    console.error('[QUEUE-PROCESSOR] Erro no processamento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: { stack: error instanceof Error ? error.stack : String(error) }
    };
  }
}

// Funções auxiliares para operações de estoque
async function checkProductAvailability(items: any[]): Promise<{ success: boolean; errors: string[] }> {
  try {
    const { data, error } = await supabase.rpc('atomic_reserve_stock', {
      p_product_id: items[0].product_id,
      p_user_id: 'check-only',
      p_quantity: 0, // Apenas verificar
      p_ttl_minutes: 0
    });

    // Implementar verificação real aqui
    return { success: true, errors: [] };
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}

async function reserveStockAtomically(items: any[], userId: string, orderKey?: string): Promise<{ success: boolean; reservations: string[]; errors: string[] }> {
  const reservations: string[] = [];
  const errors: string[] = [];

  for (const item of items) {
    try {
      const { data, error } = await supabase.rpc('atomic_reserve_stock', {
        p_product_id: item.product_id,
        p_user_id: userId,
        p_quantity: item.quantity,
        p_order_key: orderKey,
        p_ttl_minutes: 5
      });

      if (error) {
        errors.push(`Erro ao reservar ${item.product_id}: ${error.message}`);
        continue;
      }

      const result = data?.[0];
      if (result?.success && result.reservation_id) {
        reservations.push(result.reservation_id);
      } else {
        errors.push(`Falha na reserva de ${item.product_id}: ${result?.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      errors.push(`Exceção ao reservar ${item.product_id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    reservations,
    errors
  };
}

async function confirmStockReservations(reservationIds: string[], orderId: string): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const reservationId of reservationIds) {
    try {
      const { data, error } = await supabase.rpc('atomic_confirm_stock', {
        p_reservation_id: reservationId,
        p_order_id: orderId
      });

      if (error) {
        errors.push(`Erro ao confirmar reserva ${reservationId}: ${error.message}`);
      }
    } catch (error) {
      errors.push(`Exceção ao confirmar reserva ${reservationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

async function releaseStockReservations(reservationIds: string[], reason: string): Promise<void> {
  for (const reservationId of reservationIds) {
    try {
      await supabase.rpc('atomic_release_stock', {
        p_reservation_id: reservationId,
        p_reason: reason
      });
    } catch (error) {
      console.error(`Erro ao liberar reserva ${reservationId}:`, error);
    }
  }
}

async function scheduleBackgroundJobs(orderId: string, userId: string, orderData: any): Promise<void> {
  const jobs = [
    {
      job_type: 'email_notification',
      job_data: { order_id: orderId, user_id: userId, type: 'order_confirmation' },
      priority: 3
    },
    {
      job_type: 'analytics_tracking',
      job_data: { order_id: orderId, user_id: userId, order_value: orderData.total_amount },
      priority: 5
    },
    {
      job_type: 'kitchen_notification',
      job_data: { order_id: orderId, items: orderData.items },
      priority: 2
    }
  ];

  for (const job of jobs) {
    try {
      await supabase.rpc('enqueue_background_job', {
        p_job_type: job.job_type,
        p_job_data: job.job_data,
        p_priority: job.priority
      });
    } catch (error) {
      console.error(`Erro ao agendar job ${job.job_type}:`, error);
    }
  }
}