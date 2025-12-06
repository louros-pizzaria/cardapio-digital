import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[PIX-STATUS] 🚀 REAL PIX STATUS CHECK - FASE 1 IMPLEMENTATION');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_PROD');

    if (!mercadopagoAccessToken) {
      console.error('[PIX-STATUS] ❌ MERCADOPAGO_ACCESS_TOKEN_PROD not configured');
      return new Response(
        JSON.stringify({ error: 'MercadoPago token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { transactionId } = await req.json();
    console.log('[PIX-STATUS] 🔍 Checking transaction:', transactionId);

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[PIX-STATUS] ❌ Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch PIX transaction with MercadoPago payment ID
    const { data: transaction, error: transactionError } = await supabase
      .from('pix_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (transactionError || !transaction) {
      console.error('[PIX-STATUS] ❌ Transaction not found:', transactionError);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[PIX-STATUS] 📊 Transaction found:', {
      id: transaction.id,
      status: transaction.status,
      orderId: transaction.order_id,
      mercadopagoPaymentId: transaction.mercadopago_payment_id,
      amount: transaction.amount
    });

    // Check if transaction has expired
    const now = new Date();
    const expiresAt = new Date(transaction.expires_at);
    
    if (now > expiresAt && transaction.status === 'pending') {
      console.log('[PIX-STATUS] ⏰ Transaction expired, updating status');
      
      // Update transaction status to expired
      const { error: updateError } = await supabase
        .from('pix_transactions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('[PIX-STATUS] ❌ Error updating expired transaction:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          status: 'expired',
          message: 'Transaction has expired'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 🌐 REAL MERCADOPAGO API INTEGRATION (FASE 1 IMPLEMENTATION)
    
    if (transaction.status === 'pending' && transaction.mercadopago_payment_id) {
      console.log('[PIX-STATUS] 🌐 Querying REAL MercadoPago API for payment status');
      console.log('[PIX-STATUS] 🔗 Payment ID:', transaction.mercadopago_payment_id);

      try {
        // Query real MercadoPago API
        const paymentResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${transaction.mercadopago_payment_id}`, 
          {
            headers: {
              'Authorization': `Bearer ${mercadopagoAccessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!paymentResponse.ok) {
          console.error('[PIX-STATUS] ❌ MercadoPago API error:', {
            status: paymentResponse.status,
            statusText: paymentResponse.statusText
          });
          
          // If payment not found, it might have been cancelled/expired
          if (paymentResponse.status === 404) {
            console.log('[PIX-STATUS] 🚫 Payment not found in MercadoPago, marking as expired');
            
            const { error: updateError } = await supabase
              .from('pix_transactions')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', transactionId);

            if (updateError) {
              console.error('[PIX-STATUS] ❌ Error updating transaction:', updateError);
            }

            return new Response(
              JSON.stringify({ 
                status: 'expired',
                message: 'Payment not found in MercadoPago'
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          // For other errors, continue with current status
          console.log('[PIX-STATUS] ⚠️ API error, returning current status');
        } else {
          // Parse real payment data from MercadoPago
          const payment = await paymentResponse.json();
          
          console.log('[PIX-STATUS] 📊 REAL payment data received:', {
            id: payment.id,
            status: payment.status,
            status_detail: payment.status_detail,
            payment_method: payment.payment_method_id,
            amount: payment.transaction_amount,
            date_created: payment.date_created,
            date_approved: payment.date_approved,
            live_mode: payment.live_mode
          });

          // Map MercadoPago status to our status
          let newStatus = transaction.status;
          let shouldUpdateOrder = false;

          switch (payment.status) {
            case 'approved':
              newStatus = 'paid';
              shouldUpdateOrder = true;
              console.log('[PIX-STATUS] ✅ Payment approved by MercadoPago');
              break;
            case 'rejected':
            case 'cancelled':
              newStatus = 'rejected';
              shouldUpdateOrder = true;
              console.log('[PIX-STATUS] ❌ Payment rejected/cancelled by MercadoPago');
              break;
            case 'pending':
            case 'in_process':
              newStatus = 'pending';
              console.log('[PIX-STATUS] ⏳ Payment still pending in MercadoPago');
              break;
            default:
              console.log('[PIX-STATUS] ❓ Unknown payment status:', payment.status);
              break;
          }

          // Update transaction status if changed
          if (newStatus !== transaction.status) {
            console.log('[PIX-STATUS] 🔄 Updating transaction status:', {
              from: transaction.status,
              to: newStatus
            });

            const { error: updateTxError } = await supabase
              .from('pix_transactions')
              .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', transactionId);

            if (updateTxError) {
              console.error('[PIX-STATUS] ❌ Error updating transaction:', updateTxError);
            } else if (shouldUpdateOrder) {
              // Update order status
              const orderStatus = newStatus === 'paid' ? 'confirmed' : 'cancelled';
              const paymentStatus = newStatus === 'paid' ? 'paid' : 'rejected';

              console.log('[PIX-STATUS] 🔄 Updating order status:', {
                orderId: transaction.order_id,
                orderStatus,
                paymentStatus
              });

              const { error: updateOrderError } = await supabase
                .from('orders')
                .update({ 
                  payment_status: paymentStatus,
                  status: orderStatus,
                  updated_at: new Date().toISOString()
                })
                .eq('id', transaction.order_id);

              if (updateOrderError) {
                console.error('[PIX-STATUS] ❌ Error updating order:', updateOrderError);
              } else {
                console.log('[PIX-STATUS] ✅ Order updated successfully');
              }
            }

            // Return updated status
            return new Response(
              JSON.stringify({ 
                status: newStatus,
                message: newStatus === 'paid' ? 'Payment confirmed' : 
                        newStatus === 'rejected' ? 'Payment rejected' : 
                        'Payment status updated',
                confirmed_at: newStatus === 'paid' ? new Date().toISOString() : undefined
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        }
      } catch (apiError) {
        console.error('[PIX-STATUS] ❌ Error querying MercadoPago API:', apiError);
        // Continue with current status on API errors
      }
    } else if (transaction.status === 'pending' && !transaction.mercadopago_payment_id) {
      console.log('[PIX-STATUS] ⚠️ Transaction pending but no MercadoPago payment ID');
    }

    // Return current status if no changes
    console.log('[PIX-STATUS] 📊 Current transaction status:', transaction.status);

    return new Response(
      JSON.stringify({ 
        status: transaction.status,
        message: transaction.status === 'pending' ? 'Payment pending' : 
                transaction.status === 'paid' ? 'Payment confirmed' :
                transaction.status === 'expired' ? 'Payment expired' :
                transaction.status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[PIX-STATUS] ❌ Error checking PIX status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})