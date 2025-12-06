
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { RateLimiter, RATE_LIMIT_CONFIGS } from "../_shared/rate-limiter.ts";
import { createLogger } from "../_shared/secure-logger.ts";

const logger = createLogger('CREATE-CHECKOUT');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const validateEnvironment = (stripeKey: string) => {
  const isTestMode = stripeKey.startsWith('sk_test');
  const mode = isTestMode ? 'TEST' : 'PRODUCTION';
  logger.info(`RUNNING IN ${mode} MODE`);
  
  // Validar que todos os secrets estejam no mesmo modo
  const priceIds = [
    { id: Deno.env.get("STRIPE_PRICE_ID_ANNUAL"), name: "ANNUAL" },
    { id: Deno.env.get("STRIPE_PRICE_ID_MONTHLY"), name: "MONTHLY" },
    { id: Deno.env.get("STRIPE_PRICE_ID_TRIAL"), name: "TRIAL" }
  ].filter(p => p.id);
  
  for (const price of priceIds) {
    const priceIsTest = price.id?.startsWith('price_test');
    if (priceIsTest === !isTestMode) {
      throw new Error(`Price ID mode mismatch: ${price.name} (${price.id?.substring(0, 15)}...) vs ${mode}`);
    }
  }
  
  return { isTestMode, mode };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    // Validar ambiente e configuração
    const env = validateEnvironment(stripeKey);
    logStep("Stripe key verified", { keyPrefix: stripeKey.substring(0, 7), mode: env.mode });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Rate limiting persistente
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const rateLimiter = new RateLimiter(supabaseServiceClient);
    const rateLimitResult = await rateLimiter.check(
      user.id,
      'create-checkout',
      RATE_LIMIT_CONFIGS['create-checkout']
    );

    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { userId: user.id, remaining: rateLimitResult.remaining });
      return new Response(
        JSON.stringify({ 
          error: 'Limite de tentativas atingido. Tente novamente em alguns minutos.',
          resetAt: rateLimitResult.resetAt
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMIT_CONFIGS['create-checkout'].maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString()
          } 
        }
      );
    }

    logStep("Rate limit check passed", { remaining: rateLimitResult.remaining });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("Creating new customer");
    }

    // Get plan_type from request body or default to annual
    const { plan_type } = await req.json().catch(() => ({}));
    
    // Use price_id from secrets
    const annualPriceId = Deno.env.get("STRIPE_PRICE_ID_ANNUAL");
    const monthlyPriceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY");
    const trialPriceId = Deno.env.get("STRIPE_PRICE_ID_TRIAL");
    
    logStep("Price IDs from environment", { 
      annual: annualPriceId ? `${annualPriceId.substring(0, 10)}...` : 'NOT SET',
      monthly: monthlyPriceId ? `${monthlyPriceId.substring(0, 10)}...` : 'NOT SET',
      trial: trialPriceId ? `${trialPriceId.substring(0, 10)}...` : 'NOT SET',
      requestedPlan: plan_type || 'none (defaulting to annual)'
    });
    
    // Map plan_type to corresponding price_id
    let selectedPriceId;
    let planType = plan_type || 'annual';
    
    if (planType === 'monthly') {
      selectedPriceId = monthlyPriceId;
    } else if (planType === 'trial') {
      selectedPriceId = trialPriceId;
    } else {
      selectedPriceId = annualPriceId;
      planType = 'annual';
    }
    
    if (!selectedPriceId) {
      const errorMsg = `Price ID not configured for plan type: ${planType}. Please set STRIPE_PRICE_ID_${planType.toUpperCase()} in Supabase secrets.`;
      logStep("Price ID missing", { planType, secretName: `STRIPE_PRICE_ID_${planType.toUpperCase()}` });
      throw new Error(errorMsg);
    }
    
    logStep("Creating checkout with price", { selectedPriceId: `${selectedPriceId.substring(0, 10)}...`, planType });

    // Validate that the price exists in Stripe before creating checkout
    try {
      const priceInfo = await stripe.prices.retrieve(selectedPriceId);
      logStep("Price validated successfully", { 
        priceId: `${selectedPriceId.substring(0, 10)}...`,
        active: priceInfo.active,
        currency: priceInfo.currency,
        amount: priceInfo.unit_amount,
        livemode: priceInfo.livemode
      });
      
      // BLOQUEAR mismatch de ambiente em produção
      const isTestKey = stripeKey.startsWith('sk_test');
      if (priceInfo.livemode === isTestKey) {
        logStep("CRITICAL: Price mode mismatch detected", { 
          stripeKeyMode: isTestKey ? 'test' : 'live',
          priceMode: priceInfo.livemode ? 'live' : 'test',
          priceId: selectedPriceId
        });
        throw new Error("Configuração inválida do Stripe. A chave e o Price ID devem estar no mesmo modo (test ou live). Contate o suporte.");
      }
      
      // Check if price is active
      if (!priceInfo.active) {
        logStep("WARNING: Price is not active in Stripe", { priceId: selectedPriceId });
        throw new Error(`O plano selecionado não está ativo. Por favor, contate o suporte.`);
      }
      
    } catch (priceError: any) {
      // More user-friendly error messages
      let errorMsg = 'Erro ao processar o pagamento. ';
      
      if (priceError.code === 'resource_missing') {
        errorMsg += 'O plano selecionado não foi encontrado. Por favor, tente novamente ou contate o suporte.';
        logStep("Price not found in Stripe", { 
          priceId: selectedPriceId,
          planType,
          stripeKeyMode: stripeKey.startsWith('sk_test') ? 'test' : 'live'
        });
      } else {
        errorMsg += priceError.message || 'Por favor, tente novamente.';
        logStep("Price validation error", { 
          priceId: `${selectedPriceId.substring(0, 10)}...`, 
          error: priceError.message,
          code: priceError.code,
          type: priceError.type
        });
      }
      
      throw new Error(errorMsg);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/plans?success=true`,
      cancel_url: `${req.headers.get("origin")}/plans?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        user_id: user.id,
        plan_type: planType,
        user_email: user.email
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: planType
        }
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
