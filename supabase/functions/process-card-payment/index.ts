import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, details?: any) {
  console.log(`[PROCESS-CARD-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Card payment processing started');

    // Get MercadoPago credentials
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_PROD');
    if (!mercadopagoAccessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logStep('Authentication error', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { orderId, cardToken, installments, payer } = await req.json();
    logStep('Request data', { orderId, installments, payer: payer.email });

    if (!orderId || !cardToken) {
      throw new Error('Order ID and card token are required');
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      logStep('Order not found', { orderError, orderId });
      throw new Error('Order not found');
    }

    logStep('Order found', { orderId: order.id, amount: order.total_amount });

    // Create payment with MercadoPago
    const paymentData = {
      transaction_amount: parseFloat(order.total_amount.toString()),
      token: cardToken,
      description: `Pedido #${order.id.substring(0, 8)}`,
      installments: installments || 1,
      payment_method_id: 'visa', // This should be detected by the SDK
      payer: {
        email: payer.email,
        identification: payer.identification
      },
      external_reference: orderId,
      notification_url: `https://xpgsfovrxguphlvncgwn.supabase.co/functions/v1/mercadopago-webhook`,
      metadata: {
        order_id: orderId,
        user_id: user.id
      }
    };

    logStep('Creating MercadoPago payment', { paymentData: { ...paymentData, token: '[HIDDEN]' } });

    // Call MercadoPago API
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadopagoAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${orderId}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      logStep('MercadoPago API error', { status: response.status, error: errorData });
      throw new Error(`Payment failed: ${errorData.message || 'Unknown error'}`);
    }

    const payment = await response.json();
    logStep('MercadoPago payment created', { 
      paymentId: payment.id, 
      status: payment.status,
      statusDetail: payment.status_detail 
    });

    // Update order based on payment status
    let orderStatus = 'pending';
    let paymentStatus = 'pending';

    switch (payment.status) {
      case 'approved':
        orderStatus = 'confirmed';
        paymentStatus = 'paid';
        break;
      case 'rejected':
        orderStatus = 'cancelled';
        paymentStatus = 'failed';
        break;
      case 'pending':
      case 'in_process':
        orderStatus = 'pending';
        paymentStatus = 'pending';
        break;
    }

    // Update order in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: payment.payment_method_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      logStep('Error updating order', updateError);
    }

    logStep('Payment processed successfully', { 
      paymentId: payment.id, 
      status: payment.status,
      orderStatus,
      paymentStatus 
    });

    return new Response(
      JSON.stringify({
        status: payment.status,
        message: payment.status === 'approved' ? 'Payment approved' : 
                payment.status === 'rejected' ? payment.status_detail : 
                'Payment pending',
        payment_id: payment.id,
        order_status: orderStatus
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Error processing card payment', { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});