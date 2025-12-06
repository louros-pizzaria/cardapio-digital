import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { createLogger } from "../_shared/secure-logger.ts";

const logger = createLogger('MERCADOPAGO-WEBHOOK');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MERCADOPAGO_IP_RANGES = [
  '209.225.49.0/24',
  '216.33.197.0/24', 
  '216.33.196.0/24',
  '209.225.48.0/24'
];

async function validateWebhookSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) {
    logger.security('Missing signature', { hasSignature: false });
    return false;
  }

  try {
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('ts='))?.substring(3);
    const hash = parts.find(p => p.startsWith('v1='))?.substring(3);

    if (!timestamp || !hash) {
      logger.security('Invalid signature format', { signature });
      return false;
    }

    const signaturePayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signaturePayload);
    
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature_bytes = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedHash = Array.from(new Uint8Array(signature_bytes)).map(b => b.toString(16).padStart(2, '0')).join('');

    const isValid = expectedHash === hash;
    if (!isValid) {
      logger.security('Signature validation failed', { expected: expectedHash.substring(0, 10), received: hash.substring(0, 10) });
    }

    return isValid;
  } catch (error) {
    logger.security('Signature validation error', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

function validateIPOrigin(ip: string | null): boolean {
  if (!ip) return false;
  
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
    logger.info('Development IP detected', { ip });
    return true;
  }

  const isValidIP = MERCADOPAGO_IP_RANGES.some(range => {
    const [network] = range.split('/');
    return ip.startsWith(network.substring(0, network.lastIndexOf('.')));
  });

  if (!isValidIP) {
    logger.security('Invalid IP origin', { ip });
  }

  return isValidIP;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info('REAL WEBHOOK RECEIVED - FASE 1 IMPLEMENTATION');

    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_PROD');
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    
    if (!mercadopagoAccessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    if (!webhookSecret) {
      logger.security('CRITICAL: Webhook secret not configured', { security_level: 'CRITICAL' });
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const payload = await req.text();
    const signature = req.headers.get('x-signature');
    const realIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for');

    // SECURITY VALIDATIONS
    if (webhookSecret) {
      const isValidSignature = await validateWebhookSignature(payload, signature, webhookSecret);
      if (!isValidSignature) {
        logger.security('INVALID SIGNATURE - POTENTIAL ATTACK', { threat_level: 'HIGH' });
        
        // Log failed verification to database
        await supabaseService.from('webhook_signatures').insert({
          webhook_type: 'mercadopago',
          signature: signature || 'missing',
          payload: JSON.parse(payload),
          verified: false
        }).catch(err => logger.error('Failed to log webhook signature', { error: err.message }));
        
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
      logger.success('Signature validation passed');
      
      // Log successful verification
      await supabaseService.from('webhook_signatures').insert({
        webhook_type: 'mercadopago',
        signature: signature,
        payload: JSON.parse(payload),
        verified: true,
        verified_at: new Date().toISOString()
      }).catch(err => logger.error('Failed to log webhook signature', { error: err.message }));
    }

    const clientIp = realIp || 'unknown';
    if (!validateIPOrigin(clientIp)) {
      logger.security('INVALID IP ORIGIN - POTENTIAL ATTACK', { ip: clientIp, threat_level: 'HIGH' });
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    logger.success('IP origin validation passed', { ip: clientIp });

    const webhookData = JSON.parse(payload);
    logger.info('Webhook data received', { type: webhookData.type });
    
    const eventId = webhookData.id?.toString() || `${webhookData.type}-${Date.now()}`;
    const { data: existingEvent } = await supabaseService
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();
      
    if (existingEvent) {
      logger.info("Event already processed, skipping");
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data.id;
      logger.info('Processing payment notification', { paymentId });

      logger.info('Querying REAL MercadoPago API for payment status');
      
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadopagoAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        logger.security('MercadoPago API error', { status: paymentResponse.status, error: errorText });
        throw new Error(`Failed to get payment details: ${paymentResponse.status}`);
      }

      const payment = await paymentResponse.json();
      logger.success('REAL Payment details retrieved', { 
        paymentId: payment.id,
        status: payment.status,
        amount: payment.transaction_amount
      });

      const securityAnalysis = {
        paymentId: payment.id,
        isTestPayment: payment.live_mode === false,
        statusTransition: `webhook -> ${payment.status}`,
        amountCents: payment.transaction_amount * 100
      };

      logger.security('REAL PAYMENT SECURITY ANALYSIS', securityAnalysis);

      if (payment.live_mode === false) {
        logger.security('TEST PAYMENT DETECTED - IGNORING IN PRODUCTION', { paymentId: payment.id });
        return new Response('Test payment ignored', { status: 200, headers: corsHeaders });
      }

      const orderId = payment.external_reference;
      if (!orderId) {
        logger.security('Missing external reference', { paymentId: payment.id, threat_level: 'HIGH' });
        return new Response('No external reference', { status: 400, headers: corsHeaders });
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orderId)) {
        logger.security('Invalid order ID format', { orderId, threat_level: 'CRITICAL' });
        return new Response('Invalid order format', { status: 400, headers: corsHeaders });
      }

      const { data: existingOrder, error: selectError } = await supabaseService
        .from('orders')
        .select('id, status, payment_status, user_id, total_amount, created_at')
        .eq('id', orderId)
        .single();

      if (selectError || !existingOrder) {
        logger.security('Order not found in database', { orderId, threat_level: 'HIGH' });
        return new Response('Order not found', { status: 404, headers: corsHeaders });
      }

      logger.info('Existing order found', { orderId, currentStatus: existingOrder.status });

      const orderAmountCents = Math.round(existingOrder.total_amount * 100);
      const paymentAmountCents = Math.round(payment.transaction_amount * 100);
      
      if (orderAmountCents !== paymentAmountCents) {
        logger.security('AMOUNT MISMATCH DETECTED - POSSIBLE FRAUD', {
          orderId,
          orderAmount: existingOrder.total_amount,
          paymentAmount: payment.transaction_amount,
          threat_level: 'CRITICAL'
        });
        return new Response('Amount mismatch', { status: 400, headers: corsHeaders });
      }

      let orderStatus = 'pending';
      let paymentStatus = 'pending';

      switch (payment.status) {
        case 'approved':
          orderStatus = 'confirmed';
          paymentStatus = 'paid';
          break;
        case 'rejected':
        case 'cancelled':
          orderStatus = 'cancelled';
          paymentStatus = 'rejected';
          break;
        case 'pending':
        case 'in_process':
          orderStatus = 'pending';
          paymentStatus = 'pending';
          break;
        default:
          logger.warn('Unknown payment status', { status: payment.status });
          return new Response('Unknown status', { status: 200, headers: corsHeaders });
      }

      const newOrderStatus = existingOrder.status === 'pending_payment' && payment.status === 'approved' 
        ? 'pending'
        : orderStatus;
      
      logger.info('Status transition', { from: existingOrder.status, to: newOrderStatus });
      
      const { error: updateError } = await supabaseService
        .from('orders')
        .update({
          status: newOrderStatus,
          payment_status: paymentStatus,
          payment_method: payment.payment_method_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        logger.error('Error updating order', { error: updateError });
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      if (payment.payment_method_id === 'pix') {
        logger.info('Updating PIX transaction status');
        
        await supabaseService
          .from('pix_transactions')
          .update({
            status: paymentStatus,
            mercadopago_payment_id: payment.id.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        logger.success('PIX transaction updated');
      }

      logger.success('Order updated successfully', { orderId, orderStatus, paymentStatus });

      if (payment.status === 'approved') {
        logger.security('PAYMENT APPROVED - SECURITY SUMMARY', {
          orderId,
          paymentId: payment.id,
          amount: payment.transaction_amount,
          isLiveMode: payment.live_mode
        });
      }
      
      await supabaseService.from("webhook_events").insert({
        event_id: eventId,
        provider: "mercadopago",
        event_type: webhookData.type,
        order_id: orderId,
        payload: webhookData,
      });
    }

    return new Response('REAL WEBHOOK PROCESSED SUCCESSFULLY', {
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Webhook processing error', { error: errorMessage });
    
    return new Response('Error', { 
      headers: corsHeaders,
      status: 500 
    });
  }
});
