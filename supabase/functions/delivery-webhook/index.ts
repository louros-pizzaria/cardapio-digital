import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-platform',
};

interface DeliveryWebhookPayload {
  platform: string;
  event_type: string;
  order_id: string;
  external_order_id?: string;
  status?: string;
  customer?: {
    name: string;
    phone: string;
    email?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    observations?: string;
  }>;
  delivery?: {
    address: string;
    neighborhood: string;
    city: string;
    estimated_time?: number;
  };
  payment?: {
    method: string;
    amount: number;
    status: string;
  };
  metadata?: any;
}

// Logging helper
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELIVERY-WEBHOOK] ${step}${detailsStr}`);
};

// Signature validation for different platforms
const validateSignature = (payload: string, signature: string, platform: string, secret: string): boolean => {
  try {
    switch (platform.toLowerCase()) {
      case 'ifood':
        // iFood uses HMAC-SHA256
        const ifoodSignature = createHmac('sha256', secret).update(payload).digest('hex');
        return signature === ifoodSignature;
      
      case 'uber_eats':
        // Uber Eats uses HMAC-SHA256 with specific format
        const uberSignature = createHmac('sha256', secret).update(payload).digest('hex');
        return signature.replace('sha256=', '') === uberSignature;
      
      case 'rappi':
        // Rappi uses custom validation
        const rappiSignature = createHmac('sha1', secret).update(payload).digest('hex');
        return signature === rappiSignature;
      
      default:
        logStep("Unknown platform, skipping signature validation", { platform });
        return true; // Allow unknown platforms for testing
    }
  } catch (error) {
    logStep("Signature validation error", { error: error instanceof Error ? error.message : String(error), platform });
    return false;
  }
};

// Transform platform-specific data to unified format
const transformOrderData = (payload: any, platform: string): DeliveryWebhookPayload => {
  switch (platform.toLowerCase()) {
    case 'ifood':
      return {
        platform: 'ifood',
        event_type: payload.eventType || 'order_update',
        order_id: payload.id,
        external_order_id: payload.reference,
        status: payload.status,
        customer: {
          name: payload.customer?.name,
          phone: payload.customer?.phone,
          email: payload.customer?.email,
        },
        items: payload.items?.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          observations: item.observations,
        })),
        delivery: {
          address: payload.delivery?.address,
          neighborhood: payload.delivery?.neighborhood,
          city: payload.delivery?.city,
          estimated_time: payload.delivery?.estimatedTime,
        },
        payment: {
          method: payload.payment?.method,
          amount: payload.totalPrice,
          status: payload.payment?.status,
        },
        metadata: payload,
      };
    
    case 'uber_eats':
      return {
        platform: 'uber_eats',
        event_type: payload.event_type || 'order.update',
        order_id: payload.order?.id,
        external_order_id: payload.order?.external_reference_id,
        status: payload.order?.current_state,
        customer: {
          name: payload.order?.eater?.first_name + ' ' + payload.order?.eater?.last_name,
          phone: payload.order?.eater?.phone_number,
        },
        items: payload.order?.cart?.items?.map((item: any) => ({
          name: item.title,
          quantity: item.quantity,
          price: item.price?.amount,
          observations: item.special_instructions,
        })),
        delivery: {
          address: payload.order?.delivery?.location?.address,
          neighborhood: payload.order?.delivery?.location?.neighborhood,
          city: payload.order?.delivery?.location?.city,
        },
        payment: {
          method: 'card', // Uber Eats always uses card
          amount: payload.order?.pricing?.total_fee,
          status: 'paid',
        },
        metadata: payload,
      };
    
    default:
      // Generic transformation for unknown platforms
      return {
        platform,
        event_type: payload.event_type || 'order_update',
        order_id: payload.order_id || payload.id,
        external_order_id: payload.external_id,
        status: payload.status,
        customer: payload.customer,
        items: payload.items,
        delivery: payload.delivery,
        payment: payload.payment,
        metadata: payload,
      };
  }
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
    logStep("Webhook received", { method: req.method, url: req.url });

    const platform = req.headers.get('x-platform') || 'unknown';
    const signature = req.headers.get('x-signature') || '';
    const rawBody = await req.text();
    
    logStep("Headers extracted", { platform, hasSignature: !!signature });

    // Get platform configuration for signature validation
    const { data: integration } = await supabase
      .from('delivery_integrations')
      .select('api_key, configuration')
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (!integration) {
      logStep("No active integration found", { platform });
      return new Response(JSON.stringify({ error: 'Integration not found or inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate signature if provided
    if (signature && integration.api_key) {
      const isValidSignature = validateSignature(rawBody, signature, platform, integration.api_key);
      if (!isValidSignature) {
        logStep("Invalid signature", { platform, signature: signature.substring(0, 10) + '...' });
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      logStep("Signature validated successfully");
    }

    const payload = JSON.parse(rawBody);
    const transformedData = transformOrderData(payload, platform);
    
    logStep("Data transformed", { orderId: transformedData.order_id, eventType: transformedData.event_type });

    // Log the webhook
    const { data: webhookLog, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        platform,
        event_type: transformedData.event_type,
        payload: payload,
        signature,
        status: 'pending',
      })
      .select()
      .single();

    if (logError) {
      logStep("Failed to log webhook", { error: logError.message });
      throw logError;
    }

    logStep("Webhook logged", { logId: webhookLog.id });

    // Process the order based on event type
    let orderId = null;
    try {
      switch (transformedData.event_type) {
        case 'order_created':
        case 'order.created':
        case 'new_order':
          // Create new external order
          orderId = await supabase.rpc('process_external_order', {
            p_platform: platform,
            p_external_id: transformedData.external_order_id || transformedData.order_id,
            p_order_data: {
              customer_name: transformedData.customer?.name,
              customer_phone: transformedData.customer?.phone,
              total_amount: transformedData.payment?.amount || 0,
              delivery_fee: 0, // Platform handles delivery fee
              status: transformedData.status || 'pending',
              customer: transformedData.customer,
              items: transformedData.items,
              delivery_address: transformedData.delivery,
            },
          });
          logStep("External order processed", { orderId });
          break;

        case 'order_updated':
        case 'order.updated':
        case 'status_change':
          // Update existing order status
          const { error: updateError } = await supabase
            .from('external_orders')
            .update({
              status: transformedData.status,
              external_status: transformedData.status,
              updated_at: new Date().toISOString(),
            })
            .eq('platform', platform)
            .eq('external_id', transformedData.external_order_id || transformedData.order_id);

          if (updateError) {
            logStep("Failed to update external order", { error: updateError.message });
          } else {
            logStep("External order updated");
          }
          break;

        case 'order_cancelled':
        case 'order.cancelled':
          // Cancel order
          const { error: cancelError } = await supabase
            .from('external_orders')
            .update({
              status: 'cancelled',
              external_status: transformedData.status,
              updated_at: new Date().toISOString(),
            })
            .eq('platform', platform)
            .eq('external_id', transformedData.external_order_id || transformedData.order_id);

          if (cancelError) {
            logStep("Failed to cancel external order", { error: cancelError.message });
          } else {
            logStep("External order cancelled");
          }
          break;

        default:
          logStep("Unhandled event type", { eventType: transformedData.event_type });
      }

      // Update webhook log as processed
      await supabase
        .from('webhook_logs')
        .update({
          status: 'processed',
          order_id: orderId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookLog.id);

      logStep("Webhook processed successfully", { orderId });

      return new Response(JSON.stringify({ 
        success: true, 
        order_id: orderId,
        message: 'Webhook processed successfully' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (processingError: any) {
      logStep("Error processing webhook", { error: processingError.message });
      
      // Update webhook log as failed
      await supabase
        .from('webhook_logs')
        .update({
          status: 'failed',
          error_message: processingError.message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookLog.id);

      throw processingError;
    }

  } catch (error: any) {
    logStep("Webhook error", { error: error.message });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});