import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECONCILE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Reconciliation function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("Authentication failed", { error: userError.message });
      return new Response(JSON.stringify({ 
        error: "Session expired - please login again",
        success: false,
        requiresLogin: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    if (!userData.user) {
      return new Response(JSON.stringify({ 
        error: "User not found",
        success: false,
        requiresLogin: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { user_id } = await req.json();
    
    // Validate user can only reconcile their own subscription
    if (user_id !== user.id) {
      throw new Error("Cannot reconcile subscription for different user");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get user profile for email
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`Profile not found: ${profileError?.message}`);
    }

    logStep("Starting reconciliation", { userId: user_id, email: profile.email });

    // Get current subscription from database
    const { data: currentSub, error: dbError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = not found
      logStep("Database error", { error: dbError });
      throw dbError;
    }

    // Check Stripe for actual subscription status
    const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
    
    let stripeSubscription = null;
    let reconciliationResult = 'no_change';

    if (customers.data.length > 0) {
      const customer = customers.data[0];
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all", // Get all statuses to check for changes
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        stripeSubscription = subscriptions.data[0];
        logStep("Found Stripe subscription", {
          subscriptionId: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        });
      }
    }

    // Determine plan details
    let planName = 'Nenhum';
    let planPrice = 0;
    let status = 'inactive';
    let expiresAt = null;
    let stripeSubscriptionId = null;
    let stripePriceId = null;

    if (stripeSubscription && (stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing')) {
      stripeSubscriptionId = stripeSubscription.id;
      stripePriceId = stripeSubscription.items.data[0].price.id;
      status = 'active';
      expiresAt = new Date(stripeSubscription.current_period_end * 1000).toISOString();

      // Map plan details
      const priceId = stripePriceId;
      const trialPriceId = Deno.env.get("STRIPE_PRICE_ID_TRIAL");
      const monthlyPriceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY");
      const annualPriceId = Deno.env.get("STRIPE_PRICE_ID_ANNUAL");
      
      if (priceId === trialPriceId) {
        planName = "Trial";
        planPrice = 1.00;
      } else if (priceId === monthlyPriceId) {
        planName = "Mensal";
        planPrice = 9.90;
      } else if (priceId === annualPriceId) {
        planName = "Anual";
        planPrice = 99.90;
      }
    }

    // Compare with current database state
    const hasChanges = !currentSub || 
      currentSub.status !== status ||
      currentSub.stripe_subscription_id !== stripeSubscriptionId ||
      currentSub.expires_at !== expiresAt ||
      currentSub.plan_name !== planName ||
      currentSub.plan_price !== planPrice;

    if (hasChanges) {
      logStep("Discrepancy detected, updating database", {
        current: currentSub ? {
          status: currentSub.status,
          stripe_id: currentSub.stripe_subscription_id,
          expires_at: currentSub.expires_at,
          plan: currentSub.plan_name
        } : null,
        stripe: {
          status,
          stripe_id: stripeSubscriptionId,
          expires_at: expiresAt,
          plan: planName
        }
      });

      // Update or insert subscription
      const { error: upsertError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user_id,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_price_id: stripePriceId,
          status,
          plan_name: planName,
          plan_price: planPrice,
          expires_at: expiresAt,
          sync_status: 'reconciled',
          last_webhook_event: 'reconciliation',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        logStep("Error updating subscription", { error: upsertError });
        throw upsertError;
      }

      reconciliationResult = 'updated';
    }

    logStep("Reconciliation completed", {
      result: reconciliationResult,
      status,
      planName,
      planPrice,
      expiresAt
    });

    return new Response(JSON.stringify({
      success: true,
      result: reconciliationResult,
      subscription: {
        subscribed: status === 'active',
        status,
        plan_name: planName,
        plan_price: planPrice,
        expires_at: expiresAt,
        reconciled_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
    logStep("ERROR in reconcile-subscription", { message });
    return new Response(JSON.stringify({ 
      error: message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});