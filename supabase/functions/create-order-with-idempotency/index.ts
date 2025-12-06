// ===== EDGE FUNCTION: CRIAÇÃO DE PEDIDOS COM PROTEÇÃO DE IDEMPOTÊNCIA =====

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
}

// Rate limiting simples em memória
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (userId: string, maxRequests: number = 5, windowMs: number = 3600000): boolean => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || userLimit.resetTime <= now) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

// Cache de idempotência
const idempotencyCache = new Map<string, {
  result: any;
  timestamp: number;
  status: 'processing' | 'completed' | 'failed';
}>();

const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

const cleanupCache = () => {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      idempotencyCache.delete(key);
    }
  }
};

// Limpeza a cada 5 minutos
setInterval(cleanupCache, 5 * 60 * 1000);

const generateIdempotencyKey = (orderData: any): string => {
  const keyData = {
    user_id: orderData.user_id,
    items: orderData.items?.map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      customizations: item.customizations
    })).sort((a: any, b: any) => a.product_id.localeCompare(b.product_id)),
    total_amount: orderData.total_amount,
    payment_method: orderData.payment_method,
    delivery_method: orderData.delivery_method,
    time_window: Math.floor(Date.now() / 30000) // 30 segundos
  };
  
  return btoa(JSON.stringify(keyData));
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('[ORDER] Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar rate limiting
    if (!checkRateLimit(user.id)) {
      console.log('[ORDER] Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Maximum 5 orders per hour.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body = await req.json();
    console.log('[ORDER] Processing order for user:', user.id);

    // Gerar ou usar chave de idempotência
    let idempotencyKey = req.headers.get('x-idempotency-key');
    if (!idempotencyKey) {
      idempotencyKey = generateIdempotencyKey(body);
    }

    console.log('[ORDER] Idempotency key:', idempotencyKey.slice(0, 10) + '...');

    // Verificar cache de idempotência
    const cachedEntry = idempotencyCache.get(idempotencyKey);
    
    if (cachedEntry) {
      if (cachedEntry.status === 'completed') {
        console.log('[ORDER] Returning cached result');
        return new Response(
          JSON.stringify(cachedEntry.result),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (cachedEntry.status === 'processing') {
        console.log('[ORDER] Request already in progress');
        return new Response(
          JSON.stringify({ 
            error: 'Order already being processed' 
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Marcar como processando
    idempotencyCache.set(idempotencyKey, {
      result: null,
      timestamp: Date.now(),
      status: 'processing'
    });

    try {
      // Validar dados do pedido
      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        throw new Error('Items are required');
      }

      if (!body.total_amount || body.total_amount <= 0) {
        throw new Error('Invalid total amount');
      }

      // Iniciar transação
      const { data: orderData, error: orderError } = await supabaseClient
        .from('orders')
        .insert({
          user_id: user.id,
          address_id: body.address_id || null,
          total_amount: body.total_amount,
          delivery_fee: body.delivery_fee || 0,
          delivery_method: body.delivery_method || 'delivery',
          status: 'pending',
          payment_status: body.payment_status || 'pending',
          customer_name: body.customer_name,
          customer_phone: body.customer_phone,
          payment_method: body.payment_method,
          notes: body.notes
        })
        .select()
        .single();

      if (orderError) {
        console.error('[ORDER] Error creating order:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log('[ORDER] Order created:', orderData.id);

      // Criar itens do pedido
      const orderItems = body.items.map((item: any) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        customizations: item.customizations
      }));

      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('[ORDER] Error creating order items:', itemsError);
        
        // Rollback: deletar o pedido criado
        await supabaseClient
          .from('orders')
          .delete()
          .eq('id', orderData.id);
          
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      console.log('[ORDER] Order items created successfully');

      const result = {
        success: true,
        order: orderData,
        items: orderItems.length
      };

      // Marcar como completado no cache
      idempotencyCache.set(idempotencyKey, {
        result,
        timestamp: Date.now(),
        status: 'completed'
      });

      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (operationError) {
      console.error('[ORDER] Operation error:', operationError);
      
      // Marcar como falhado no cache
      idempotencyCache.set(idempotencyKey, {
        result: null,
        timestamp: Date.now(),
        status: 'failed'
      });

      throw operationError;
    }

  } catch (error) {
    console.error('[ORDER] Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});