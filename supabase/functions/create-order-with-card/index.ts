import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RateLimiter, RATE_LIMIT_CONFIGS } from "../_shared/rate-limiter.ts";
import { validateStoreIsOpen } from '../_shared/store-schedule-validator.ts';

// ===== CORS HEADERS =====
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('[CREATE-ORDER-WITH-CARD] 🚀 MERCADO PAGO CARD PAYMENT INTEGRATION LOADED');

serve(async (req) => {
  console.log('[CREATE-ORDER-WITH-CARD] Request received:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[CREATE-ORDER-WITH-CARD] CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment validation
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'MERCADOPAGO_ACCESS_TOKEN_PROD'
    ];

    for (const envVar of requiredEnvVars) {
      if (!Deno.env.get(envVar)) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    console.log('[CREATE-ORDER-WITH-CARD] ✅ Environment: PRODUCTION');
    console.log('[CREATE-ORDER-WITH-CARD] ✅ Using REAL MERCADO PAGO key (first 4 chars):', Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_PROD')?.substring(0, 4) + '...');

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication required' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client for auth verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid authentication' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[CREATE-ORDER-WITH-CARD] ✅ User authenticated:', user.id);

    // Get service role client for rate limiting
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar rate limiting persistente
    const rateLimiter = new RateLimiter(supabaseServiceClient);
    const rateLimitResult = await rateLimiter.check(
      user.id,
      'create-order-card',
      RATE_LIMIT_CONFIGS['create-order-card']
    );

    if (!rateLimitResult.allowed) {
      console.warn('[CREATE-ORDER-WITH-CARD] ⚠️ Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Limite de pedidos por hora excedido. Tente novamente mais tarde.',
          rateLimited: true,
          resetAt: rateLimitResult.resetAt
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS['create-order-card'].maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString()
          } 
        }
      );
    }

    console.log('[CREATE-ORDER-WITH-CARD] ✅ Rate limit check passed:', {
      remaining: rateLimitResult.remaining,
      resetAt: rateLimitResult.resetAt
    });

    // Parse request body
    const body = await req.text();
    if (!body.trim()) {
      throw new Error('Empty request body');
    }
    
    const requestData = JSON.parse(body);
    const { orderData, cardData } = requestData;
    
    console.log('[CREATE-ORDER-WITH-CARD] 📋 Request data received:', {
      items_count: orderData.items?.length,
      total_amount: orderData.total_amount,
      delivery_method: orderData.delivery_method,
      customer_name: orderData.customer_name || 'NOT_PROVIDED',
      card_provided: !!cardData,
    });

    // Validação de dados obrigatórios
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Missing items');
      throw new Error('Itens do pedido são obrigatórios');
    }

    if (!orderData.total_amount || isNaN(parseFloat(orderData.total_amount))) {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Invalid total amount:', orderData.total_amount);
      throw new Error('Valor total do pedido é obrigatório');
    }

    if (!orderData.customer_name || orderData.customer_name.trim() === '') {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Missing customer name:', orderData.customer_name);
      throw new Error('Nome do cliente é obrigatório');
    }

    if (!cardData || !cardData.token) {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Missing card data or token');
      throw new Error('Dados do cartão são obrigatórios');
    }

    console.log('[CREATE-ORDER-WITH-CARD] ✅ Basic validation passed');

    // VALIDAÇÃO 0: Verificar se loja está aberta e logar tentativa
    const storeStatus = await validateStoreIsOpen(
      supabaseServiceClient,
      user.id,
      user.email,
      {
        items: orderData.items || [],
        total: orderData.total_amount || 0
      }
    );
    
    if (!storeStatus.isOpen) {
      console.warn('[CREATE-ORDER-WITH-CARD] Store closed - rejecting order');
      return new Response(
        JSON.stringify({
          success: false,
          error: storeStatus.error,
          nextOpening: storeStatus.nextOpening,
          message: `Não é possível criar pedidos no momento. ${storeStatus.nextOpening ? `Abriremos ${storeStatus.nextOpening}` : ''}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ETAPA 1: Preparar dados do endereço se necessário
    let addressId = null;
    
    if (orderData.delivery_method === 'delivery' && orderData.addressData) {
      if (orderData.addressData.id) {
        addressId = orderData.addressData.id;
      } else {
        const { data: addressResult, error: addressError } = await supabaseServiceClient
          .from('addresses')
          .insert({
            user_id: user.id,
            ...orderData.addressData
          })
          .select()
          .single();

        if (addressError) {
          console.error('[CREATE-ORDER-WITH-CARD] ❌ Error creating address:', addressError);
          throw new Error('Erro ao criar endereço');
        }
        
        addressId = addressResult.id;
        console.log('[CREATE-ORDER-WITH-CARD] ✅ Address created:', addressId);
      }
    }

    // ETAPA 2: Validar perfil do usuário
    const { data: profile, error: profileError } = await supabaseServiceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.full_name) {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Profile validation failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Complete seu perfil antes de continuar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (orderData.delivery_method === 'delivery' && !profile.phone) {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Phone required for delivery');
      return new Response(
        JSON.stringify({ success: false, error: 'Telefone obrigatório para entregas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-ORDER-WITH-CARD] 👤 User profile:', {
      email: profile?.email,
      full_name: profile?.full_name,
      cpf: profile?.cpf ? profile.cpf.substring(0, 3) + '***' : 'not_provided'
    });

    // ETAPA 3: Processar pagamento com cartão via Mercado Pago
    const paymentData = {
      transaction_amount: parseFloat(orderData.total_amount),
      token: cardData.token,
      description: `Pedido Pizza - ${orderData.items.length} item(s)`,
      installments: parseInt(cardData.installments) || 1,
      payment_method_id: cardData.payment_method_id,
      issuer_id: cardData.issuer_id || null,
      payer: {
        email: profile?.email || user.email,
        identification: {
          type: "CPF",
          number: profile?.cpf?.replace(/\D/g, '') || "00000000000"
        }
      },
      external_reference: `order_${Date.now()}_${user.id.slice(0, 8)}`,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      metadata: {
        user_id: user.id,
        delivery_method: orderData.delivery_method,
        customer_name: orderData.customer_name
      }
    };

    console.log('[CREATE-ORDER-WITH-CARD] 💳 Creating REAL CARD payment with MercadoPago - amount:', paymentData.transaction_amount);

    // Fazer chamada para API do Mercado Pago
    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_PROD')}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `card_${Date.now()}_${user.id}`
      },
      body: JSON.stringify(paymentData)
    });

    if (!mercadoPagoResponse.ok) {
      const errorText = await mercadoPagoResponse.text();
      console.error('[CREATE-ORDER-WITH-CARD] ❌ MercadoPago API error:', mercadoPagoResponse.status, errorText);
      throw new Error('Erro ao processar pagamento com cartão');
    }

    const paymentResult = await mercadoPagoResponse.json();
    
    console.log('[CREATE-ORDER-WITH-CARD] ✅ REAL CARD payment created successfully:', {
      mercadopago_id: paymentResult.id,
      status: paymentResult.status,
      status_detail: paymentResult.status_detail,
      live_mode: paymentResult.live_mode,
      payment_method: paymentResult.payment_method_id,
      installments: paymentResult.installments
    });

    // ETAPA 4: Criar pedido no banco de dados
    const { data: orderResult, error: orderError } = await supabaseServiceClient
      .from('orders')
      .insert({
        user_id: user.id,
        address_id: addressId,
        delivery_method: orderData.delivery_method,
        total_amount: parseFloat(orderData.total_amount),
        delivery_fee: parseFloat(orderData.delivery_fee) || 0,
        payment_method: 'credit_card_online',
        payment_status: paymentResult.status === 'approved' ? 'paid' : 'pending',
        status: paymentResult.status === 'approved' ? 'confirmed' : 'pending',
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone || '',
        notes: orderData.notes || null
      })
      .select()
      .single();

    if (orderError) {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Error creating order:', orderError);
      throw new Error('Erro ao criar pedido');
    }

    console.log('[CREATE-ORDER-WITH-CARD] ✅ Order created:', orderResult.id);

    // ETAPA 5: Criar itens do pedido
    const orderItems = orderData.items.map((item: any) => ({
      order_id: orderResult.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      customizations: item.customizations || null
    }));

    const { error: itemsError } = await supabaseServiceClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('[CREATE-ORDER-WITH-CARD] ❌ Error creating order items:', itemsError);
      throw new Error('Erro ao criar itens do pedido');
    }

    console.log('[CREATE-ORDER-WITH-CARD] ✅ Order items created:', orderItems.length);

    // ETAPA 6: Salvar dados do pagamento
    try {
      const { error: paymentError } = await supabaseServiceClient
        .from('card_transactions')
        .insert({
          id: `MP-${paymentResult.id}`,
          user_id: user.id,
          order_id: orderResult.id,
          mercadopago_payment_id: paymentResult.id.toString(),
          amount: parseFloat(orderData.total_amount),
          status: paymentResult.status,
          status_detail: paymentResult.status_detail,
          payment_method_id: paymentResult.payment_method_id,
          installments: paymentResult.installments,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (paymentError) {
        console.warn('[CREATE-ORDER-WITH-CARD] ⚠️ Could not save payment data to card_transactions:', paymentError.message);
      } else {
        console.log('[CREATE-ORDER-WITH-CARD] ✅ Card transaction saved with MercadoPago ID:', paymentResult.id);
      }
    } catch (paymentSaveError) {
      console.warn('[CREATE-ORDER-WITH-CARD] ⚠️ Warning: Could not save payment transaction');
    }

    // ETAPA 7: Resposta final
    console.log('[CREATE-ORDER-WITH-CARD] 🎉 ✅ CARD PAYMENT PROCESSED SUCCESSFULLY');
    console.log('[CREATE-ORDER-WITH-CARD] 📊 Summary:', {
      orderId: orderResult.id,
      mercadopagoId: paymentResult.id,
      amount: orderData.total_amount,
      status: paymentResult.status,
      liveMode: paymentResult.live_mode
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: orderResult,
        payment: {
          mercadopago_id: paymentResult.id,
          status: paymentResult.status,
          status_detail: paymentResult.status_detail,
          payment_method: paymentResult.payment_method_id,
          installments: paymentResult.installments,
          approved: paymentResult.status === 'approved'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[CREATE-ORDER-WITH-CARD] ❌ Error processing request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});