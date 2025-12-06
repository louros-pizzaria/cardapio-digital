import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, details?: any) {
  console.log(`[MERCADOPAGO-PREFERENCE] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    // Get MercadoPago credentials
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_PROD');
    if (!mercadopagoAccessToken) {
      throw new Error('MercadoPago access token not configured');
    }
    logStep('MercadoPago access token verified');

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error('User not authenticated');
    }
    logStep('User authenticated', { userId: user.id, email: user.email });

    // Parse request body
    const { orderId, paymentMethod } = await req.json();
    logStep('Request data', { orderId, paymentMethod });

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Create Supabase service client to access orders (bypasses RLS)
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get order details from Supabase using service client
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logStep('Order not found error', { orderError, orderId });
      throw new Error('Order not found');
    }
    logStep('Order found', { orderId: order.id, amount: order.total_amount });

    // Create MercadoPago preference
    const preferenceData = {
      items: [
        {
          title: `Pedido #${order.id.substring(0, 8)}`,
          quantity: 1,
          unit_price: parseFloat(order.total_amount.toString()),
          currency_id: 'BRL'
        }
      ],
      payment_methods: {
        excluded_payment_types: paymentMethod === 'pix' ? [
          { id: 'credit_card' },
          { id: 'debit_card' }
        ] : paymentMethod === 'credit_card' ? [
          { id: 'account_money' },
          { id: 'ticket' }
        ] : [],
        installments: paymentMethod === 'credit_card' ? 12 : undefined
      },
      back_urls: {
        success: `${req.headers.get('origin')}/payment-success?order_id=${orderId}`,
        failure: `${req.headers.get('origin')}/payment-failure?order_id=${orderId}`,
        pending: `${req.headers.get('origin')}/order-status/${orderId}`
      },
      auto_return: 'approved',
      external_reference: orderId,
      notification_url: `https://xpgsfovrxguphlvncgwn.supabase.co/functions/v1/mercadopago-webhook`,
      payer: {
        email: user.email
      }
    };

    logStep('Creating MercadoPago preference', { preferenceData });

    // Call MercadoPago API
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadopagoAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('MercadoPago API error', { status: response.status, error: errorText });
      throw new Error(`MercadoPago API error: ${response.status}`);
    }

    const preference = await response.json();
    logStep('MercadoPago preference created', { preferenceId: preference.id });

    // Update order with preference ID using service client
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({ 
        payment_method: paymentMethod,
        payment_status: 'pending'
      })
      .eq('id', orderId);

    if (updateError) {
      logStep('Error updating order', updateError);
    }

    return new Response(
      JSON.stringify({ 
        preference_id: preference.id,
        init_point: preference.init_point 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Error', { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});