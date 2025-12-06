import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { validateStoreIsOpen } from '../_shared/store-schedule-validator.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  customizations?: any;
}

interface OrderData {
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  delivery_fee?: number;
  payment_method?: string;
  delivery_method?: string;
  address_id?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
}

// Rate limiting em memória para múltiplas instâncias
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const stockReservations = new Map<string, { quantity: number; expires: number }>();

function checkRateLimit(userId: string, maxRequests: number = 25, windowMs: number = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const key = `orders:${userId}`;
  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetTime <= now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count++;
  return true;
}

function checkConcurrentLimit(userId: string, maxConcurrent: number = 3): boolean {
  const now = Date.now();
  const key = `concurrent:${userId}`;
  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetTime <= now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + (5 * 60 * 1000) }); // 5 minutos
    return true;
  }

  return existing.count < maxConcurrent;
}

async function validateProductAvailability(
  supabaseClient: any, 
  items: OrderItem[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    const productIds = items.map(item => item.product_id);
    
    const { data: products, error } = await supabaseClient
      .from('products')
      .select('id, is_available, name')
      .in('id', productIds);

    if (error) {
      console.error('Error fetching products:', error);
      return { valid: false, errors: ['Erro ao verificar produtos'] };
    }

    for (const item of items) {
      const product = products?.find((p: any) => p.id === item.product_id);
      
      if (!product) {
        errors.push(`Produto não encontrado: ${item.product_id}`);
        continue;
      }

      if (!product.is_available) {
        errors.push(`Produto indisponível: ${product.name}`);
        continue;
      }

      // Verificar reservas temporárias
      const reservationKey = `product:${item.product_id}`;
      const reservation = stockReservations.get(reservationKey);
      
      if (reservation && reservation.quantity >= 15) { // Limite de reservas
        errors.push(`Produto temporariamente indisponível: ${product.name}`);
      }
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    console.error('Unexpected error in product validation:', error);
    return { valid: false, errors: ['Erro interno na validação'] };
  }
}

function reserveStock(items: OrderItem[], userId: string): void {
  const now = Date.now();
  const expiresAt = now + (5 * 60 * 1000); // 5 minutos

  for (const item of items) {
    const key = `product:${item.product_id}`;
    const existing = stockReservations.get(key);
    
    stockReservations.set(key, {
      quantity: (existing?.quantity || 0) + item.quantity,
      expires: expiresAt
    });
  }

  console.log(`Stock reserved for user ${userId}:`, items.length, 'items');
}

function releaseStock(items: OrderItem[]): void {
  for (const item of items) {
    const key = `product:${item.product_id}`;
    const existing = stockReservations.get(key);
    
    if (existing) {
      const newQuantity = Math.max(0, existing.quantity - item.quantity);
      
      if (newQuantity === 0) {
        stockReservations.delete(key);
      } else {
        stockReservations.set(key, {
          ...existing,
          quantity: newQuantity
        });
      }
    }
  }
}

// Limpeza periódica de reservas expiradas
setInterval(() => {
  const now = Date.now();
  for (const [key, reservation] of stockReservations.entries()) {
    if (reservation.expires <= now) {
      stockReservations.delete(key);
    }
  }
}, 30 * 1000); // A cada 30 segundos

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Extraímos userId e email diretamente do JWT (Supabase já validou o token)
    let userId: string | null = null;
    let userEmail: string | null = null;

    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      userId = payload.sub ?? null;
      userEmail = payload.email ?? payload.user_metadata?.email ?? null;
    } catch (e) {
      console.error('Error decoding JWT payload:', e);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      console.error('JWT payload missing sub (user id)');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar rate limits
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Muitos pedidos recentes. Aguarde antes de tentar novamente.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkConcurrentLimit(userId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Concurrent limit exceeded', 
          message: 'Muitos pedidos simultâneos. Aguarde a conclusão dos anteriores.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData: OrderData = await req.json();
    console.log('[CREATE-ORDER] User authenticated:', userId);
    console.log('[CREATE-ORDER] Delivery method received:', orderData.delivery_method);
    console.log('[CREATE-ORDER] Address ID received:', orderData.address_id);

    // VALIDAÇÃO 0: Verificar se loja está aberta e logar tentativa
    const storeStatus = await validateStoreIsOpen(
      supabaseClient,
      userId,
      userEmail,
      {
        items: orderData.items || [],
        total: orderData.total_amount || 0
      }
    );
    
    if (!storeStatus.isOpen) {
      console.warn('[CREATE-ORDER-OPTIMIZED] Store closed - rejecting order');
      return new Response(
        JSON.stringify({
          error: storeStatus.error,
          nextOpening: storeStatus.nextOpening,
          message: `Não é possível criar pedidos no momento. ${storeStatus.nextOpening ? `Abriremos ${storeStatus.nextOpening}` : ''}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar dados básicos
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Items are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar disponibilidade de produtos
    const { valid, errors } = await validateProductAvailability(supabaseClient, orderData.items);
    
    if (!valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Product validation failed', 
          details: errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reservar estoque temporariamente
    reserveStock(orderData.items, userId);

    try {
      // FASE 2: Buscar perfil completo do usuário (CPF e email)
      console.log('[CREATE-ORDER] 📋 Buscando perfil do usuário para CPF e email');
      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('full_name, phone, cpf')
        .eq('id', userId)
        .single();
      
      if (userProfile) {
        console.log('[CREATE-ORDER] ✅ Perfil encontrado:', {
          has_cpf: !!userProfile.cpf,
          has_phone: !!userProfile.phone
        });
      }

      // Buscar endereço se for delivery e tiver address_id
      let delivery_address_snapshot = null;
      if (orderData.delivery_method === 'delivery' && orderData.address_id) {
        console.log('[CREATE-ORDER] 📍 Fetching address snapshot for delivery order');
        const { data: addr, error: addrError } = await supabaseClient
          .from('addresses')
          .select('street, number, neighborhood, city, state, zip_code, complement, reference_point')
          .eq('id', orderData.address_id)
          .single();
        
        if (!addrError && addr) {
          delivery_address_snapshot = addr;
          console.log('[CREATE-ORDER] ✅ Address snapshot created:', {
            neighborhood: addr.neighborhood,
            street: addr.street,
            has_complement: !!addr.complement
          });
        } else {
          console.warn('[CREATE-ORDER] ⚠️ Could not fetch address:', addrError);
        }
      }

      // Iniciar transação para criar pedido
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: orderData.total_amount,
          delivery_fee: orderData.delivery_fee || 0,
          payment_method: orderData.payment_method,
          delivery_method: orderData.delivery_method || 'delivery',
          address_id: orderData.address_id,
          delivery_address_snapshot: delivery_address_snapshot,
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          customer_cpf: userProfile?.cpf || null, // ✅ FASE 2: Salvar CPF
          customer_email: userEmail || null, // ✅ FASE 2: Salvar Email
          notes: orderData.notes,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        releaseStock(orderData.items);
        return new Response(
          JSON.stringify({ error: 'Failed to create order', details: orderError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar itens do pedido
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        customizations: item.customizations
      }));

      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        
        // Rollback: deletar pedido
        await supabaseClient
          .from('orders')
          .delete()
          .eq('id', order.id);
        
        releaseStock(orderData.items);
        
        return new Response(
          JSON.stringify({ error: 'Failed to create order items', details: itemsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Order created successfully:', order.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          order,
          message: 'Pedido criado com sucesso'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Unexpected error during order creation:', error);
      releaseStock(orderData.items);
      
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});