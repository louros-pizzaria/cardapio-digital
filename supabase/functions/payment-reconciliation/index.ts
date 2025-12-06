import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReconciliationRequest {
  action: 'auto_reconcile' | 'manual_reconcile' | 'generate_report';
  payment_method?: string;
  date_range?: {
    start: string;
    end: string;
  };
  transaction_id?: string;
  manual_match?: {
    reconciliation_id: string;
    match_transaction_id: string;
  };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYMENT-RECONCILIATION] ${step}${detailsStr}`);
};

// Fetch transactions from external payment providers
const fetchExternalTransactions = async (paymentMethod: string, dateRange: any) => {
  const transactions: any[] = [];
  
  try {
    switch (paymentMethod) {
      case 'mercadopago':
        const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
        if (mpAccessToken) {
          const mpResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?begin_date=${dateRange.start}&end_date=${dateRange.end}&limit=50`,
            {
              headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (mpResponse.ok) {
            const mpData = await mpResponse.json();
            transactions.push(...mpData.results.map((payment: any) => ({
              external_id: payment.id.toString(),
              amount: payment.transaction_amount,
              fee: payment.fee_details?.reduce((total: number, fee: any) => total + fee.amount, 0) || 0,
              status: payment.status,
              created_at: payment.date_created,
              payment_method: 'mercadopago',
              order_reference: payment.external_reference,
            })));
          }
        }
        break;

      case 'pix':
        // PIX transactions are usually handled through MercadoPago or other providers
        // This is a placeholder for PIX-specific logic
        logStep("PIX reconciliation - using MercadoPago PIX data");
        break;

      case 'stripe':
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
          const stripeResponse = await fetch(
            `https://api.stripe.com/v1/payment_intents?created[gte]=${Math.floor(new Date(dateRange.start).getTime() / 1000)}&created[lte]=${Math.floor(new Date(dateRange.end).getTime() / 1000)}&limit=100`,
            {
              headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );
          
          if (stripeResponse.ok) {
            const stripeData = await stripeResponse.json();
            transactions.push(...stripeData.data.map((payment: any) => ({
              external_id: payment.id,
              amount: payment.amount / 100, // Convert from cents
              fee: payment.charges?.data[0]?.balance_transaction?.fee / 100 || 0,
              status: payment.status,
              created_at: new Date(payment.created * 1000).toISOString(),
              payment_method: 'stripe',
              order_reference: payment.metadata?.order_id,
            })));
          }
        }
        break;
    }
  } catch (error: any) {
    logStep(`Error fetching ${paymentMethod} transactions`, { error: error.message });
  }
  
  return transactions;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep("Payment reconciliation request received");

    const { action, payment_method, date_range, transaction_id, manual_match }: ReconciliationRequest = await req.json();
    
    switch (action) {
      case 'auto_reconcile':
        logStep("Starting auto reconciliation", { payment_method, date_range });
        
        const endDate = date_range?.end || new Date().toISOString();
        const startDate = date_range?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        // Get payment methods to reconcile
        const methods = payment_method ? [payment_method] : ['mercadopago', 'pix', 'stripe'];
        let totalReconciled = 0;
        
        for (const method of methods) {
          logStep(`Reconciling ${method}`, { startDate, endDate });
          
          // Fetch external transactions
          const externalTransactions = await fetchExternalTransactions(method, { start: startDate, end: endDate });
          logStep(`Found ${externalTransactions.length} external transactions`, { method });
          
          // Get internal orders for reconciliation
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
              id,
              total_amount,
              created_at,
              payment_method,
              pix_transactions(id, mercadopago_payment_id, amount, status),
              card_transactions(id, mercadopago_payment_id, amount, status)
            `)
            .eq('payment_method', method === 'pix' ? 'pix' : 'card')
            .gte('created_at', startDate)
            .lte('created_at', endDate);
          
          if (ordersError) {
            logStep("Error fetching orders", { error: ordersError.message });
            continue;
          }
          
          logStep(`Found ${orders?.length} internal orders`, { method });
          
          // Match transactions
          for (const order of orders || []) {
            for (const extTransaction of externalTransactions) {
              // Try to match by external reference or amount and timing
              const isMatchByReference = extTransaction.order_reference === order.id;
              const isMatchByAmount = Math.abs(extTransaction.amount - order.total_amount) < 0.01;
              const timeDiff = Math.abs(new Date(extTransaction.created_at).getTime() - new Date(order.created_at).getTime());
              const isMatchByTime = timeDiff < 60 * 60 * 1000; // Within 1 hour
              
              if (isMatchByReference || (isMatchByAmount && isMatchByTime)) {
                // Check if reconciliation already exists
                const { data: existingReconciliation } = await supabase
                  .from('payment_reconciliation')
                  .select('id')
                  .eq('external_transaction_id', extTransaction.external_id)
                  .single();
                
                if (!existingReconciliation) {
                  // Create reconciliation record
                  const { error: reconciliationError } = await supabase
                    .from('payment_reconciliation')
                    .insert({
                      payment_method: method,
                      external_transaction_id: extTransaction.external_id,
                      internal_transaction_id: method === 'pix' 
                        ? order.pix_transactions?.[0]?.id 
                        : order.card_transactions?.[0]?.id,
                      order_id: order.id,
                      expected_amount: order.total_amount,
                      received_amount: extTransaction.amount,
                      fee_amount: extTransaction.fee,
                      status: isMatchByAmount ? 'matched' : 'discrepancy',
                      reconciled_at: new Date().toISOString(),
                      discrepancy_reason: !isMatchByAmount ? 
                        `Amount difference: expected ${order.total_amount}, received ${extTransaction.amount}` : null,
                    });
                  
                  if (!reconciliationError) {
                    totalReconciled++;
                    logStep("Transaction reconciled", { 
                      orderId: order.id, 
                      externalId: extTransaction.external_id,
                      method: isMatchByReference ? 'reference' : 'amount_time'
                    });
                  }
                }
              }
            }
          }
        }
        
        logStep("Auto reconciliation completed", { totalReconciled });
        
        return new Response(JSON.stringify({
          success: true,
          reconciled_count: totalReconciled,
          message: `Successfully reconciled ${totalReconciled} transactions`
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'manual_reconcile':
        if (!manual_match) {
          throw new Error('Manual match data required');
        }
        
        logStep("Manual reconciliation", manual_match);
        
        const { error: manualError } = await supabase
          .from('payment_reconciliation')
          .update({
            status: 'matched',
            reconciled_at: new Date().toISOString(),
            discrepancy_reason: 'Manually reconciled',
          })
          .eq('id', manual_match.reconciliation_id);
        
        if (manualError) {
          throw manualError;
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Transaction manually reconciled'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'generate_report':
        logStep("Generating reconciliation report", { date_range });
        
        const reportEndDate = date_range?.end || new Date().toISOString();
        const reportStartDate = date_range?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: reconciliationData, error: reportError } = await supabase
          .from('payment_reconciliation')
          .select(`
            *,
            orders(id, customer_name, total_amount, created_at)
          `)
          .gte('created_at', reportStartDate)
          .lte('created_at', reportEndDate)
          .order('created_at', { ascending: false });
        
        if (reportError) {
          throw reportError;
        }
        
        // Generate summary statistics
        const summary = {
          total_transactions: reconciliationData?.length || 0,
          matched: reconciliationData?.filter(r => r.status === 'matched').length || 0,
          discrepancies: reconciliationData?.filter(r => r.status === 'discrepancy').length || 0,
          pending: reconciliationData?.filter(r => r.status === 'pending').length || 0,
          total_expected: reconciliationData?.reduce((sum, r) => sum + (r.expected_amount || 0), 0) || 0,
          total_received: reconciliationData?.reduce((sum, r) => sum + (r.received_amount || 0), 0) || 0,
          total_fees: reconciliationData?.reduce((sum, r) => sum + (r.fee_amount || 0), 0) || 0,
        };
        
        logStep("Report generated", summary);
        
        return new Response(JSON.stringify({
          success: true,
          summary,
          transactions: reconciliationData,
          date_range: { start: reportStartDate, end: reportEndDate }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    logStep("Reconciliation error", { error: error.message });
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});